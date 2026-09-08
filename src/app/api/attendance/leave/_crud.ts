import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'
import type { Session } from '@/lib/auth'


function fmtRange(from: Date | string, to: Date | string): string {
  const f = new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const t = new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

export const leaveCrud = defineCrud({
  model: 'leaveRequest',
  module: 'attendance',
  searchFields: ['requesterName', 'reason', 'remarks'],
  filterFields: ['status', 'type', 'requesterType'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['requesterType', 'requesterId', 'requesterName', 'type', 'fromDate', 'toDate', 'reason'],
  afterUpdate: async (row: any, session: Session, before: any) => {
    // Notify the requester (and the student's parent) when a decision is made
    if (row.status === before.status || !['APPROVED', 'REJECTED'].includes(row.status)) return
    const approver = row.approverName || session.name
    const title = `Leave request ${row.status.toLowerCase()}`
    const message = `${row.requesterName}'s ${row.type.toLowerCase()} leave (${fmtRange(row.fromDate, row.toDate)}) was ${row.status.toLowerCase()} by ${approver}.`
    try {
      if (row.requesterType === 'EMPLOYEE') {
        const user = await db.user.findFirst({ where: { linkedEmployeeId: row.requesterId }, select: { id: true } })
        if (user) await notify({ userId: user.id, title, message, type: row.status === 'APPROVED' ? 'SUCCESS' : 'WARNING', link: 'attendance' })
      } else {
        const student = await db.student.findUnique({ where: { id: row.requesterId }, select: { parentId: true } })
        const or: any[] = [{ linkedStudentId: row.requesterId }]
        if (student?.parentId) or.push({ linkedParentId: student.parentId })
        const users = await db.user.findMany({ where: { OR: or }, select: { id: true } })
        for (const u of users) {
          await notify({ userId: u.id, title, message, type: row.status === 'APPROVED' ? 'SUCCESS' : 'INFO', link: 'attendance' })
        }
      }
    } catch (e) {
      console.error('[leave:notify]', e)
    }
  },
})
