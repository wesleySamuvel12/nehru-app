import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'notificationTemplate',
  module: 'communication',
  beforeSave: (data: any) => {
    if (data.key !== undefined) data.key = String(data.key || '').trim().toLowerCase().replace(/\s+/g, '_')
    return data
  },
})

export const PATCH = crud.update
export const DELETE = crud.remove
