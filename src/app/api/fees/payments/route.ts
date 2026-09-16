import { createPayment, paymentsCrud } from './_shared'

/** GET /api/fees/payments — list (parents see only their children's receipts) */
export const GET = paymentsCrud.list

/** POST /api/fees/payments — finance staff; parents/students may pay own invoices */
export const POST = createPayment
