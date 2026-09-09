import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Student enrollments (NEW / PROMOTION / TRANSFER / RE_ENROLLMENT). */
const crud = defineCrud({
  model: 'enrollment',
  module: 'academics',
  filterFields: ['studentId', 'classId', 'sectionId', 'academicYearId', 'type', 'status'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['studentId', 'classId', 'sectionId', 'academicYearId'],
  beforeSave: async (data: any) => {
    if (!data.academicYearId) {
      const current = await db.academicYear.findFirst({ where: { isCurrent: true } })
      if (current) data.academicYearId = current.id
    }
    if (!data.type) data.type = 'NEW'
    if (!data.status) data.status = 'ACTIVE'
    if (data.date === '' || data.date === undefined) data.date = new Date()
    else if (data.date) data.date = new Date(data.date)
    if (data.remarks === '') data.remarks = null
    return data
  },
})

/** Enrich rows with student / class / section names (no schema relations on Enrollment). */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const rows = body.data as any[]
      const [students, classes, sections] = await Promise.all([
        db.student.findMany({ where: { id: { in: [...new Set(rows.map(r => r.studentId).filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, admissionNo: true } }),
        db.class.findMany({ where: { id: { in: [...new Set(rows.map(r => r.classId).filter(Boolean))] } }, select: { id: true, name: true } }),
        db.section.findMany({ where: { id: { in: [...new Set(rows.map(r => r.sectionId).filter(Boolean))] } }, select: { id: true, name: true } }),
      ])
      const sMap = Object.fromEntries(students.map(s => [s.id, s]))
      const cMap = Object.fromEntries(classes.map(c => [c.id, c]))
      const secMap = Object.fromEntries(sections.map(s => [s.id, s]))
      body.data = rows.map(r => ({
        ...r,
        student: sMap[r.studentId] ? { ...sMap[r.studentId], name: `${sMap[r.studentId].firstName} ${sMap[r.studentId].lastName}` } : null,
        class: cMap[r.classId] || null,
        section: secMap[r.sectionId] || null,
      }))
    }
    return NextResponse.json(body, { status: res.status })
  } catch {
    return res
  }
}
export const POST = crud.create
