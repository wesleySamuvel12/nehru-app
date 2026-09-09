import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { financeGuard, invoicesCrud } from '../_shared'

/** GET /api/fees/invoices/[id] */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return invoicesCrud.detail(req, await getId(ctx))
}

/** PATCH /api/fees/invoices/[id] — finance staff only */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await financeGuard(req)
  if (g.error) return g.error
  return invoicesCrud.update(req, await getId(ctx))
}

/** DELETE /api/fees/invoices/[id] — finance staff only */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await financeGuard(req)
  if (g.error) return g.error
  return invoicesCrud.remove(req, await getId(ctx))
}
