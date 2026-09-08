import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

const crud = defineCrud({
  model: 'department',
  module: 'teachers',
  include: { _count: { select: { employees: true } } },
})

/** Wrappers resolve the route context properly (Next 16 passes params as a Promise). */
export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.detail(req, await getId(ctx))
export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.update(req, await getId(ctx))
export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.remove(req, await getId(ctx))
