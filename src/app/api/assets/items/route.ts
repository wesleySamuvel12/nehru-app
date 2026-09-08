import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/**
 * Asset register. POST auto-generates a barcode (ASSET…) when not supplied.
 * searchFields: name / assetTag / barcode. Filters: category, status, condition.
 */
const crud = defineCrud({
  model: 'asset',
  module: 'assets',
  searchFields: ['name', 'assetTag', 'barcode'],
  filterFields: ['category', 'status', 'condition'],
  defaultSort: { field: 'assetTag', dir: 'asc' },
  required: ['assetTag', 'name'],
  beforeSave: async (data: any, _session, mode) => {
    if (mode !== 'create') return data
    // Default current value to the purchase cost
    if (data.currentValue === undefined || data.currentValue === null || data.currentValue === '') {
      data.currentValue = data.purchaseCost !== undefined && data.purchaseCost !== null ? Number(data.purchaseCost) : null
    }
    // Auto barcode: ASSET2000NN based on register size (collision-safe)
    if (!data.barcode) {
      let n = await db.asset.count()
      let candidate = `ASSET${200000 + n}`
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await db.asset.findUnique({ where: { barcode: candidate }, select: { id: true } })
        if (!exists) break
        n += 1
        candidate = `ASSET${200000 + n}`
      }
      data.barcode = candidate
    }
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
