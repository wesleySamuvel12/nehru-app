import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'academicYear',
  module: 'academics',
  include: { terms: { orderBy: { startDate: 'asc' } } },
  beforeSave: (data: any) => {
    if (data.startDate) data.startDate = new Date(data.startDate)
    if (data.endDate) data.endDate = new Date(data.endDate)
    return data
  },
  afterUpdate: async (row: any) => {
    if (row?.isCurrent) await db.academicYear.updateMany({ where: { NOT: { id: row.id } }, data: { isCurrent: false } }).catch(() => {})
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
