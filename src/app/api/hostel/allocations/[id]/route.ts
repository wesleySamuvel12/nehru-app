import { db } from '@/lib/db'
import { defineCrud } from '@/lib/crud'
import { notify } from '@/lib/notify'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'hostelAllocation',
  module: 'hostel',
  include: { bed: { include: { room: { include: { hostel: true } } } } },
  beforeSave: (data: Record<string, unknown>) => {
    if (data.checkInDate === '') delete data.checkInDate
    if (data.checkOutDate === '') data.checkOutDate = null
    if (data.monthlyFee === null || data.monthlyFee === '') delete data.monthlyFee
    else if (data.monthlyFee !== undefined) data.monthlyFee = Number(data.monthlyFee)
    if (data.notes === '') data.notes = null
    return data
  },
  afterUpdate: async (row: any, _session: any, before: any) => {
    try {
      if (row.status === 'CHECKED_OUT' && before.status !== 'CHECKED_OUT') {
        await db.bed.update({ where: { id: row.bedId }, data: { status: 'FREE' } })
        const student = await db.student.findUnique({ where: { id: row.studentId }, select: { firstName: true, lastName: true, parentId: true } })
        if (student?.parentId) {
          const user = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
          if (user) {
            await notify({ userId: user.id, title: 'Hostel check-out completed', message: `${student.firstName} ${student.lastName} has been checked out of the hostel.`, type: 'INFO', link: 'hostel' })
          }
        }
      }
      if (row.status === 'ACTIVE' && before.status === 'CHECKED_OUT') {
        await db.bed.update({ where: { id: row.bedId }, data: { status: 'OCCUPIED' } })
      }
    } catch (e) {
      console.error('[hostelAllocation:afterUpdate]', e)
    }
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
