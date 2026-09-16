import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'section',
  module: 'academics',
  include: { class: true },
  beforeSave: (data: any) => {
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') data.capacity = Number(data.capacity)
    if (data.teacherName === '') data.teacherName = null
    if (data.teacherId === '') data.teacherId = null
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
