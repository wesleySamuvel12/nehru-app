import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { performanceCrud } from '../_shared'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return performanceCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return performanceCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return performanceCrud.remove(req, await getId(ctx))
}
