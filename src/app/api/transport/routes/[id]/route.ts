import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'route',
  module: 'transport',
  include: { vehicle: true, _count: { select: { stops: true } } },
  beforeSave: (data: Record<string, unknown>) => {
    for (const f of ['distanceKm', 'monthlyFee']) {
      if (data[f] === null || data[f] === '') delete data[f]
      else if (data[f] !== undefined) data[f] = Number(data[f])
    }
    if (data.vehicleId === '') data.vehicleId = null
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
