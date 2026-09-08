/** Budget CRUD — shared config. */
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const BUDGET_CATEGORIES = ['SALARIES', 'UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'TRANSPORT', 'EVENTS', 'LIBRARY', 'OTHER']

export const budgetsCrud = defineCrud({
  model: 'budget',
  module: 'fees',
  searchFields: ['name', 'category'],
  filterFields: ['category', 'academicYearId'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name', 'category', 'allocated'],
  beforeSave: async (data: any) => {
    data.name = String(data.name || '').trim()
    data.allocated = Math.max(0, Number(data.allocated) || 0)
    data.spent = Math.max(0, Number(data.spent) || 0)
    if (typeof data.notes === 'string' && !data.notes.trim()) data.notes = null
    if (!data.academicYearId) data.academicYearId = null
    return data
  },
})
