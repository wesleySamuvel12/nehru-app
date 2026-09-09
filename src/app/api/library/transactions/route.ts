import { NextRequest } from 'next/server'
import { defineCrud, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { notifyMember, fmtDue } from './lib'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Library circulation — issue transactions.
 * POST (issue): validates availability up-front for a friendly error, then
 * beforeSave decrements book.availableCopies; afterCreate notifies the borrower.
 */

const crud = defineCrud({
  model: 'libraryTransaction',
  module: 'library',
  searchFields: ['bookTitle', 'userName'],
  filterFields: ['status', 'userType', 'bookId', 'userId'],
  defaultSort: { field: 'issueDate', dir: 'desc' },
  required: ['bookId', 'userId'],
  beforeSave: async (data: any, _session, mode) => {
    if (mode !== 'create') return data
    const status = data.status || 'ISSUED'
    const book = await db.book.findUnique({ where: { id: data.bookId } })
    if (!book) throw new Error('Book not found')
    if (status === 'ISSUED' && (book.availableCopies ?? 0) <= 0) {
      throw new Error('No copies available')
    }
    // Copy-count side effect: every issued loan takes one copy off the shelf
    if (status === 'ISSUED') {
      await db.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } })
    }
    if (!data.bookTitle) data.bookTitle = book.title
    if (!data.status) data.status = status
    if (!data.issueDate) data.issueDate = new Date()
    return data
  },
  afterCreate: async (row: any) => {
    await notifyMember(
      row.userType || 'STUDENT',
      row.userId,
      'Book issued',
      `“${row.bookTitle}” has been issued to ${row.userName || 'you'}. Due on ${fmtDue(row.dueDate)}.`,
    )
  },
})

export const GET = crud.list

/** Custom POST — pre-validates availability so users get a clear message, then delegates to the CRUD engine. */
export const POST = async (req: NextRequest) => {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'library')) return err(403, 'You do not have permission to access this module.')
  try {
    const body = await req.json()
    if (!body?.bookId || !body?.userId) return err(400, 'Book and borrower are required.')
    if ((body.status || 'ISSUED') === 'ISSUED') {
      const book = await db.book.findUnique({ where: { id: body.bookId }, select: { title: true, availableCopies: true } })
      if (!book) return err(400, 'That book no longer exists in the catalogue.')
      if ((book.availableCopies ?? 0) <= 0) {
        return err(400, `No copies of “${book.title}” are available right now.`)
      }
    }
    // Forward an unread request clone to the CRUD engine (its body was consumed above)
    const forward = new NextRequest(req.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.get('cookie') || '',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify(body),
    })
    return await crud.create(forward)
  } catch (e: any) {
    if (e?.message === 'No copies available') return err(400, 'That copy was just taken — no copies remain available.')
    if (e?.message === 'Book not found') return err(400, 'That book no longer exists in the catalogue.')
    console.error('[library:transactions:POST]', e)
    return err(500, 'Could not record the issue. Please try again.')
  }
}
