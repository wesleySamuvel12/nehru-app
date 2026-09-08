import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'

/** Reservation detail routes — status transitions (READY / FULFILLED / CANCELLED) via PATCH. */
const crud = defineCrud({
  model: 'bookReservation',
  module: 'library',
})

export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.detail(req, await getId(ctx))

export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.update(req, await getId(ctx))

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.remove(req, await getId(ctx))
