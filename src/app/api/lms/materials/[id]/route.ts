import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'learningMaterial',
  module: 'lms',
  beforeSave: (data: any) => {
    for (const k of ['description', 'classId', 'subjectId', 'teacherId', 'teacherName']) {
      if (data[k] === '') data[k] = null
    }
    if (data.scheduledAt === '' || data.scheduledAt === undefined) data.scheduledAt = null
    else if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt)
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
