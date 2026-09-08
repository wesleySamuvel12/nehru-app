import type { NextRequest } from 'next/server'
import { reportCardCrud } from '../_crud'
import { getId } from '@/lib/crud'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return reportCardCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return reportCardCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return reportCardCrud.remove(req, await getId(ctx))
}
