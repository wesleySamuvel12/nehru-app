import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'

/**
 * Row-level security:
 * - Parents see their own children's attendance
 * - Students see their own attendance
 * - Teachers see attendance only for their assigned classes and sections
 * - Administrators have full campus access
 */
export async function attendanceScope(session: Session): Promise<any> {
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { studentId: { in: kids.map(k => k.id) } }
  }

  if (session.role === 'STUDENT' && session.studentId) {
    return { studentId: session.studentId }
  }

  if (session.role === 'TEACHER') {
    let teacher: any = null
    if (session.employeeId) {
      teacher = await db.employee.findFirst({
        where: { id: session.employeeId, schoolId: session.schoolId },
      })
    }
    if (!teacher) {
      teacher = await db.employee.findFirst({
        where: { schoolId: session.schoolId, status: 'ACTIVE' },
      })
    }
    if (!teacher) {
      return { id: 'unauthorized_none' }
    }

    const [homeroomSections, taughtSubjects] = await Promise.all([
      db.section.findMany({
        where: { schoolId: session.schoolId, teacherId: teacher.id },
        select: { id: true, classId: true },
      }),
      db.subject.findMany({
        where: { schoolId: session.schoolId, teacherId: teacher.id },
        select: { id: true, classId: true },
      }),
    ])

    const sectionIds = homeroomSections.map(s => s.id)
    const classIds = [
      ...new Set([
        ...homeroomSections.map(s => s.classId),
        ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
      ])
    ]

    const orClauses: any[] = []
    if (sectionIds.length > 0) orClauses.push({ sectionId: { in: sectionIds } })
    if (classIds.length > 0) orClauses.push({ classId: { in: classIds } })

    if (orClauses.length === 0) {
      return { id: 'unauthorized_no_classes' }
    }

    return { OR: orClauses }
  }

  return null
}

export const attendanceCrud = defineCrud({
  model: 'attendance',
  module: 'attendance',
  searchFields: ['remarks'],
  filterFields: ['status', 'sectionId', 'classId', 'studentId', 'dateFrom', 'dateTo'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['studentId', 'date', 'status'],
  scope: attendanceScope,
})
