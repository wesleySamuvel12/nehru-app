import type { NextRequest } from 'next/server'
import { gradeCrud } from '../_crud'
import { getId } from '@/lib/crud'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return gradeCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return gradeCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return gradeCrud.remove(req, await getId(ctx))
}
