import { NextRequest } from 'next/server'
import { json, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { resolveTenantContext } from '@/lib/tenant'

/**
 * GET /api/certificates/students — lightweight ACTIVE-student lookup for the
 * certificate request form (id/name/admissionNo/class). Scoped strictly to caller's campus.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'certificates')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const students = await db.student.findMany({
      where: { ...schoolWhere, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, admissionNo: true, klass: { select: { name: true } } },
      orderBy: { admissionNo: 'asc' },
      take: 600,
    })
    const data = students.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      className: s.klass?.name || null,
    }))
    return json({ data, meta: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } })
  } catch (e) {
    console.error('[certificates:students]', e)
    return err(500, 'Unable to load the student list right now.')
  }
}
