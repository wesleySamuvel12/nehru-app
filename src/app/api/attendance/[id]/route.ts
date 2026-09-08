import type { NextRequest } from 'next/server'
import { attendanceCrud } from '../_crud'
import { getId } from '@/lib/crud'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return attendanceCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return attendanceCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return attendanceCrud.remove(req, await getId(ctx))
}
