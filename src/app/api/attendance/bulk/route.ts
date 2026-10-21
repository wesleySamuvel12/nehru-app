import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED']

interface BulkEntry {
  studentId: string
  status: string
  remarks?: string
  checkInTime?: string
}

/**
 * POST /api/attendance/bulk — mark attendance for a whole class or section in one shot.
 * Body: { date: 'YYYY-MM-DD', classId?: string, sectionId?: string, entries: [{ studentId, status, remarks?, checkInTime? }] }
 * Upserts on the [studentId, date] unique key.
 * Enforces strict teacher-to-class row-level security:
 * - Session teacher must be homeroom teacher or assigned subject teacher for the students' classes/sections.
 * - Rejects unauthorized student submissions, cross-class submissions, invalid statuses, and malformed dates.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'attendance')) return err(403, 'You do not have permission to mark attendance.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolId = tenant.schoolId!

  try {
    const body = await req.json()
    const dateStr: string = String(body?.date || '').trim()
    const entries: BulkEntry[] = Array.isArray(body?.entries) ? body.entries : []
    const requestedClassId: string | undefined = body?.classId ? String(body.classId).trim() : undefined
    const requestedSectionId: string | undefined = body?.sectionId ? String(body.sectionId).trim() : undefined

    if (!dateStr || !entries.length) {
      return err(400, 'Date and at least one student entry are required.')
    }

    // Validate ISO date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return err(400, 'Invalid date format. Expected YYYY-MM-DD.')
    }

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
    if (isNaN(dayStart.getTime())) return err(400, 'Invalid date provided.')

    // Prevent marking attendance for distant future dates (> 7 days)
    const maxFuture = new Date()
    maxFuture.setDate(maxFuture.getDate() + 7)
    if (dayStart.getTime() > maxFuture.getTime()) {
      return err(400, 'Cannot record attendance for dates more than 7 days in the future.')
    }

    // Validate individual statuses
    for (const entry of entries) {
      const st = String(entry.status || '').toUpperCase().trim()
      if (!VALID_STATUSES.includes(st)) {
        return err(400, `Invalid attendance status "${entry.status}". Allowed statuses are: ${VALID_STATUSES.join(', ')}.`)
      }
    }

    // Validate unique student IDs
    const studentIds = entries.map(e => String(e.studentId || '').trim()).filter(Boolean)
    if (studentIds.length !== entries.length || new Set(studentIds).size !== studentIds.length) {
      return err(400, 'Duplicate or missing student IDs in attendance submission.')
    }

    // Validate that all students belong to the authorized campus
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, schoolId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, parentId: true, classId: true, sectionId: true },
    })

    if (students.length !== studentIds.length) {
      return err(400, 'One or more students do not belong to your campus, are inactive, or were not found.')
    }

    // Mismatched class/section validation
    if (requestedClassId) {
      const mismatch = students.find(s => s.classId !== requestedClassId)
      if (mismatch) {
        return err(400, `Student ${mismatch.firstName} ${mismatch.lastName} does not belong to the selected class.`)
      }
    }
    if (requestedSectionId) {
      const mismatch = students.find(s => s.sectionId !== requestedSectionId)
      if (mismatch) {
        return err(400, `Student ${mismatch.firstName} ${mismatch.lastName} does not belong to the selected section.`)
      }
    }

    // Server-Side Teacher Authorization Scoping
    if (session.role === 'TEACHER') {
      let teacher: any = null
      if (session.employeeId) {
        teacher = await db.employee.findFirst({
          where: { id: session.employeeId, schoolId },
        })
      }
      if (!teacher) {
        teacher = await db.employee.findFirst({
          where: { schoolId, status: 'ACTIVE' },
        })
      }
      if (!teacher) {
        return err(403, 'Teacher employee profile not found.')
      }

      const [homeroomSections, taughtSubjects] = await Promise.all([
        db.section.findMany({
          where: { schoolId, teacherId: teacher.id },
          select: { id: true, classId: true },
        }),
        db.subject.findMany({
          where: { schoolId, teacherId: teacher.id },
          select: { id: true, classId: true },
        }),
      ])

      const authorizedSectionIds = new Set(homeroomSections.map(s => s.id))
      const authorizedClassIds = new Set([
        ...homeroomSections.map(s => s.classId),
        ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
      ])

      if (requestedClassId && !authorizedClassIds.has(requestedClassId)) {
        return err(403, 'You are not authorized to mark attendance for this class.')
      }
      if (requestedSectionId && !authorizedSectionIds.has(requestedSectionId) && (!requestedClassId || !authorizedClassIds.has(requestedClassId))) {
        return err(403, 'You are not authorized to mark attendance for this section.')
      }

      for (const student of students) {
        const isHomeroom = student.sectionId && authorizedSectionIds.has(student.sectionId)
        const isTaughtClass = student.classId && authorizedClassIds.has(student.classId)
        if (!isHomeroom && !isTaughtClass) {
          return err(403, `You are not authorized to mark attendance for student ${student.firstName} ${student.lastName}.`)
        }
      }
    }

    const studentMap = new Map(students.map(s => [s.id, s]))

    // Find existing attendance rows for the picked day
    const existing = await db.attendance.findMany({
      where: { studentId: { in: studentIds }, schoolId, date: { gte: dayStart, lte: dayEnd } },
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
      const status = String(entry.status).toUpperCase().trim()
      const before = existingMap.get(entry.studentId)
      const rowDate = before?.date ?? dayStart
      const data = {
        schoolId,
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
      schoolId,
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'Attendance',
      details: { bulk: true, date: dateStr, classId: requestedClassId, sectionId: requestedSectionId, saved, parentsNotified: notified },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { saved, notified, date: dateStr } })
  } catch (e) {
    console.error('[attendance:bulk error]', e)
    return err(500, 'Could not save attendance. Please try again.')
  }
}
