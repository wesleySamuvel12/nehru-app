import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { defineCrud } from '@/lib/crud'
import { notify } from '@/lib/notify'
import type { Session } from '@/lib/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Row-level security: parents see their children's stays, students their own. */
async function ownScope(session: Session): Promise<any> {
  if (session.role === 'STUDENT') {
    return session.studentId ? { studentId: session.studentId } : { id: '__none__' }
  }
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { studentId: { in: kids.map(k => k.id) } }
  }
  return null
}

/** Find the portal user linked to a student's parent (for notifications). */
async function notifyParent(studentId: string, title: string, message: string, type: 'SUCCESS' | 'INFO' | 'WARNING' = 'SUCCESS') {
  try {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { firstName: true, lastName: true, parentId: true } })
    if (!student?.parentId) return
    const user = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
    if (!user) return
    await notify({
      userId: user.id,
      title,
      message,
      type,
      link: 'hostel',
      channel: 'SMS',
    })
  } catch (e) {
    console.error('[hostel:notifyParent]', e)
  }
}

const crud = defineCrud({
  model: 'hostelAllocation',
  module: 'hostel',
  filterFields: ['status', 'studentId', 'bedId'],
  include: { bed: { include: { room: { include: { hostel: true } } } } },
  required: ['bedId', 'studentId'],
  defaultSort: { field: 'checkInDate', dir: 'desc' },
  scope: ownScope,
  beforeSave: (data: Record<string, unknown>) => {
    if (data.checkInDate === '') delete data.checkInDate
    if (data.checkOutDate === '') data.checkOutDate = null
    if (data.monthlyFee === null || data.monthlyFee === undefined || data.monthlyFee === '') delete data.monthlyFee
    else if (data.monthlyFee !== undefined) data.monthlyFee = Number(data.monthlyFee)
    if (data.notes === '') data.notes = null
    return data
  },
  afterCreate: async (row: any) => {
    try {
      await db.bed.update({ where: { id: row.bedId }, data: { status: 'OCCUPIED' } })
      const bed = await db.bed.findUnique({ where: { id: row.bedId }, include: { room: { include: { hostel: true } } } })
      await notifyParent(
        row.studentId,
        'Hostel bed allocated',
        `${bed?.room?.hostel?.name || 'Hostel'} — room ${bed?.room?.roomNo || '?'}, bed ${bed?.bedNo || '?'} has been allotted. Check-in recorded.`,
        'SUCCESS',
      )
    } catch (e) {
      console.error('[hostelAllocation:afterCreate]', e)
    }
  },
  afterUpdate: async (row: any, _session: Session, before: any) => {
    try {
      if (row.status === 'CHECKED_OUT' && before.status !== 'CHECKED_OUT') {
        await db.bed.update({ where: { id: row.bedId }, data: { status: 'FREE' } })
        const bed = await db.bed.findUnique({ where: { id: row.bedId }, include: { room: { include: { hostel: true } } } })
        await notifyParent(
          row.studentId,
          'Hostel check-out completed',
          `Check-out recorded from ${bed?.room?.hostel?.name || 'hostel'} — room ${bed?.room?.roomNo || '?'}, bed ${bed?.bedNo || '?'}. The bed is now available.`,
          'INFO',
        )
      }
      if (row.status === 'ACTIVE' && before.status === 'CHECKED_OUT') {
        await db.bed.update({ where: { id: row.bedId }, data: { status: 'OCCUPIED' } })
      }
    } catch (e) {
      console.error('[hostelAllocation:afterUpdate]', e)
    }
  },
})

export const GET = crud.list
export const POST = crud.create
