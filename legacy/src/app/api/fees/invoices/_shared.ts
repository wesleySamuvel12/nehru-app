/**
 * Fee Invoice CRUD — shared config (used by route.ts and [id]/route.ts).
 * Auto invoiceNo (INV-2025-XXXXX), derived status, parent/student row scoping.
 */
import { NextRequest } from 'next/server'
import { defineCrud, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const FINANCE_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT']

export const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** NEXT invoice/receipt number: max existing padded suffix + 1 (collision safe). */
export async function nextNumberedNo(prefix: string, model: 'feeInvoice' | 'payment'): Promise<string> {
  const field = model === 'feeInvoice' ? 'invoiceNo' : 'receiptNo'
  const last = await (db as any)[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  })
  const current = last?.[field] as string | undefined
  const n = current ? parseInt(current.split('-').pop() || '0', 10) + 1 : 1
  return `${prefix}-${String(isNaN(n) ? 1 : n).padStart(5, '0')}`
}

/** paid>=total → PAID, >0 → PARTIAL, past due → OVERDUE else PENDING (CANCELLED preserved). */
export function deriveInvoiceStatus(total: number, paid: number, dueDate: any, current?: string): string {
  if (current === 'CANCELLED') return 'CANCELLED'
  if (paid >= total && total > 0) return 'PAID'
  if (paid > 0) return 'PARTIAL'
  const due = dueDate ? new Date(dueDate) : null
  return due && !isNaN(due.getTime()) && due.getTime() < Date.now() ? 'OVERDUE' : 'PENDING'
}

/** Student ids visible to this session (PARENT → own children, STUDENT → self). */
export async function ownStudentIds(session: { role: string; studentId?: string | null; parentId?: string | null }): Promise<string[]> {
  if (session.role === 'STUDENT' && session.studentId) return [session.studentId]
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return kids.map(k => k.id)
  }
  return []
}

/** Guard used for finance mutations — only finance staff may write. */
export async function financeGuard(req: NextRequest): Promise<{ session?: any; error?: any }> {
  const session = await requireAuth(req)
  if (!session) return { error: err(401, 'Please sign in to continue.') }
  if (!FINANCE_ROLES.includes(session.role)) {
    return { error: err(403, 'Only school finance staff can perform this action.') }
  }
  return { session }
}

/** Recompute paidAmount + status from SUCCESS payments after any payment change. */
export async function recalcInvoice(invoiceId: string) {
  const inv = await db.feeInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return
  const agg = await db.payment.aggregate({ _sum: { amount: true }, where: { invoiceId, status: 'SUCCESS' } })
  const paid = agg._sum.amount || 0
  await db.feeInvoice.update({
    where: { id: invoiceId },
    data: { paidAmount: paid, status: deriveInvoiceStatus(inv.totalAmount, paid, inv.dueDate, inv.status) },
  })
}

export const invoicesCrud = defineCrud({
  model: 'feeInvoice',
  module: 'fees',
  searchFields: ['invoiceNo', 'title'],
  filterFields: ['status', 'studentId', 'term'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['studentId', 'title', 'totalAmount', 'dueDate'],
  scope: async (session: any) => {
    if (session.role === 'PARENT' || session.role === 'STUDENT') {
      const ids = await ownStudentIds(session)
      return { studentId: { in: ids.length ? ids : ['__none__'] } }
    }
    return undefined
  },
  beforeSave: async (data: any, _session, mode) => {
    data.title = String(data.title || '').trim()
    data.totalAmount = Math.max(0, Number(data.totalAmount) || 0)
    if (mode === 'create') {
      data.paidAmount = Math.max(0, Number(data.paidAmount) || 0)
      if (!data.invoiceNo) data.invoiceNo = await nextNumberedNo('INV-2025', 'feeInvoice')
      // status is derived server-side on create
      data.status = deriveInvoiceStatus(data.totalAmount, Number(data.paidAmount) || 0, data.dueDate)
    }
    return data
  },
  afterUpdate: async (row: any) => {
    // Re-derive status after edits (total/due date changes) using the row's paidAmount
    const derived = deriveInvoiceStatus(row.totalAmount, Number(row.paidAmount) || 0, row.dueDate, row.status)
    if (derived !== row.status) {
      await db.feeInvoice.update({ where: { id: row.id }, data: { status: derived } })
    }
  },
})
