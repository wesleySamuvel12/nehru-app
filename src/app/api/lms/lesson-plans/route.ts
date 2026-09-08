import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Lesson plans. */
const crud = defineCrud({
  model: 'lessonPlan',
  module: 'lms',
  searchFields: ['title', 'teacherName'],
  filterFields: ['classId', 'subjectId', 'status'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['title', 'classId', 'subjectId', 'date'],
  beforeSave: async (data: any, session: any, mode: 'create' | 'update') => {
    for (const k of ['objectives', 'content', 'resources']) {
      if (data[k] === '') data[k] = null
    }
    if (data.date) data.date = new Date(data.date)
    if (!data.status) data.status = 'PLANNED'
    if (mode === 'create') {
      if (!data.teacherId) data.teacherId = session.sub
      if (!data.teacherName) data.teacherName = session.name
    } else if (data.teacherName === '') {
      data.teacherName = session.name
    }
    return data
  },
})

/** Enrich rows with class & subject names (no schema relations on LessonPlan). */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const rows = body.data as any[]
      const ids = (key: string) => [...new Set(rows.map(r => r[key]).filter(Boolean))]
      const [classes, subjects] = await Promise.all([
        ids('classId').length ? db.class.findMany({ where: { id: { in: ids('classId') } }, select: { id: true, name: true } }) : [],
        ids('subjectId').length ? db.subject.findMany({ where: { id: { in: ids('subjectId') } }, select: { id: true, name: true, code: true } }) : [],
      ])
      const cMap = Object.fromEntries(classes.map(c => [c.id, c]))
      const sMap = Object.fromEntries(subjects.map(s => [s.id, s]))
      body.data = rows.map(r => ({ ...r, class: cMap[r.classId] || null, subject: sMap[r.subjectId] || null }))
    }
    return NextResponse.json(body)
  } catch {
    return res
  }
}
export const POST = crud.create
