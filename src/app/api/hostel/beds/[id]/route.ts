import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'bed',
  module: 'hostel',
  include: { room: { include: { hostel: true } } },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
