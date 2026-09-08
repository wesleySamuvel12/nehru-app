import { financeGuard, invoicesCrud } from './_shared'

/** GET  /api/fees/invoices — list (parents see only their children) */
export const GET = invoicesCrud.list

/** POST /api/fees/invoices — finance staff only */
export const POST = async (req: Parameters<typeof invoicesCrud.create>[0]) => {
  const g = await financeGuard(req)
  if (g.error) return g.error
  return invoicesCrud.create(req)
}
