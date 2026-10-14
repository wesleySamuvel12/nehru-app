import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { defineCrud } from '@/lib/crud'
import { notifyRoles } from '@/lib/notify'
import type { Session } from '@/lib/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Row-level security: parents/students see complaints they raised or about their children. */
async function ownScope(session: Session): Promise<any> {
  if (session.role === 'STUDENT') {
    return { OR: [{ raisedById: session.sub }, ...(session.studentId ? [{ studentId: session.studentId }] : [])] }
  }
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { OR: [{ raisedById: session.sub }, { studentId: { in: kids.map(k => k.id) } }] }
  }
  return null
}

const crud = defineCrud({
  model: 'complaint',
  module: 'hostel',
  searchFields: ['title', 'raisedBy', 'description'],
  filterFields: ['category', 'status', 'priority'],
  required: ['title', 'description'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  scope: ownScope,
  beforeSave: (data: Record<string, unknown>, session: Session, mode: 'create' | 'update') => {
    if (mode === 'create') {
      data.raisedById = session.sub
      if (!data.raisedBy) data.raisedBy = session.name
    }
    if (data.resolution === '') data.resolution = null
    if (data.studentId === '') data.studentId = null
    return data
  },
  afterCreate: async (row: any) => {
    await notifyRoles(
      ['WARDEN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
      `New ${String(row.category || 'GENERAL').toLowerCase()} complaint`,
      row.title,
      { type: 'WARNING', link: 'hostel' },
    )
  },
  afterUpdate: async (row: any) => {
    if (row.status === 'RESOLVED' && row.raisedById) {
      try {
        const { notify } = await import('@/lib/notify')
        await notify({
          userId: row.raisedById,
          title: 'Complaint resolved',
          message: `“${row.title}” — ${row.resolution || 'marked as resolved.'}`,
          type: 'SUCCESS',
          link: 'hostel',
        })
      } catch (e) {
        console.error('[complaint:afterUpdate]', e)
      }
    }
  },
})

export const GET = crud.list
export const POST = crud.create
