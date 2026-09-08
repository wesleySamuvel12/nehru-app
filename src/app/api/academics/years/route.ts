import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Academic years — making a year current clears the flag on the others. */
async function makeOnlyCurrent(row: any) {
  if (!row?.isCurrent) return
  await db.academicYear.updateMany({ where: { NOT: { id: row.id } }, data: { isCurrent: false } }).catch(() => {})
}

const crud = defineCrud({
  model: 'academicYear',
  module: 'academics',
  searchFields: ['name'],
  defaultSort: { field: 'startDate', dir: 'desc' },
  required: ['name', 'startDate', 'endDate'],
  include: { terms: { orderBy: { startDate: 'asc' } } },
  beforeSave: (data: any) => {
    if (data.startDate) data.startDate = new Date(data.startDate)
    if (data.endDate) data.endDate = new Date(data.endDate)
    return data
  },
  afterCreate: async (row: any) => { await makeOnlyCurrent(row) },
  afterUpdate: async (row: any) => { await makeOnlyCurrent(row) },
})

export const GET = crud.list
export const POST = crud.create
