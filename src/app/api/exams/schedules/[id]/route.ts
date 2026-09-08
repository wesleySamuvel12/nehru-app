import type { NextRequest } from 'next/server'
import { scheduleCrud } from '../_crud'
import { getId } from '@/lib/crud'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return scheduleCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return scheduleCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return scheduleCrud.remove(req, await getId(ctx))
}
