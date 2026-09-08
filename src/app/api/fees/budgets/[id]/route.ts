import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { budgetsCrud } from '../_shared'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return budgetsCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return budgetsCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return budgetsCrud.remove(req, await getId(ctx))
}
