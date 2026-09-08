import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { expensesCrud } from '../_shared'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return expensesCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return expensesCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return expensesCrud.remove(req, await getId(ctx))
}
