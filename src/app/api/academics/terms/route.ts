import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Terms within an academic year — current flag is exclusive within the year. */
async function makeOnlyCurrent(row: any) {
  if (!row?.isCurrent || !row?.academicYearId) return
  await db.term.updateMany({ where: { academicYearId: row.academicYearId, NOT: { id: row.id } }, data: { isCurrent: false } }).catch(() => {})
}

const crud = defineCrud({
  model: 'term',
  module: 'academics',
  filterFields: ['academicYearId'],
  defaultSort: { field: 'startDate', dir: 'asc' },
  required: ['academicYearId', 'name', 'startDate', 'endDate'],
  include: { academicYear: true },
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
