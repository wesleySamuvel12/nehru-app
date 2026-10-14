import { NextRequest } from 'next/server'
import { json, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { resolveTenantContext } from '@/lib/tenant'

/** GET /api/communication/users — directory for the message composer (excludes self), scoped to campus. */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'communication')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const sp = req.nextUrl.searchParams
    const role = sp.get('role')
    const q = sp.get('q')
    const where: any = { ...schoolWhere, status: 'ACTIVE', id: { not: session.sub } }
    if (role && role !== 'ALL') where.role = role
    if (q) where.name = { contains: q }
    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
      take: 300,
    })
    return json({ data: users, meta: { page: 1, pageSize: users.length, total: users.length, totalPages: 1 } })
  } catch (e) {
    console.error('[communication:users]', e)
    return err(500, 'Unable to load the user directory right now.')
  }
}
