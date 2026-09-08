import { defineCrud } from '@/lib/crud'
import { notify } from '@/lib/notify'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'pickupLog',
  module: 'security',
  searchFields: ['personName'],
  filterFields: ['status', 'method', 'type', 'studentId'],
  required: ['studentId', 'personName'],
  defaultSort: { field: 'time', dir: 'desc' },
  beforeSave: (data: Record<string, unknown>, session: any) => {
    if (data.relation === '') data.relation = null
    if (data.status === 'VERIFIED' && !data.verifiedById) data.verifiedById = session.sub
    return data
  },
  afterCreate: async (row: any) => {
    try {
      const student = await db.student.findUnique({ where: { id: row.studentId }, select: { firstName: true, lastName: true, parentId: true } })
      if (!student?.parentId) return
      const user = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
      if (!user) return
      await notify({
        userId: user.id,
        title: row.type === 'DROP' ? 'Student drop logged' : 'Student pickup logged',
        message: `${student.firstName} ${student.lastName} — ${row.personName}${row.relation ? ` (${row.relation})` : ''} · ${String(row.method)} · ${String(row.status).toLowerCase()}.`,
        type: row.status === 'PENDING' ? 'WARNING' : 'SUCCESS',
        link: 'security',
        channel: 'SMS',
      })
    } catch (e) {
      console.error('[pickupLog:afterCreate]', e)
    }
  },
})

export const GET = crud.list
export const POST = crud.create
