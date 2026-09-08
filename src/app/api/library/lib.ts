import { db } from '@/lib/db'
import { notify } from '@/lib/notify'

/**
 * Shared helpers for library API routes (private — not a route file).
 * Resolves in-app notification targets from a student/employee record id:
 * student/employee portal user + the linked parent for students.
 */
export async function notifyMember(userType: string, refId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') {
  try {
    if (userType === 'EMPLOYEE') {
      const user = await db.user.findFirst({ where: { linkedEmployeeId: refId }, select: { id: true } })
      if (user) await notify({ userId: user.id, title, message, type })
      return
    }
    const student = await db.student.findUnique({ where: { id: refId }, select: { parentId: true } })
    if (!student) return
    const studentUser = await db.user.findFirst({ where: { linkedStudentId: refId }, select: { id: true } })
    if (studentUser) await notify({ userId: studentUser.id, title, message, type })
    if (student.parentId) {
      const parentUser = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
      if (parentUser) await notify({ userId: parentUser.id, title, message, type })
    }
  } catch (e) {
    console.error('[library:notifyMember]', e)
  }
}

export function fmtDue(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
