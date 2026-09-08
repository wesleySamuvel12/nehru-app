import { db } from '@/lib/db'
import { notify } from '@/lib/notify'

/**
 * Shared helpers for health API routes (private — not a route file).
 * Resolves the linked parent portal user of a student and notifies them.
 */
export async function notifyParentOfStudent(studentId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO') {
  try {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { parentId: true, firstName: true, lastName: true } })
    if (!student?.parentId) return false
    const parentUser = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
    if (!parentUser) return false
    await notify({ userId: parentUser.id, title, message, type })
    return true
  } catch (e) {
    console.error('[health:notifyParent]', e)
    return false
  }
}
