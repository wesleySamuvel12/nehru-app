import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/** Asset detail routes. */
const crud = defineCrud({
  model: 'asset',
  module: 'assets',
})

export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.detail(req, await getId(ctx))

export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.update(req, await getId(ctx))

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.remove(req, await getId(ctx))
