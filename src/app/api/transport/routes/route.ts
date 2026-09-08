import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'route',
  module: 'transport',
  searchFields: ['name'],
  filterFields: ['status'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name'],
  include: { vehicle: true, _count: { select: { stops: true } } },
  beforeSave: (data: Record<string, unknown>) => {
    for (const f of ['distanceKm', 'monthlyFee']) {
      if (data[f] === null || data[f] === undefined || data[f] === '') delete data[f]
      else if (data[f] !== undefined) data[f] = Number(data[f])
    }
    if (data.vehicleId === '') data.vehicleId = null
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
