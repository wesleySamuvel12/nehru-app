import { defineCrud } from '@/lib/crud'

/** Normalize form payloads: empty dates → null, numbers coerced, empty optionals → null */
function cleanVehicle(data: Record<string, unknown>) {
  const dateFields = ['licenseExpiry', 'insuranceExpiry', 'fitnessExpiry', 'lastServiceAt']
  const strFields = ['driverName', 'driverPhone', 'driverLicense', 'attendantName']
  for (const f of dateFields) {
    if (data[f] === '') data[f] = null
  }
  for (const f of strFields) {
    if (data[f] === '') data[f] = null
  }
  if (data.capacity === null || data.capacity === undefined || data.capacity === '') {
    delete data.capacity
  } else if (data.capacity !== undefined) {
    data.capacity = Number(data.capacity)
  }
  return data
}

const crud = defineCrud({
  model: 'vehicle',
  module: 'transport',
  searchFields: ['regNo', 'driverName'],
  filterFields: ['status', 'fuelType'],
  defaultSort: { field: 'regNo', dir: 'asc' },
  required: ['regNo', 'model', 'capacity'],
  beforeSave: (data) => cleanVehicle(data),
})

export const GET = crud.list
export const POST = crud.create
