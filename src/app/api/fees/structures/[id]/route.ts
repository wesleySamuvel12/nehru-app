import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { structuresCrud } from '../_shared'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return structuresCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return structuresCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return structuresCrud.remove(req, await getId(ctx))
}
