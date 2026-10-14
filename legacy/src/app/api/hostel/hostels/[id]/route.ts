import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'hostel',
  module: 'hostel',
  include: { _count: { select: { rooms: true } } },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
