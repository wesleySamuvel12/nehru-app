import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'lead',
  module: 'admissions',
  beforeSave: (data: any) => {
    for (const k of ['email', 'classAppliedFor', 'assignedToId', 'assignedToName', 'notes', 'campaignId']) {
      if (data[k] === '') data[k] = null
    }
    if (data.nextFollowUp === '' || data.nextFollowUp === undefined) data.nextFollowUp = null
    else if (data.nextFollowUp) data.nextFollowUp = new Date(data.nextFollowUp)
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
