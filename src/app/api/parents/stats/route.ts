import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'

/** Live counters for the Parents module header. GET /api/parents/stats */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'parents')) return err(403, 'You do not have permission to access this module.')

  try {
    const [total, fathers, mothers, guardians, withEmail] = await Promise.all([
      db.parent.count(),
      db.parent.count({ where: { relation: 'FATHER' } }),
      db.parent.count({ where: { relation: 'MOTHER' } }),
      db.parent.count({ where: { relation: 'GUARDIAN' } }),
      db.parent.count({ where: { email: { not: null } } }),
    ])
    return json({ data: { total, fathers, mothers, guardians, withEmail } })
  } catch (e) {
    console.error('[parents:stats]', e)
    return err(500, 'Unable to load parent statistics right now.')
  }
}
