import { NextRequest } from 'next/server'
import { defineCrud, json, err } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'
import { resolveTenantContext } from '@/lib/tenant'
import { db } from '@/lib/db'
import { checkTimetableConflict } from './conflict'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Weekly period times (Mon–Sat, 7 periods) — matches the seeded timetable. */
export const PERIOD_TIMES = [
  '08:00-08:45',
  '08:45-09:30',
  '09:45-10:30',
  '10:30-11:15',
  '11:45-12:30',
  '12:30-13:15',
  '13:45-14:30',
]

const crud = defineCrud({
  model: 'timetableSlot',
  module: 'academics',
  filterFields: ['classId', 'sectionId', 'teacherId', 'dayOfWeek', 'period'],
  defaultSort: { field: 'period', dir: 'asc' },
  required: ['classId', 'sectionId', 'dayOfWeek', 'period'],
  beforeSave: (data: any) => {
    const period = Number(data.period)
    const day = Number(data.dayOfWeek)
    data.period = isNaN(period) ? 1 : Math.min(7, Math.max(1, period))
    data.dayOfWeek = isNaN(day) ? 1 : Math.min(6, Math.max(1, day))
    const range = (PERIOD_TIMES[data.period - 1] || '08:00-08:45').split('-')
    if (!data.startTime) data.startTime = range[0]
    if (!data.endTime) data.endTime = range[1]
    if (data.subjectId === '') data.subjectId = null
    if (data.teacherId === '') data.teacherId = null
    if (data.room === '') data.room = null
    return data
  },
})

export const GET = crud.list

export async function POST(req: NextRequest) {
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
      'Teachers cannot modify the master timetable. Only Academic Administrators (Principal / Coordinator) can schedule periods.'
    )
  }

  const tenantRes = await resolveTenantContext(req, session)
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  let body: any
  try {
    body = await req.json()
  } catch {
    return err(400, 'Invalid JSON body')
  }

  const period = Number(body.period)
  const dayOfWeek = Number(body.dayOfWeek)

  if (!body.classId || !body.sectionId || isNaN(period) || isNaN(dayOfWeek)) {
    return err(400, 'classId, sectionId, dayOfWeek, and period are required.')
  }

  const conflict = await checkTimetableConflict({
    schoolId: tenant.schoolId,
    dayOfWeek,
    period,
    classId: body.classId,
    sectionId: body.sectionId,
    teacherId: body.teacherId || null,
    room: body.room || null,
  })

  if (conflict) {
    return err(409, conflict)
  }

  const range = (PERIOD_TIMES[period - 1] || '08:00-08:45').split('-')
  const newSlot = await db.timetableSlot.create({
    data: {
      schoolId: tenant.schoolId,
      classId: body.classId,
      sectionId: body.sectionId,
      subjectId: body.subjectId || null,
      teacherId: body.teacherId || null,
      dayOfWeek,
      period,
      startTime: body.startTime || range[0],
      endTime: body.endTime || range[1],
      room: body.room || null,
    },
  })

  return json({ data: newSlot }, 201)
}
