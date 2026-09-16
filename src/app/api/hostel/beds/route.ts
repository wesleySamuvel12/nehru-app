import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'bed',
  module: 'hostel',
  searchFields: ['bedNo'],
  filterFields: ['roomId', 'status'],
  defaultSort: { field: 'bedNo', dir: 'asc' },
  required: ['roomId', 'bedNo'],
  include: { room: { include: { hostel: true } } },
})

export const GET = crud.list
export const POST = crud.create
