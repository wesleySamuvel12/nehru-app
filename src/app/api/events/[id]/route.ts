import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'event',
  module: 'events',
  beforeSave: (data: any) => {
    if (data.endDate === '') data.endDate = null
    if (data.location === '') data.location = null
    if (data.description === '') data.description = null
    if (data.organizerName === '') data.organizerName = null
    if (data.capacity === '') data.capacity = null
    if (data.registrationRequired === false) data.capacity = null
    return data
  },
})

export const PATCH = crud.update
export const DELETE = crud.remove
