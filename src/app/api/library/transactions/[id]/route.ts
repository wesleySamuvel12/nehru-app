import { NextRequest } from 'next/server'
import { defineCrud, getId, err, json } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { notifyMember, fmtDue } from '../lib'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Library transaction detail routes.
 * PATCH is CUSTOM (not crud.update) for return/renew actions because they must
 * update the related book's availableCopies — the generic engine cannot do
 * related-row updates. Plain field edits fall through to crud.update.
 *
 * Return logic: status RETURNED + returnDate now, fine ₹2/day past due (cap ₹100),
 * increments book.availableCopies, audits + notifies the borrower.
 */

const crud = defineCrud({
  model: 'libraryTransaction',
  module: 'library',
})

const FINE_PER_DAY = 2
const FINE_CAP = 100
const RENEW_DAYS = 14

async function guard(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return { error: err(401, 'Please sign in to continue.') }
  if (!can(session.role, 'library')) return { error: err(403, 'You do not have permission to access this module.') }
  return { session }
}

export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.detail(req, await getId(ctx))

export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const g = await guard(req)
  if (g.error) return g.error
  const session = g.session!
  const id = await getId(ctx)
  const body = await req.json().catch(() => ({}))

  /* ── Return a book (custom, with related book update + fine) ── */
  if (body?.action === 'RETURN') {
    try {
      const txn = await db.libraryTransaction.findUnique({ where: { id } })
      if (!txn) return err(404, 'Record not found.')
      if (txn.status !== 'ISSUED') return err(400, 'Only currently issued books can be returned.')

      const now = new Date()
      const due = txn.dueDate ? new Date(txn.dueDate) : null
      let fine = 0
      if (due && now.getTime() > due.getTime()) {
        const days = Math.ceil((now.getTime() - due.getTime()) / 86400000)
        fine = Math.min(Math.max(days, 0) * FINE_PER_DAY, FINE_CAP)
      }

      const updated = await db.libraryTransaction.update({
        where: { id },
        data: { status: 'RETURNED', returnDate: now, fine },
      })

      // Give the copy back to the shelf (clamped to totalCopies)
      const book = await db.book.findUnique({ where: { id: txn.bookId }, select: { totalCopies: true, availableCopies: true } })
      if (book) {
        const nextAvailable = Math.min(book.totalCopies, (book.availableCopies ?? 0) + 1)
        await db.book.update({ where: { id: txn.bookId }, data: { availableCopies: nextAvailable } })
      }

      await audit({
        userId: session.sub, userName: session.name, userRole: session.role,
        action: 'RETURN', entity: 'libraryTransaction', entityId: id,
        details: { book: txn.bookTitle, fine, overdue: fine > 0 },
        ip: req.headers.get('x-forwarded-for'),
      })

      await notifyMember(
        txn.userType || 'STUDENT',
        txn.userId,
        'Book returned',
        `Book due returned, fine ₹${fine}. “${txn.bookTitle}” returned on ${fmtDue(now)}.`,
        fine > 0 ? 'WARNING' : 'SUCCESS',
      )

      return json({ data: updated })
    } catch (e) {
      console.error('[library:return]', e)
      return err(500, 'Could not record the return. Please try again.')
    }
  }

  /* ── Renew a book (extend due date) ── */
  if (body?.action === 'RENEW') {
    try {
      const txn = await db.libraryTransaction.findUnique({ where: { id } })
      if (!txn) return err(404, 'Record not found.')
      if (txn.status !== 'ISSUED') return err(400, 'Only currently issued books can be renewed.')

      const newDue = txn.dueDate ? new Date(txn.dueDate) : new Date()
      newDue.setDate(newDue.getDate() + RENEW_DAYS)
      const updated = await db.libraryTransaction.update({
        where: { id },
        data: { dueDate: newDue, renewals: (txn.renewals || 0) + 1 },
      })

      await audit({
        userId: session.sub, userName: session.name, userRole: session.role,
        action: 'RENEW', entity: 'libraryTransaction', entityId: id,
        details: { book: txn.bookTitle, newDueDate: fmtDue(newDue) },
        ip: req.headers.get('x-forwarded-for'),
      })

      await notifyMember(
        txn.userType || 'STUDENT',
        txn.userId,
        'Loan renewed',
        `“${txn.bookTitle}” renewed — new due date ${fmtDue(newDue)}.`,
      )

      return json({ data: updated })
    } catch (e) {
      console.error('[library:renew]', e)
      return err(500, 'Could not renew the loan. Please try again.')
    }
  }

  /* ── Plain field edit → CRUD engine (body was consumed above, forward a clone) ── */
  const forward = new NextRequest(req.url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: req.headers.get('authorization') || '',
      cookie: req.headers.get('cookie') || '',
      'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
    },
    body: JSON.stringify(body || {}),
  })
  return crud.update(forward, id)
}

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.remove(req, await getId(ctx))
