import { NextRequest } from 'next/server'
import { defineCrud, getId, json, err } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'
import { resolveTenantContext } from '@/lib/tenant'
import { db } from '@/lib/db'
import { checkTimetableConflict } from '../conflict'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'timetableSlot',
  module: 'academics',
  beforeSave: (data: any) => {
    if (data.period !== undefined && data.period !== null && data.period !== '') data.period = Number(data.period)
    if (data.dayOfWeek !== undefined && data.dayOfWeek !== null && data.dayOfWeek !== '') data.dayOfWeek = Number(data.dayOfWeek)
    if (data.subjectId === '') data.subjectId = null
    if (data.teacherId === '') data.teacherId = null
    if (data.room === '') data.room = null
    return data
  },
})

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return crud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Unauthorized')

  const allowedManagement = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PRINCIPAL',
    'PRO',
    'ACADEMIC_COORDINATOR',
    'HEADMISTRESS',
    'HOD',
  ]

  if (!allowedManagement.includes(session.role)) {
    return err(
      403,
      'Teachers cannot modify the master timetable. Only Academic Administrators (Principal / Coordinator) can edit schedule periods.'
    )
  }

  const id = await getId(ctx)
  const tenantRes = await resolveTenantContext(req, session)
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const existingSlot = await db.timetableSlot.findFirst({
    where: { id, ...(tenant.schoolId ? { schoolId: tenant.schoolId } : {}) },
  })

  if (!existingSlot) {
    return err(404, 'Timetable slot not found.')
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return err(400, 'Invalid JSON body')
  }

  const dayOfWeek = body.dayOfWeek !== undefined ? Number(body.dayOfWeek) : existingSlot.dayOfWeek
  const period = body.period !== undefined ? Number(body.period) : existingSlot.period
  const classId = body.classId || existingSlot.classId
  const sectionId = body.sectionId || existingSlot.sectionId
  const teacherId = body.teacherId !== undefined ? (body.teacherId || null) : existingSlot.teacherId
  const room = body.room !== undefined ? (body.room || null) : existingSlot.room

  const conflict = await checkTimetableConflict({
    id,
    schoolId: tenant.schoolId,
    dayOfWeek,
    period,
    classId,
    sectionId,
    teacherId,
    room,
  })

  if (conflict) {
    return err(409, conflict)
  }

  const updated = await db.timetableSlot.update({
    where: { id },
    data: {
      ...(body.dayOfWeek !== undefined ? { dayOfWeek } : {}),
      ...(body.period !== undefined ? { period } : {}),
      ...(body.classId ? { classId } : {}),
      ...(body.sectionId ? { sectionId } : {}),
      ...(body.subjectId !== undefined ? { subjectId: body.subjectId || null } : {}),
      ...(body.teacherId !== undefined ? { teacherId: body.teacherId || null } : {}),
      ...(body.startTime ? { startTime: body.startTime } : {}),
      ...(body.endTime ? { endTime: body.endTime } : {}),
      ...(body.room !== undefined ? { room: body.room || null } : {}),
    },
  })

  return json({ data: updated })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Unauthorized')

  const allowedManagement = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PRINCIPAL',
    'PRO',
    'ACADEMIC_COORDINATOR',
    'HEADMISTRESS',
  ]

  if (!allowedManagement.includes(session.role)) {
    return err(
      403,
      'Teachers cannot delete master timetable slots. Only Academic Administrators can delete schedule periods.'
    )
  }

  return crud.remove(req, await getId(ctx))
}
