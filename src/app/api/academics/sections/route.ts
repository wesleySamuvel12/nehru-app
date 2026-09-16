import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'section',
  module: 'academics',
  searchFields: ['name', 'teacherName'],
  filterFields: ['classId'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name', 'classId'],
  include: { class: true },
  beforeSave: (data: any) => {
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') data.capacity = Number(data.capacity)
    if (data.teacherName === '') data.teacherName = null
    if (data.teacherId === '') data.teacherId = null
    return data
  },
})

/** Enrich with live student counts per section. */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const counts = await db.student.groupBy({ by: ['sectionId'], _count: { _all: true } })
      const map = Object.fromEntries(counts.map(c => [c.sectionId, c._count._all]))
      body.data = body.data.map((r: any) => ({ ...r, studentsCount: map[r.id] || 0 }))
    }
    return NextResponse.json(body, { status: res.status })
  } catch {
    return res
  }
}
export const POST = crud.create
