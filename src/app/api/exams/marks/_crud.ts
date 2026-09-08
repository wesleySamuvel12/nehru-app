import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'


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

/** Row-level security: parents/students only see their own marks. */
export function marksScope(session: Session): Promise<any> | any {
  if (session.role === 'PARENT' && session.parentId) {
    return db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
      .then((kids: { id: string }[]) => ({ studentId: { in: kids.map(k => k.id) } }))
  }
  if (session.role === 'STUDENT' && session.studentId) {
    return { studentId: session.studentId }
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
  beforeSave: (data: any) => {
    const max = Number(data.maxMarks) || 0
    const obtained = data.isAbsent ? 0 : Number(data.marksObtained) || 0
    const pct = max > 0 ? (obtained / max) * 100 : 0
    if (!data.grade) data.grade = gradeForPercent(pct)
    return data
  },
})
