import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { discountsCrud } from '../_shared'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return discountsCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return discountsCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return discountsCrud.remove(req, await getId(ctx))
}
