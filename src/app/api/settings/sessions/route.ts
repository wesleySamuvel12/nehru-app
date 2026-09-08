import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'loginLog',
  module: 'settings',
  searchFields: ['email'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
})

export const GET = crud.list
