import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'


/** Row-level security: parents/students only see their own report cards. */
export function reportCardScope(session: Session): Promise<any> | any {
  if (session.role === 'PARENT' && session.parentId) {
    return db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
      .then((kids: { id: string }[]) => ({ studentId: { in: kids.map(k => k.id) } }))
  }
  if (session.role === 'STUDENT' && session.studentId) {
    return { studentId: session.studentId }
  }
  return null
}

export const reportCardCrud = defineCrud({
  model: 'reportCard',
  module: 'examinations',
  filterFields: ['examId', 'studentId'],
  defaultSort: { field: 'percentage', dir: 'desc' },
  required: ['studentId', 'examId', 'totalMarks', 'obtained', 'percentage', 'grade'],
  scope: reportCardScope,
})
