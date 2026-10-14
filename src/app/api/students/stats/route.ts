import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/** Live counters for the Students module header. GET /api/students/stats */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'students')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const term = await db.term.findFirst({ where: { ...schoolWhere, isCurrent: true } })
    const termStart = term
      ? term.startDate
      : (() => { const d = new Date(); d.setDate(d.getDate() - 90); d.setHours(0, 0, 0, 0); return d })()

    const [active, newThisTerm, transportUsers, boarders, total] = await Promise.all([
      db.student.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      db.student.count({ where: { ...schoolWhere, status: 'ACTIVE', admissionDate: { gte: termStart } } }),
      db.transportAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      db.hostelAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      db.student.count({ where: schoolWhere }),
    ])

    return json({
      data: {
        active,
        newThisTerm,
        transportUsers,
        boarders,
        total,
        termName: term?.name || 'Last 90 days',
      },
    })
  } catch (e) {
    console.error('[students:stats]', e)
    return err(500, 'Unable to load student statistics right now.')
  }
}
