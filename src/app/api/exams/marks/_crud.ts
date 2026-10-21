import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'
import { getTeacherExamContext } from '../_auth'

/** Grade bands (matches seeded GradeConfig rows). */
export function gradeForPercent(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 35) return 'D'
  return 'F'
}

/** Row-level security: parents, students, and teachers see authorized marks only. */
export async function marksScope(session: Session): Promise<any> {
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { studentId: { in: kids.map(k => k.id) } }
  }
  if (session.role === 'STUDENT' && session.studentId) {
    return { studentId: session.studentId }
  }
  if (session.role === 'TEACHER') {
    const teacherCtx = await getTeacherExamContext(session, session.schoolId)
    if (!teacherCtx || teacherCtx.teacherSubjectIds.length === 0) {
      return { id: 'unauthorized_none' }
    }
    return { subjectId: { in: teacherCtx.teacherSubjectIds } }
  }
  return null
}

export const markCrud = defineCrud({
  model: 'mark',
  module: 'examinations',
  filterFields: ['examId', 'subjectId', 'studentId'],
  defaultSort: { field: 'id', dir: 'asc' },
  required: ['examId', 'studentId', 'subjectId', 'marksObtained', 'maxMarks'],
  scope: marksScope,
  beforeSave: (data: any, session: Session) => {
    const max = Number(data.maxMarks) || 100
    const isAbsent = !!data.isAbsent
    if (data.marksObtained !== undefined && data.marksObtained !== null && !isAbsent) {
      const got = Number(data.marksObtained)
      if (isNaN(got) || got < 0 || got > max) {
        throw new Error(`Marks must be between 0 and ${max}.`)
      }
    }
    const obtained = isAbsent ? 0 : Number(data.marksObtained) || 0
    const pct = max > 0 ? (obtained / max) * 100 : 0
    if (!data.grade) data.grade = isAbsent ? 'F' : gradeForPercent(pct)
    if (!data.enteredById && session?.sub) data.enteredById = session.sub
    if (!data.enteredBy && session?.name) data.enteredBy = session.name
    return data
  },
})
