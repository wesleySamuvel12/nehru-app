import { db } from '@/lib/db'

export interface ConflictCheckParams {
  id?: string
  schoolId?: string | null
  dayOfWeek: number
  period: number
  classId: string
  sectionId: string
  teacherId?: string | null
  room?: string | null
}

export async function checkTimetableConflict(params: ConflictCheckParams): Promise<string | null> {
  const { id, schoolId, dayOfWeek, period, classId, sectionId, teacherId, room } = params
  const schoolWhere = schoolId ? { schoolId } : {}

  // 1. Check Section Collision (same section, same day, same period)
  const existingSectionSlot = await db.timetableSlot.findFirst({
    where: {
      ...schoolWhere,
      dayOfWeek,
      period,
      classId,
      sectionId,
      ...(id ? { id: { not: id } } : {}),
    },
  })

  if (existingSectionSlot) {
    const [c, s] = await Promise.all([
      db.class.findUnique({ where: { id: classId }, select: { name: true } }),
      db.section.findUnique({ where: { id: sectionId }, select: { name: true } }),
    ])
    const cName = c?.name || 'Class'
    const sName = s?.name || 'Section'
    return `Schedule conflict: ${cName} ${sName} already has a session scheduled for Period ${period} on Day ${dayOfWeek}.`
  }

  // 2. Check Teacher Collision (same teacher, same day, same period)
  if (teacherId) {
    const existingTeacherSlot = await db.timetableSlot.findFirst({
      where: {
        ...schoolWhere,
        dayOfWeek,
        period,
        teacherId,
        ...(id ? { id: { not: id } } : {}),
      },
    })

    if (existingTeacherSlot) {
      const [c, s] = await Promise.all([
        db.class.findUnique({ where: { id: existingTeacherSlot.classId }, select: { name: true } }),
        db.section.findUnique({ where: { id: existingTeacherSlot.sectionId }, select: { name: true } }),
      ])
      const cName = c?.name || 'Class'
      const sName = s?.name || 'Section'
      return `Teacher conflict: The selected faculty is already assigned to ${cName} ${sName} during Period ${period} on Day ${dayOfWeek}.`
    }
  }

  // 3. Check Room Collision (same room, same day, same period)
  if (room && room.trim()) {
    const existingRoomSlot = await db.timetableSlot.findFirst({
      where: {
        ...schoolWhere,
        dayOfWeek,
        period,
        room: room.trim(),
        ...(id ? { id: { not: id } } : {}),
      },
    })

    if (existingRoomSlot) {
      const [c, s] = await Promise.all([
        db.class.findUnique({ where: { id: existingRoomSlot.classId }, select: { name: true } }),
        db.section.findUnique({ where: { id: existingRoomSlot.sectionId }, select: { name: true } }),
      ])
      const cName = c?.name || 'Class'
      const sName = s?.name || 'Section'
      return `Room conflict: Room "${room.trim()}" is already occupied by ${cName} ${sName} in Period ${period} on Day ${dayOfWeek}.`
    }
  }

  return null
}

