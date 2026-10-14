import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { json, err } from '@/lib/crud'


const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED']

interface BulkEntry {
  studentId: string
  status: string
  remarks?: string
  checkInTime?: string
}

/**
 * POST /api/attendance/bulk — mark attendance for a whole class in one shot.
 * Body: { date: 'YYYY-MM-DD', entries: [{ studentId, status, remarks?, checkInTime? }] }
 * Upserts on the [studentId, date] unique key. When a student is marked ABSENT and the
 * parent has not yet been notified, an in-app notification is sent to the parent user.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'attendance')) return err(403, 'You do not have permission to mark attendance.')
  try {
    const body = await req.json()
    const dateStr: string = String(body?.date || '')
    const entries: BulkEntry[] = Array.isArray(body?.entries) ? body.entries : []
    if (!dateStr || !entries.length) return err(400, 'Date and at least one student entry are required.')

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
    if (isNaN(dayStart.getTime())) return err(400, 'Invalid date provided.')

    const studentIds = [...new Set(entries.map(e => e.studentId).filter(Boolean))]
    if (!studentIds.length) return err(400, 'No valid students in the request.')

    const students = await db.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, parentId: true, classId: true, sectionId: true },
    })
    const studentMap = new Map(students.map(s => [s.id, s]))

    const existing = await db.attendance.findMany({
      where: { studentId: { in: studentIds }, date: { gte: dayStart, lte: dayEnd } },
    })
    const existingMap = new Map(existing.map(r => [r.studentId, r]))

    // Parent users (for absence notifications)
    const parentIds = [...new Set(students.map(s => s.parentId).filter(Boolean))] as string[]
    const parentUsers = parentIds.length
      ? await db.user.findMany({ where: { linkedParentId: { in: parentIds }, status: 'ACTIVE' }, select: { id: true, linkedParentId: true } })
      : []
    const userByParent = new Map(parentUsers.map(u => [u.linkedParentId as string, u.id]))

    let saved = 0
    let notified = 0
    for (const entry of entries) {
      const student = studentMap.get(entry.studentId)
      if (!student) continue
      const status = VALID_STATUSES.includes(entry.status) ? entry.status : 'PRESENT'
      const before = existingMap.get(entry.studentId)
      const rowDate = before?.date ?? dayStart
      const data = {
        status,
        remarks: entry.remarks?.trim() || null,
        checkInTime: entry.checkInTime?.trim() || before?.checkInTime || null,
        classId: student.classId,
        sectionId: student.sectionId,
        markedById: session.sub,
        markedBy: session.name,
      }
      const row = await db.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date: rowDate } },
        update: data,
        create: { studentId: student.id, date: rowDate, ...data },
      })
      saved++

      // Absence → notify the linked parent once (notified flag guards duplicates)
      if (status === 'ABSENT' && !row.notified) {
        const parentUserId = student.parentId ? userByParent.get(student.parentId) : undefined
        if (parentUserId) {
          await notify({
            userId: parentUserId,
            title: 'Attendance alert',
            message: `${student.firstName} ${student.lastName} was marked absent on ${dateStr}.`,
            type: 'WARNING',
            link: 'attendance',
          })
          notified++
        }
        await db.attendance.update({ where: { id: row.id }, data: { notified: true } })
      }
    }

    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'Attendance',
      details: { bulk: true, date: dateStr, saved, parentsNotified: notified },
      ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: { saved, notified, date: dateStr } })
  } catch (e) {
    console.error('[attendance:bulk]', e)
    return err(500, 'Could not save attendance. Please try again.')
  }
}
