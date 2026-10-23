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

    let studentWhere: any = schoolWhere
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
        return json({
          data: { active: 0, newThisTerm: 0, transportUsers: 0, boarders: 0, total: 0, termName: term?.name || 'Last 90 days' },
        })
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
        return json({
          data: { active: 0, newThisTerm: 0, transportUsers: 0, boarders: 0, total: 0, termName: term?.name || 'Last 90 days' },
        })
      }

      studentWhere = {
        ...schoolWhere,
        OR: [
          ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
          ...(classIds.length ? [{ classId: { in: classIds } }] : []),
        ],
      }
    }

    const [active, newThisTerm, total, authorizedStudentIds] = await Promise.all([
      db.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
      db.student.count({ where: { ...studentWhere, status: 'ACTIVE', admissionDate: { gte: termStart } } }),
      db.student.count({ where: studentWhere }),
      db.student.findMany({ where: studentWhere, select: { id: true } }),
    ])

    const studentIdList = authorizedStudentIds.map(s => s.id)

    const [transportUsers, boarders] = await Promise.all([
      db.transportAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE', studentId: { in: studentIdList } } }),
      db.hostelAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE', studentId: { in: studentIdList } } }),
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
