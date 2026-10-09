import { NextRequest, NextResponse } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Submissions — grading via PATCH sets marks/grade/feedback. */
const crud = defineCrud({
  model: 'submission',
  module: 'lms',
  filterFields: ['assignmentId', 'studentId', 'status'],
  defaultSort: { field: 'submittedAt', dir: 'desc' },
  beforeSave: (data: any) => {
    if (data.marks === '' || data.marks === undefined) data.marks = null
    else if (data.marks !== null) data.marks = Number(data.marks)
    if (data.grade === '') data.grade = null
    if (data.feedback === '') data.feedback = null
    if (data.contentUrl === '') data.contentUrl = null
    if (data.contentText === '') data.contentText = null
    if (data.marks !== null && data.marks !== undefined && !data.status) data.status = 'GRADED'
    return data
  },
})

/** Enrich rows with student & assignment info (no schema relations on Submission). */
export async function GET(req: NextRequest) {
  const res = await crud.list(req)
  try {
    const body = await res.json()
    if (Array.isArray(body?.data) && body.data.length) {
      const rows = body.data as any[]
      const studentIds = [...new Set(rows.map(r => r.studentId).filter(Boolean))]
      const assignmentIds = [...new Set(rows.map(r => r.assignmentId).filter(Boolean))]
      const [students, assignments] = await Promise.all([
        studentIds.length ? db.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true, admissionNo: true } }) : [],
        assignmentIds.length ? db.assignment.findMany({ where: { id: { in: assignmentIds } }, select: { id: true, title: true, maxMarks: true, dueDate: true, status: true } }) : [],
      ])
      const sMap = Object.fromEntries(students.map(s => [s.id, { ...s, name: `${s.firstName} ${s.lastName}` }]))
      const aMap = Object.fromEntries(assignments.map(a => [a.id, a]))
      body.data = rows.map(r => ({ ...r, student: sMap[r.studentId] || null, assignment: aMap[r.assignmentId] || null }))
    }
    return NextResponse.json(body, { status: res.status })
  } catch {
    return res
  }
}
export const POST = crud.create
