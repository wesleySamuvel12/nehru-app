/**
 * Payment CRUD — shared config (used by route.ts and [id]/route.ts).
 * Auto receiptNo (RCPT-2025-XXXXX), SUCCESS status, invoice recalc + parent notification.
 */
import { NextRequest } from 'next/server'
import { defineCrud, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { can } from '@/lib/rbac'
import { notify } from '@/lib/notify'
import { inr } from '@/lib/format'
import { nextNumberedNo, recalcInvoice, ownStudentIds } from '../invoices/_shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const paymentsCrud = defineCrud({
  model: 'payment',
  module: 'fees',
  searchFields: ['receiptNo', 'reference', 'collectedBy'],
  filterFields: ['status', 'method', 'invoiceId', 'studentId'],
  defaultSort: { field: 'paidAt', dir: 'desc' },
  required: ['invoiceId', 'amount'],
  scope: async (session: any) => {
    if (session.role === 'PARENT' || session.role === 'STUDENT') {
      const ids = await ownStudentIds(session)
      return { studentId: { in: ids.length ? ids : ['__none__'] } }
    }
    return undefined
  },
  beforeSave: async (data: any, session: any, mode) => {
    if (mode === 'create') {
      data.amount = Math.max(0, Number(data.amount) || 0)
      data.receiptNo = await nextNumberedNo('RCPT-2025', 'payment')
      data.status = 'SUCCESS'
      data.collectedBy = session.name || 'Staff'
      data.collectedById = session.sub
      if (!data.paidAt) data.paidAt = new Date()
      if (!data.reference) delete data.reference
      if (!data.remarks) delete data.remarks
    }
    return data
  },
  afterCreate: async (row: any) => {
    await recalcInvoice(row.invoiceId)
    // Notify the parent user linked to this student
    try {
      const student = await db.student.findUnique({
        where: { id: row.studentId },
        select: { parentId: true, firstName: true, lastName: true },
      })
      if (student?.parentId) {
        const user = await db.user.findFirst({ where: { linkedParentId: student.parentId }, select: { id: true } })
        if (user) {
          await notify({
            userId: user.id,
            title: 'Fee payment received',
            message: `We received ${inr(row.amount)} towards fees for ${student.firstName} ${student.lastName}. Receipt ${row.receiptNo}.`,
            type: 'SUCCESS',
            link: 'fees',
          })
        }
      }
    } catch (e) {
      console.error('[payments:afterCreate:notify]', e)
    }
  },
  afterUpdate: async (row: any) => recalcInvoice(row.invoiceId),
  afterDelete: async (row: any) => recalcInvoice(row.invoiceId),
})

/** POST /api/fees/payments — staff, plus parents/students paying their OWN child's invoice. */
export async function createPayment(req: NextRequest): Promise<Response> {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'fees')) return err(403, 'You do not have permission to access this module.')
  if (session.role === 'PARENT' || session.role === 'STUDENT') {
    let body: any = {}
    try { body = await req.json() } catch { /* invalid body */ }
    const own = await ownStudentIds(session)
    const inv = body?.invoiceId ? await db.feeInvoice.findUnique({ where: { id: String(body.invoiceId) } }) : null
    if (!inv || !own.includes(inv.studentId)) {
      return err(403, 'You can only pay fee invoices for your own children.')
    }
    const clone = new NextRequest(
      `http://internal${req.nextUrl.pathname}${req.nextUrl.search}`,
      { method: 'POST', headers: req.headers, body: JSON.stringify({ ...body, studentId: inv.studentId }) },
    )
    return paymentsCrud.create(clone)
  }
  return paymentsCrud.create(req)
}
