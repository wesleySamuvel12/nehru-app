import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Learning materials (DOCUMENT/VIDEO/LINK/PRESENTATION). */
const crud = defineCrud({
  model: 'learningMaterial',
  module: 'lms',
  searchFields: ['title', 'teacherName'],
  filterFields: ['type', 'classId', 'subjectId'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['title', 'url'],
  beforeSave: (data: any) => {
    for (const k of ['description', 'classId', 'subjectId', 'teacherId', 'teacherName']) {
      if (data[k] === '') data[k] = null
    }
    if (data.scheduledAt === '' || data.scheduledAt === undefined) data.scheduledAt = null
    else if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt)
    return data
  },
})

/** Enrich rows with class & subject names (no schema relations on LearningMaterial). */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const rows = body.data as any[]
      const classIds = [...new Set(rows.map(r => r.classId).filter(Boolean))]
      const subjectIds = [...new Set(rows.map(r => r.subjectId).filter(Boolean))]
      const [classes, subjects] = await Promise.all([
        classIds.length ? db.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : [],
        subjectIds.length ? db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, code: true } }) : [],
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
