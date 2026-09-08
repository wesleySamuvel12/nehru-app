import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Marketing campaigns for admissions. */
const crud = defineCrud({
  model: 'campaign',
  module: 'admissions',
  searchFields: ['name', 'source'],
  filterFields: ['source', 'status'],
  defaultSort: { field: 'startDate', dir: 'desc' },
  required: ['name', 'source', 'startDate'],
  beforeSave: (data: any) => {
    if (data.budget !== undefined && data.budget !== null && data.budget !== '') data.budget = Number(data.budget)
    if (data.spend !== undefined && data.spend !== null && data.spend !== '') data.spend = Number(data.spend)
    if (data.leadsCount !== undefined && data.leadsCount !== null && data.leadsCount !== '') data.leadsCount = Number(data.leadsCount)
    if (data.conversions !== undefined && data.conversions !== null && data.conversions !== '') data.conversions = Number(data.conversions)
    if (data.endDate === '' || data.endDate === undefined) data.endDate = null
    else if (data.endDate) data.endDate = new Date(data.endDate)
    if (data.startDate) data.startDate = new Date(data.startDate)
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
