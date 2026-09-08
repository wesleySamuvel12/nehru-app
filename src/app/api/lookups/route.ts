import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'


/**
 * Shared lookup endpoint — one call for every dropdown across modules.
 * Available to ALL authenticated users (module-agnostic).
 * Shape: { classes:[{id,name,sections:[{id,name}]}], subjects, houses, departments, routes, stops, hostels, data:<same> }
 * (`data` mirror keeps `list('api/lookups')` and `api('/api/lookups')` clients equally happy.)
 */
let cache: { at: number; payload: any } | null = null
const TTL_MS = 30_000

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (cache && Date.now() - cache.at < TTL_MS) return json(cache.payload)

  try {
    const [classes, subjects, houses, departments, routes, stops, hostels] = await Promise.all([
      db.class.findMany({
        orderBy: { level: 'asc' },
        include: { sections: { orderBy: { name: 'asc' } } },
      }),
      db.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
      db.house.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, color: true } }),
      db.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, headName: true } }),
      db.route.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, status: true } }),
      db.stop.findMany({ orderBy: { sequence: 'asc' }, select: { id: true, name: true, routeId: true, sequence: true } }),
      db.hostel.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, type: true } }),
    ])

    const payload = {
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        sections: c.sections.map((s) => ({ id: s.id, name: s.name })),
      })),
      subjects,
      houses,
      departments,
      routes,
      stops,
      hostels,
    }
    const body = { ...payload, data: payload }
    cache = { at: Date.now(), payload: body }
    return json(body)
  } catch (e) {
    console.error('[lookups]', e)
    return err(500, 'Unable to load dropdown data right now. Please try again.')
  }
}
