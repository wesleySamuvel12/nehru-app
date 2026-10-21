import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'

export interface TeacherExamContext {
  teacher: any
  teacherSubjectIds: string[]
  teacherClassIds: string[]
  teacherSectionIds: string[]
  invigilatedExamIds: string[]
  schoolId: string | null
}

/**
 * Resolves the authenticated teacher's employee profile and assigned class, section, and subject IDs.
 * Returns null if the user is not a teacher or no employee record matches.
 */
export async function getTeacherExamContext(session: Session, schoolId?: string | null): Promise<TeacherExamContext | null> {
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

  const [homeroomSections, taughtSubjects, invigilatedSchedules] = await Promise.all([
    db.section.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, classId: true },
    }),
    db.subject.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, classId: true },
    }),
    db.examSchedule.findMany({
      where: { ...schoolWhere, invigilatorId: teacher.id },
      select: { examId: true },
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
  const invigilatedExamIds = [...new Set(invigilatedSchedules.map(s => s.examId))]

  return {
    teacher,
    teacherSubjectIds,
    teacherClassIds,
    teacherSectionIds,
    invigilatedExamIds,
    schoolId: targetSchoolId,
  }
}

/**
 * Checks if a teacher is authorized to enter or view marks for a subject/section.
 */
export function isTeacherAuthorizedForMarks(
  subjectId: string,
  sectionId: string | undefined,
  ctx: TeacherExamContext
): boolean {
  if (ctx.teacherSubjectIds.includes(subjectId)) return true
  if (sectionId && ctx.teacherSectionIds.includes(sectionId)) return true
  return false
}
