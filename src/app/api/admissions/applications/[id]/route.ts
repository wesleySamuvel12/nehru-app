import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'
import { db } from '@/lib/db'
import { notifyRoles } from '@/lib/notify'

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

/**
 * When an application reaches ENROLLED, create the Student record (and Parent
 * if the phone is not already registered) — beforeSave-style conversion logic.
 */
async function createStudentFromApplication(app: any) {
  try {
    // Idempotency guard — a student linked to this application may already exist.
    const dupe = await db.student.findFirst({ where: { notes: { contains: `application ${app.applicationNo}` } } })
    if (dupe) return
    let parentId: string | null = null
    const existingParent = await db.parent.findUnique({ where: { phone: app.parentPhone } }).catch(() => null)
    if (existingParent) {
      parentId = existingParent.id
    } else {
      const parent = await db.parent.create({
        data: {
          name: app.parentName,
          phone: app.parentPhone,
          email: app.parentEmail || null,
          address: app.address || null,
        },
      })
      parentId = parent.id
    }
    const count = await db.student.count()
    const nameParts = String(app.studentName || '').trim().split(/\s+/)
    const firstName = nameParts[0] || 'Student'
    const lastName = nameParts.slice(1).join(' ') || firstName
    const klass = app.classApplied ? await db.class.findFirst({ where: { name: app.classApplied } }) : null
    const student = await db.student.create({
      data: {
        admissionNo: `GWS${String(count + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        gender: app.gender || 'MALE',
        dob: app.dob || null,
        parentId,
        classId: klass?.id || null,
        status: 'ACTIVE',
        admissionDate: new Date(),
        phone: app.parentPhone,
        email: app.parentEmail || null,
        address: app.address || null,
        notes: `Enrolled via application ${app.applicationNo}`,
      },
    })
    await notifyRoles(
      ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'],
      'New student enrolled',
      `${app.studentName} (${student.admissionNo}) was enrolled from application ${app.applicationNo}.`,
      { type: 'SUCCESS', link: 'students' },
    )
  } catch (e) {
    // Never block the status update if conversion fails — logged for follow-up.
    console.error('[applications:convert]', e)
  }
}

const crud = defineCrud({
  model: 'application',
  module: 'admissions',
  beforeSave: async (data: any, session: any, mode: 'create' | 'update') => {
    clean(data)
    if (mode === 'update' && typeof data.status === 'string') {
      data.decidedById = session.sub
      data.decidedByName = session.name
      data.decidedAt = new Date()
    }
    if (mode === 'create' && !data.applicationNo) {
      const count = await db.application.count()
      data.applicationNo = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
    }
    return data
  },
  afterUpdate: async (row: any, _session: any, before: any) => {
    if (before.status !== 'ENROLLED' && row.status === 'ENROLLED') {
      await createStudentFromApplication(row)
    }
  },
})

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.detail(req, await getId(ctx))
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.update(req, await getId(ctx))
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.remove(req, await getId(ctx))
}
