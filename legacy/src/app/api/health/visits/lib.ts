import { db } from '@/lib/db'
import { notify } from '@/lib/notify'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Notify the linked parent user (falls back to the student's own user) about a student event. */
export async function notifyParentOfStudent(studentId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = 'INFO') {
  try {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { parentId: true, firstName: true } })
    if (!student) return
    if (student.parentId) {
      const parentUser = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
      if (parentUser) {
        await notify({ userId: parentUser.id, title, message, type })
        return
      }
    }
    const studentUser = await db.user.findFirst({ where: { linkedStudentId: studentId }, select: { id: true } })
    if (studentUser) await notify({ userId: studentUser.id, title, message, type })
  } catch (e) {
    console.error('[notifyParentOfStudent]', e)
  }
}
