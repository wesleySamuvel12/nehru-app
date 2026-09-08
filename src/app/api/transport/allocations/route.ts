import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { defineCrud } from '@/lib/crud'
import type { Session } from '@/lib/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Row-level security: parents see their children's allocations, students their own. */
async function ownScope(session: Session): Promise<any> {
  if (session.role === 'STUDENT') {
    return session.studentId ? { studentId: session.studentId } : { id: '__none__' }
  }
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { studentId: { in: kids.map(k => k.id) } }
  }
  return null
}

const crud = defineCrud({
  model: 'transportAllocation',
  module: 'transport',
  filterFields: ['routeId', 'status', 'studentId', 'pickupStatus'],
  include: { route: true, stop: true },
  required: ['studentId', 'routeId', 'stopId'],
  defaultSort: { field: 'id', dir: 'desc' },
  scope: ownScope,
  beforeSave: (data: Record<string, unknown>) => {
    if (data.monthlyFee === null || data.monthlyFee === undefined || data.monthlyFee === '') delete data.monthlyFee
    else if (data.monthlyFee !== undefined) data.monthlyFee = Number(data.monthlyFee)
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
