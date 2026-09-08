import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'class',
  module: 'academics',
  include: { _count: { select: { sections: true, students: true } } },
  beforeSave: (data: any) => {
    if (data.level !== undefined && data.level !== null && data.level !== '') data.level = Number(data.level)
    if (data.stream === '') data.stream = null
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
