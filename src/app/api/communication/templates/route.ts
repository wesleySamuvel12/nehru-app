import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'notificationTemplate',
  module: 'communication',
  searchFields: ['key', 'name', 'subject'],
  filterFields: ['channel'],
  defaultSort: { field: 'key', dir: 'asc' },
  required: ['key', 'name', 'channel', 'subject', 'body'],
  beforeSave: (data: any) => {
    data.key = String(data.key || '').trim().toLowerCase().replace(/\s+/g, '_')
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
