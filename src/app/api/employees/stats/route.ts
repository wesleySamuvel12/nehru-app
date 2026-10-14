import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/** Live counters for the Teachers & Staff module header. GET /api/employees/stats */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'teachers')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const in90Days = new Date(); in90Days.setDate(in90Days.getDate() + 90)
    const [total, teachers, departments, onLeave, expiringDocs] = await Promise.all([
      db.employee.count({ where: schoolWhere }),
      db.employee.count({ where: { ...schoolWhere, isTeacher: true } }),
      db.department.count({ where: schoolWhere }),
      db.employee.count({ where: { ...schoolWhere, status: 'ON_LEAVE' } }),
      db.employee.count({
        where: {
          ...schoolWhere,
          OR: [
            { visaExpiry: { lte: in90Days } },
            { licenseExpiry: { lte: in90Days } },
            { certExpiry: { lte: in90Days } },
          ],
        },
      }),
    ])
    return json({ data: { total, teachers, departments, onLeave, expiringDocs } })
  } catch (e) {
    console.error('[employees:stats]', e)
    return err(500, 'Unable to load staff statistics right now.')
  }
}
