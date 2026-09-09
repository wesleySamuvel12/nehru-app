import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'timetableSlot',
  module: 'academics',
  beforeSave: (data: any) => {
    if (data.period !== undefined && data.period !== null && data.period !== '') data.period = Number(data.period)
    if (data.dayOfWeek !== undefined && data.dayOfWeek !== null && data.dayOfWeek !== '') data.dayOfWeek = Number(data.dayOfWeek)
    if (data.subjectId === '') data.subjectId = null
    if (data.teacherId === '') data.teacherId = null
    if (data.room === '') data.room = null
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
