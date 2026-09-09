/** Fee Structure CRUD — shared config. */
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const structuresCrud = defineCrud({
  model: 'feeStructure',
  module: 'fees',
  searchFields: ['name'],
  filterFields: ['classId', 'academicYearId'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name', 'totalAmount'],
  beforeSave: async (data: any) => {
    data.name = String(data.name || '').trim()
    data.totalAmount = Math.max(0, Number(data.totalAmount) || 0)
    data.installments = Math.max(1, Math.round(Number(data.installments) || 1))
    if (!data.classId) data.classId = null
    if (!data.academicYearId) data.academicYearId = null
    data.isActive = data.isActive === true || data.isActive === 'true'
    if (typeof data.itemsJson === 'string' && !data.itemsJson.trim()) data.itemsJson = null
    return data
  },
})
