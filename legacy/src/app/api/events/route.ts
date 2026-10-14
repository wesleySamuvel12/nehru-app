import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'event',
  module: 'events',
  searchFields: ['title', 'location'],
  filterFields: ['type', 'status', 'audience'],
  defaultSort: { field: 'startDate', dir: 'asc' },
  required: ['title', 'startDate'],
  beforeSave: (data: any) => {
    if (data.endDate === '') data.endDate = null
    if (data.location === '') data.location = null
    if (data.description === '') data.description = null
    if (data.organizerName === '') data.organizerName = null
    if (!data.registrationRequired) data.capacity = null
    if (data.capacity === '' || data.capacity === undefined) data.capacity = data.registrationRequired ? data.capacity : null
    if (data.capacity === '') data.capacity = null
    if (!data.color) data.color = data.type === 'HOLIDAY' ? 'rose' : data.type === 'EXAM' ? 'amber' : data.type === 'SPORTS' ? 'emerald' : 'sky'
    if (!data.status) data.status = 'SCHEDULED'
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
