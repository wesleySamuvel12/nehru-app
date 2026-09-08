import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Subjects with class relation. */
const crud = defineCrud({
  model: 'subject',
  module: 'academics',
  searchFields: ['name', 'code', 'teacherName'],
  filterFields: ['classId'],
  defaultSort: { field: 'name', dir: 'asc' },
  required: ['name', 'code'],
  include: { class: true },
  beforeSave: (data: any) => {
    if (data.classId === '') data.classId = null
    if (data.teacherName === '') data.teacherName = null
    if (data.teacherId === '') data.teacherId = null
    if (data.syllabusUrl === '') data.syllabusUrl = null
    if (data.maxMarks !== undefined && data.maxMarks !== null && data.maxMarks !== '') data.maxMarks = Number(data.maxMarks)
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
