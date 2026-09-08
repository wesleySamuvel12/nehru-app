import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Weekly period times (Mon–Sat, 7 periods) — matches the seeded timetable. */
export const PERIOD_TIMES = ['08:00-08:45', '08:45-09:30', '09:45-10:30', '10:30-11:15', '11:45-12:30', '12:30-13:15', '13:45-14:30']

const crud = defineCrud({
  model: 'timetableSlot',
  module: 'academics',
  filterFields: ['classId', 'sectionId'],
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
export const POST = crud.create
