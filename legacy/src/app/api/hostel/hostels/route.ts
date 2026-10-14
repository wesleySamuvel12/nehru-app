import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'hostel',
  module: 'hostel',
  searchFields: ['name', 'wardenName'],
  filterFields: ['type', 'status'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name'],
  include: { _count: { select: { rooms: true } } },
})

export const GET = crud.list
export const POST = crud.create
