import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'vehicle',
  module: 'transport',
  required: ['regNo', 'model', 'capacity'],
  beforeSave: (data: Record<string, unknown>) => {
    const dateFields = ['licenseExpiry', 'insuranceExpiry', 'fitnessExpiry', 'lastServiceAt']
    const strFields = ['driverName', 'driverPhone', 'driverLicense', 'attendantName']
    for (const f of dateFields) if (data[f] === '') data[f] = null
    for (const f of strFields) if (data[f] === '') data[f] = null
    if (data.capacity === null || data.capacity === '') delete data.capacity
    else if (data.capacity !== undefined) data.capacity = Number(data.capacity)
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
