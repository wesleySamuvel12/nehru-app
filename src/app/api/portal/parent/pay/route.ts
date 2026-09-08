import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/portal/parent/pay — demo online fee payment.
 * Body: { invoiceId, method: 'ONLINE' }
 * Creates a Payment, recalculates the invoice, notifies the parent and audits the event.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (session.role !== 'PARENT') return err(403, 'Only parent accounts can pay through this portal.')
  if (!session.parentId) return err(403, 'Your account is not linked to a parent profile.')

  try {
    const body = await req.json()
    const invoiceId = String(body.invoiceId || '')
    const method = ['ONLINE', 'CARD', 'UPI'].includes(body.method) ? body.method : 'ONLINE'
    if (!invoiceId) return err(400, 'Invoice is required.')

    const invoice = await db.feeInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return err(404, 'Invoice not found.')

    // Ownership check — the invoice must belong to one of this parent's children
    const child = await db.student.findFirst({ where: { id: invoice.studentId, parentId: session.parentId } })
    if (!child) return err(403, 'This invoice does not belong to your children.')

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return err(400, 'This invoice is already settled.')
    }
    const due = Math.round((invoice.totalAmount - invoice.paidAmount - (invoice.discount || 0)) * 100) / 100
    if (due <= 0) return err(400, 'Nothing left to pay on this invoice.')

    // Simulated gateway processing (demo)
    const receiptNo = `RCPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    const payment = await db.payment.create({
      data: {
        receiptNo,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: due,
        method,
        reference: `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        status: 'SUCCESS',
        collectedBy: 'Parent Portal (demo gateway)',
        remarks: `Online payment by ${session.name} for ${child.firstName} ${child.lastName}`,
      },
    })

    const newPaid = Math.round((invoice.paidAmount + due) * 100) / 100
    const newStatus = newPaid >= invoice.totalAmount - (invoice.discount || 0) ? 'PAID' : 'PARTIAL'
    await db.feeInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: newPaid, status: newStatus },
    })

    await notify({
      userId: session.sub,
      title: 'Payment successful',
      message: `Receipt ${receiptNo} — ${due} received for ${child.firstName} ${child.lastName} (${invoice.invoiceNo}). Invoice is now ${newStatus.toLowerCase()}.`,
      type: 'SUCCESS',
    })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'Payment', entityId: payment.id,
      details: { receiptNo, invoiceNo: invoice.invoiceNo, amount: due, method, demo: true },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({
      data: {
        id: payment.id, receiptNo, amount: due, method, status: payment.status,
        paidAt: payment.paidAt, invoiceNo: invoice.invoiceNo, invoiceStatus: newStatus,
        studentName: `${child.firstName} ${child.lastName}`,
      },
    }, 201)
  } catch (e: any) {
    if (String(e?.code) === 'P2002') return err(409, 'Receipt collision — please retry the payment.')
    console.error('[portal:parent:pay]', e)
    return err(500, 'Payment could not be recorded. No money was charged — please try again.')
  }
}
