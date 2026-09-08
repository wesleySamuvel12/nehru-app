import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'visitor',
  module: 'security',
  beforeSave: (data: Record<string, unknown>) => {
    for (const f of ['idProof', 'vehicleNo', 'notes', 'photoUrl', 'approvedBy']) {
      if (data[f] === '') data[f] = null
    }
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
