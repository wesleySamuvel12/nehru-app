import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'campaign',
  module: 'admissions',
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.detail(req, await getId(ctx))
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.update(req, await getId(ctx))
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.remove(req, await getId(ctx))
}
