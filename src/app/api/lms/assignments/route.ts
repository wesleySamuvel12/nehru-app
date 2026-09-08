import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Assignments & homework. */
const crud = defineCrud({
  model: 'assignment',
  module: 'lms',
  searchFields: ['title', 'teacherName'],
  filterFields: ['classId', 'sectionId', 'subjectId', 'type', 'status'],
  defaultSort: { field: 'dueDate', dir: 'asc' },
  required: ['title', 'classId', 'sectionId', 'subjectId', 'dueDate'],
  beforeSave: async (data: any, session: any, mode: 'create' | 'update') => {
    for (const k of ['description', 'attachmentUrl']) {
      if (data[k] === '') data[k] = null
    }
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    if (data.maxMarks !== undefined && data.maxMarks !== null && data.maxMarks !== '') data.maxMarks = Number(data.maxMarks)
    if (mode === 'create') {
      if (!data.teacherId) data.teacherId = session.sub
      if (!data.teacherName) data.teacherName = session.name
    } else if (data.teacherName === '') {
      data.teacherName = session.name
    }
    return data
  },
})

/** Enrich rows with class / section / subject names (no schema relations on Assignment). */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const rows = body.data as any[]
      const ids = (key: string) => [...new Set(rows.map(r => r[key]).filter(Boolean))]
      const [classes, sections, subjects] = await Promise.all([
        ids('classId').length ? db.class.findMany({ where: { id: { in: ids('classId') } }, select: { id: true, name: true } }) : [],
        ids('sectionId').length ? db.section.findMany({ where: { id: { in: ids('sectionId') } }, select: { id: true, name: true } }) : [],
        ids('subjectId').length ? db.subject.findMany({ where: { id: { in: ids('subjectId') } }, select: { id: true, name: true, code: true } }) : [],
      ])
      const cMap = Object.fromEntries(classes.map(c => [c.id, c]))
      const secMap = Object.fromEntries(sections.map(s => [s.id, s]))
      const subMap = Object.fromEntries(subjects.map(s => [s.id, s]))
      body.data = rows.map(r => ({
        ...r,
        class: cMap[r.classId] || null,
        section: secMap[r.sectionId] || null,
        subject: subMap[r.subjectId] || null,
      }))
    }
    return NextResponse.json(body)
  } catch {
    return res
  }
}
export const POST = crud.create
