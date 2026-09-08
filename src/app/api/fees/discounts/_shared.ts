/** Discount / Scholarship CRUD — shared config. */
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const discountsCrud = defineCrud({
  model: 'discount',
  module: 'fees',
  searchFields: ['name', 'reason'],
  filterFields: ['type', 'appliesTo'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name', 'type', 'value'],
  beforeSave: async (data: any) => {
    data.name = String(data.name || '').trim()
    data.value = Math.max(0, Number(data.value) || 0)
    if (data.type === 'PERCENT') data.value = Math.min(100, data.value)
    data.active = data.active === true || data.active === 'true'
    if (data.appliesTo === 'ALL' || !data.appliesTo) data.targetId = null
    if (typeof data.reason === 'string' && !data.reason.trim()) data.reason = null
    return data
  },
})
