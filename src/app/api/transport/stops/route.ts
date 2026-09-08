import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'stop',
  module: 'transport',
  filterFields: ['routeId'],
  defaultSort: { field: 'sequence', dir: 'asc' },
  required: ['routeId', 'name'],
  include: { route: true },
  beforeSave: (data: Record<string, unknown>) => {
    if (data.sequence !== undefined && data.sequence !== null && data.sequence !== '') data.sequence = Number(data.sequence)
    for (const f of ['lat', 'lng']) {
      if (data[f] === null || data[f] === '') delete data[f]
      else if (data[f] !== undefined) data[f] = Number(data[f])
    }
    for (const f of ['pickupTime', 'dropTime']) if (data[f] === '') data[f] = null
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
