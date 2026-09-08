import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import type { Session } from '@/lib/auth'


/** Row-level security: parents see their children's attendance, students see their own. */
export function attendanceScope(session: Session): Promise<any> | any {
  if (session.role === 'PARENT' && session.parentId) {
    return db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
      .then((kids: { id: string }[]) => ({ studentId: { in: kids.map(k => k.id) } }))
  }
  if (session.role === 'STUDENT' && session.studentId) {
    return { studentId: session.studentId }
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
