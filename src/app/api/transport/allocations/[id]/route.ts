import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'transportAllocation',
  module: 'transport',
  include: { route: true, stop: true },
  beforeSave: (data: Record<string, unknown>) => {
    if (data.monthlyFee === null || data.monthlyFee === '') delete data.monthlyFee
    else if (data.monthlyFee !== undefined) data.monthlyFee = Number(data.monthlyFee)
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
