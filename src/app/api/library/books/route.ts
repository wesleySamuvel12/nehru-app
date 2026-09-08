import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/**
 * Library catalogue — books.
 * POST auto-generates a barcode (BK…) when not supplied.
 */
const crud = defineCrud({
  model: 'book',
  module: 'library',
  searchFields: ['title', 'author', 'isbn', 'barcode'],
  filterFields: ['category', 'status'],
  defaultSort: { field: 'title', dir: 'asc' },
  required: ['title', 'author'],
  beforeSave: async (data: any, _session, mode) => {
    if (mode !== 'create') return data
    // Default availability to total copies on create
    if (data.availableCopies === undefined || data.availableCopies === null || data.availableCopies === '') {
      data.availableCopies = Math.max(0, Number(data.totalCopies) || 0)
    }
    // Auto barcode: BK1000NN based on catalogue size (collision-safe)
    if (!data.barcode) {
      let n = await db.book.count()
      let candidate = `BK${100000 + n}`
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await db.book.findUnique({ where: { barcode: candidate }, select: { id: true } })
        if (!exists) break
        n += 1
        candidate = `BK${100000 + n}`
      }
      data.barcode = candidate
    }
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
