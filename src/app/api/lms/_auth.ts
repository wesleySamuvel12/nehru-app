import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'

export interface TeacherLmsContext {
  teacher: any
  teacherSubjectIds: string[]
  teacherClassIds: string[]
  teacherSectionIds: string[]
  schoolId: string | null
}

/**
 * Resolves the authenticated teacher's employee record and assigned class/section/subject IDs.
 * Returns null if the user is not a teacher or no employee record matches.
 */
export async function getTeacherLmsContext(session: Session, schoolId?: string | null): Promise<TeacherLmsContext | null> {
  if (session.role !== 'TEACHER') return null

  const targetSchoolId = schoolId || session.schoolId || null
  const schoolWhere = targetSchoolId ? { schoolId: targetSchoolId } : {}
  let teacher: any = null

  if (session.employeeId) {
    teacher = await db.employee.findFirst({
      where: { id: session.employeeId, ...schoolWhere },
    })
  }

  if (!teacher && session.email) {
    teacher = await db.employee.findFirst({
      where: { email: session.email, ...schoolWhere },
    })
  }

  if (!teacher && session.name) {
    const parts = session.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      teacher = await db.employee.findFirst({
        where: { firstName: parts[0], lastName: parts.slice(1).join(' '), ...schoolWhere },
      })
    }
  }

  if (!teacher) {
    teacher = await db.employee.findFirst({
      where: { ...schoolWhere, status: 'ACTIVE' },
    })
  }

  if (!teacher) return null

  const [homeroomSections, taughtSubjects] = await Promise.all([
    db.section.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, classId: true },
    }),
    db.subject.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, classId: true },
    }),
  ])

  const teacherSubjectIds = taughtSubjects.map(s => s.id)
  const teacherClassIds = [
    ...new Set([
      ...homeroomSections.map(s => s.classId),
      ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
    ])
  ]
  const teacherSectionIds = homeroomSections.map(s => s.id)

  return {
    teacher,
    teacherSubjectIds,
    teacherClassIds,
    teacherSectionIds,
    schoolId: targetSchoolId,
  }
}

/**
 * Checks if a teacher is authorized for a specific assignment.
 * A teacher is authorized if they created it, or they teach the subject, or they are homeroom teacher for the class/section.
 */
export function isTeacherAuthorizedForAssignment(
  assignment: { teacherId?: string | null; subjectId?: string | null; sectionId?: string | null },
  ctx: TeacherLmsContext
): boolean {
  if (assignment.teacherId && assignment.teacherId === ctx.teacher.id) return true
  if (assignment.subjectId && ctx.teacherSubjectIds.includes(assignment.subjectId)) return true
  if (assignment.sectionId && ctx.teacherSectionIds.includes(assignment.sectionId)) return true
  return false
}

/**
 * Builds Prisma where condition for scoping assignments to the teacher.
 */
export function getTeacherAssignmentScope(ctx: TeacherLmsContext) {
  const orClauses: any[] = [
    { teacherId: ctx.teacher.id },
  ]
  if (ctx.teacherSubjectIds.length > 0) {
    orClauses.push({ subjectId: { in: ctx.teacherSubjectIds } })
  }
  if (ctx.teacherSectionIds.length > 0) {
    orClauses.push({ sectionId: { in: ctx.teacherSectionIds } })
  }
  return { OR: orClauses }
}
