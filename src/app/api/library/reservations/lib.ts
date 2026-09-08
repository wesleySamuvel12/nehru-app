import { db } from '@/lib/db'
import { notify } from '@/lib/notify'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function fmtDue(d: any): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Notify the borrower (student → their parent user first, else student user; employee → linked user). */
export async function notifyMember(userType: string, userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') {
  try {
    if (userType === 'STUDENT') {
      const student = await db.student.findUnique({ where: { id: userId }, select: { parentId: true } })
      if (student?.parentId) {
        const parentUser = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
        if (parentUser) {
          await notify({ userId: parentUser.id, title, message, type })
          return
        }
      }
      const studentUser = await db.user.findFirst({ where: { linkedStudentId: userId }, select: { id: true } })
      if (studentUser) await notify({ userId: studentUser.id, title, message, type })
    } else {
      const empUser = await db.user.findFirst({ where: { linkedEmployeeId: userId }, select: { id: true } })
      if (empUser) await notify({ userId: empUser.id, title, message, type })
    }
  } catch (e) {
    console.error('[notifyMember]', e)
  }
}
