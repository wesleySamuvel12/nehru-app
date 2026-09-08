import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'submission',
  module: 'lms',
  beforeSave: (data: any) => {
    if (data.marks === '' || data.marks === undefined) data.marks = null
    else if (data.marks !== null) data.marks = Number(data.marks)
    if (data.grade === '') data.grade = null
    if (data.feedback === '') data.feedback = null
    if (data.contentUrl === '') data.contentUrl = null
    if (data.contentText === '') data.contentText = null
    if (data.marks !== null && data.marks !== undefined && !data.status) data.status = 'GRADED'
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
