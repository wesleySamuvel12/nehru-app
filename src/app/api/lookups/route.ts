import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/**
 * Shared lookup endpoint — one call for every dropdown across modules.
 * Scoped per-school to ensure cross-campus isolation.
 * Shape: { classes:[{id,name,sections:[{id,name}]}], subjects, houses, departments, routes, stops, hostels, data:<same> }
 */
const cacheBySchool = new Map<string, { at: number; payload: any }>()
const TTL_MS = 30_000

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const cacheKey = tenant.schoolId || '__ALL__'
  const cached = cacheBySchool.get(cacheKey)
  if (cached && Date.now() - cached.at < TTL_MS) return json(cached.payload)

  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const [classes, subjects, houses, departments, routes, stops, hostels] = await Promise.all([
      db.class.findMany({
        where: schoolWhere,
        orderBy: { level: 'asc' },
        include: { sections: { where: schoolWhere, orderBy: { name: 'asc' } } },
      }),
      db.subject.findMany({ where: schoolWhere, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
      db.house.findMany({ where: schoolWhere, orderBy: { name: 'asc' }, select: { id: true, name: true, color: true } }),
      db.department.findMany({ where: schoolWhere, orderBy: { name: 'asc' }, select: { id: true, name: true, headName: true } }),
      db.route.findMany({ where: schoolWhere, orderBy: { name: 'asc' }, select: { id: true, name: true, status: true } }),
      db.stop.findMany({ where: schoolWhere, orderBy: { sequence: 'asc' }, select: { id: true, name: true, routeId: true, sequence: true } }),
      db.hostel.findMany({ where: schoolWhere, orderBy: { name: 'asc' }, select: { id: true, name: true, type: true } }),
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
    cacheBySchool.set(cacheKey, { at: Date.now(), payload: body })
    return json(body)
  } catch (e) {
    console.error('[lookups]', e)
    return err(500, 'Unable to load dropdown data right now. Please try again.')
  }
}
