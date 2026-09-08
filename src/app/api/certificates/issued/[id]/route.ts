import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'certificate',
  module: 'certificates',
})

export const DELETE = crud.remove
