import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/** Live counters for the Parents module header. GET /api/parents/stats */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'parents')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    let parentWhere: any = schoolWhere
    if (session.role === 'TEACHER') {
      let teacher: any = null
      if (session.employeeId) {
        teacher = await db.employee.findFirst({
          where: { id: session.employeeId, ...schoolWhere },
        })
      }
      if (!teacher && session.sub) {
        const user = await db.user.findUnique({
          where: { id: session.sub },
          select: { linkedEmployeeId: true },
        })
        if (user?.linkedEmployeeId) {
          teacher = await db.employee.findFirst({
            where: { id: user.linkedEmployeeId, ...schoolWhere },
          })
        }
      }
      if (!teacher && session.email) {
        teacher = await db.employee.findFirst({
          where: { email: session.email, ...schoolWhere },
        })
      }

      if (!teacher) {
        return json({ data: { total: 0, fathers: 0, mothers: 0, guardians: 0, withEmail: 0 } })
      }

      const [homeroomSections, taughtSubjects] = await Promise.all([
        db.section.findMany({
          where: { teacherId: teacher.id, ...schoolWhere },
          select: { id: true, classId: true },
        }),
        db.subject.findMany({
          where: { teacherId: teacher.id, ...schoolWhere },
          select: { classId: true },
        }),
      ])

      const classIds = [
        ...new Set([
          ...homeroomSections.map(s => s.classId),
          ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
        ]),
      ]
      const sectionIds = homeroomSections.map(s => s.id)

      if (!classIds.length && !sectionIds.length) {
        return json({ data: { total: 0, fathers: 0, mothers: 0, guardians: 0, withEmail: 0 } })
      }

      parentWhere = {
        ...schoolWhere,
        students: {
          some: {
            OR: [
              ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
              ...(classIds.length ? [{ classId: { in: classIds } }] : []),
            ],
          },
        },
      }
    }

    const [total, fathers, mothers, guardians, withEmail] = await Promise.all([
      db.parent.count({ where: parentWhere }),
      db.parent.count({ where: { ...parentWhere, relation: 'FATHER' } }),
      db.parent.count({ where: { ...parentWhere, relation: 'MOTHER' } }),
      db.parent.count({ where: { ...parentWhere, relation: 'GUARDIAN' } }),
      db.parent.count({ where: { ...parentWhere, email: { not: null } } }),
    ])
    return json({ data: { total, fathers, mothers, guardians, withEmail } })
  } catch (e) {
    console.error('[parents:stats]', e)
    return err(500, 'Unable to load parent statistics right now.')
  }
}
