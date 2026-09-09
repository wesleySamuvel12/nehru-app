import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

function clean(data: any) {
  for (const k of ['leadId', 'parentEmail', 'address', 'previousSchool', 'documentsJson', 'remarks']) {
    if (data[k] === '') data[k] = null
  }
  if (data.dob === '' || data.dob === undefined) data.dob = null
  else if (data.dob) data.dob = new Date(data.dob)
  if (data.testScore === '' || data.testScore === undefined) data.testScore = null
  else if (data.testScore !== null && data.testScore !== undefined) data.testScore = Number(data.testScore)
  if (data.interviewScore === '' || data.interviewScore === undefined) data.interviewScore = null
  else if (data.interviewScore !== null && data.interviewScore !== undefined) data.interviewScore = Number(data.interviewScore)
  return data
}

/** Admission applications. applicationNo auto-generated on create. */
const crud = defineCrud({
  model: 'application',
  module: 'admissions',
  searchFields: ['applicationNo', 'studentName', 'parentName', 'parentPhone'],
  filterFields: ['status', 'classApplied'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['studentName', 'classApplied', 'parentName', 'parentPhone'],
  beforeSave: async (data: any, session: any, mode: 'create' | 'update') => {
    clean(data)
    if (mode === 'create') {
      if (!data.applicationNo) {
        const count = await db.application.count()
        data.applicationNo = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
      }
      if (!data.status) data.status = 'SUBMITTED'
      if (data.gender === undefined || data.gender === '') data.gender = 'MALE'
    }
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
