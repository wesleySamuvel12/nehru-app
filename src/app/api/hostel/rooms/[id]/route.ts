import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'room',
  module: 'hostel',
  include: { hostel: true, _count: { select: { beds: true } } },
  beforeSave: (data: Record<string, unknown>) => {
    for (const f of ['floor', 'capacity']) {
      if (data[f] === null || data[f] === '') delete data[f]
      else if (data[f] !== undefined) data[f] = Number(data[f])
    }
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
