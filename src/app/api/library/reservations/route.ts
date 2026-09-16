import { defineCrud } from '@/lib/crud'
import { notifyMember } from './lib'

/**
 * Library reservations — members reserve a fully checked-out title.
 * afterUpdate notifies the member when the reservation is marked READY.
 */
const crud = defineCrud({
  model: 'bookReservation',
  module: 'library',
  searchFields: ['userName'],
  filterFields: ['status', 'bookId', 'userId', 'userType'],
  defaultSort: { field: 'reservedAt', dir: 'desc' },
  required: ['bookId', 'userId'],
  afterUpdate: async (row: any, _session, before: any) => {
    if (before?.status !== 'READY' && row?.status === 'READY') {
      await notifyMember(
        row.userType || 'STUDENT',
        row.userId,
        'Reservation ready',
        `Good news ${row.userName || ''} — your reserved book is ready for pickup at the library desk.`,
        'SUCCESS',
      )
    }
  },
})

export const GET = crud.list
export const POST = crud.create
