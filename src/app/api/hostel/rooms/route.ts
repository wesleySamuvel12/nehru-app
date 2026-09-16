import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'room',
  module: 'hostel',
  searchFields: ['roomNo'],
  filterFields: ['hostelId', 'status', 'type'],
  defaultSort: { field: 'roomNo', dir: 'asc' },
  required: ['hostelId', 'roomNo'],
  include: { hostel: true, _count: { select: { beds: true } } },
  beforeSave: (data: Record<string, unknown>) => {
    for (const f of ['floor', 'capacity']) {
      if (data[f] === null || data[f] === undefined || data[f] === '') delete data[f]
      else if (data[f] !== undefined) data[f] = Number(data[f])
    }
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
