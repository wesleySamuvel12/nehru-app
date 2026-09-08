import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Houses — enriched with live member counts (Student.house stores the name). */
const crud = defineCrud({
  model: 'house',
  module: 'academics',
  searchFields: ['name'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name'],
})

export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const counts = await db.student.groupBy({ by: ['house'], _count: { _all: true } })
      const map = Object.fromEntries(counts.map(c => [c.house, c._count._all]))
      body.data = body.data.map((h: any) => ({ ...h, members: map[h.name] || 0 }))
    }
    return NextResponse.json(body)
  } catch {
    return res
  }
}
export const POST = crud.create
