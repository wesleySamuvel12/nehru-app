import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'enrollment',
  module: 'academics',
  beforeSave: async (data: any) => {
    if (data.date === '' || data.date === undefined) data.date = new Date()
    else if (data.date) data.date = new Date(data.date)
    if (data.remarks === '') data.remarks = null
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
