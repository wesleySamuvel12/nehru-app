import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'assignment',
  module: 'lms',
  beforeSave: (data: any) => {
    for (const k of ['description', 'attachmentUrl']) {
      if (data[k] === '') data[k] = null
    }
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    if (data.maxMarks !== undefined && data.maxMarks !== null && data.maxMarks !== '') data.maxMarks = Number(data.maxMarks)
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
