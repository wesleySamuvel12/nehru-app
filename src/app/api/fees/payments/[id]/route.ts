import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { financeGuard } from '../../invoices/_shared'
import { paymentsCrud as pc } from '../_shared'

/** GET /api/fees/payments/[id] */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return pc.detail(req, await getId(ctx))
}

/** PATCH /api/fees/payments/[id] — finance staff only */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await financeGuard(req)
  if (g.error) return g.error
  return pc.update(req, await getId(ctx))
}

/** DELETE /api/fees/payments/[id] — finance staff only (recomputes the invoice) */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await financeGuard(req)
  if (g.error) return g.error
  return pc.remove(req, await getId(ctx))
}
