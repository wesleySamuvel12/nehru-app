import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'eventRegistration',
  module: 'events',
})

export const PATCH = crud.update
export const DELETE = crud.remove
