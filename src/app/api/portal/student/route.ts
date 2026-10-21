import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY = 86400000
const dayKey = (d: any) => {
  if (!d) return ''
  try {
    const dt = d instanceof Date ? d : new Date(d)
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/** GET /api/portal/student — one aggregated payload for the Student Portal */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  let studentId = session.studentId

  if (!studentId && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(session.role)) {
    const sampleStudent = await db.student.findFirst({ where: { ...schoolWhere, status: 'ACTIVE' } }) || await db.student.findFirst({ where: schoolWhere })
    if (sampleStudent) studentId = sampleStudent.id
  }

  if (!studentId) {
    if (session.role === 'STUDENT') {
      return err(403, 'Your account is not linked to a student profile. Please contact the school office.')
    }
    return err(404, 'No student profiles found in the database. Please add a student record first.')
  }

  try {
    let student = await db.student.findFirst({
      where: { id: studentId, ...schoolWhere },
      include: { klass: true, section: true },
    })
    if (!student && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(session.role)) {
      student = await db.student.findFirst({
        where: { ...schoolWhere, status: 'ACTIVE' },
        include: { klass: true, section: true },
      })
    }
    if (!student) return err(404, 'Student profile not found.')

    const since30 = new Date(Date.now() - 30 * DAY)
    const now = new Date()

    const [timetableSlots, subjects, employees, assignments, mySubmissions, attRows, reportCards, announcements, events] = await Promise.all([
      student.sectionId
        ? db.timetableSlot.findMany({ where: { sectionId: student.sectionId, ...schoolWhere }, orderBy: { period: 'asc' } })
        : Promise.resolve([]),
      db.subject.findMany({ where: schoolWhere, select: { id: true, name: true, maxMarks: true } }),
      db.employee.findMany({ where: schoolWhere, select: { id: true, firstName: true, lastName: true } }),
      db.assignment.findMany({
        where: {
          ...schoolWhere,
          classId: student.classId || '___',
          ...(student.sectionId ? { sectionId: student.sectionId } : {}),
          status: 'PUBLISHED',
        },
        orderBy: { dueDate: 'desc' },
        take: 12,
      }),
      db.submission.findMany({ where: { studentId: student.id } }),
      db.attendance.findMany({
        where: { studentId: student.id, date: { gte: since30 }, status: { not: 'HOLIDAY' } },
        orderBy: { date: 'desc' },
      }),
      db.reportCard.findMany({ where: { studentId: student.id, published: true }, orderBy: { generatedAt: 'desc' }, take: 3 }),
      db.announcement.findMany({
        where: { ...schoolWhere, status: 'PUBLISHED', audience: { in: ['STUDENTS', 'ALL'] } },
        orderBy: { publishAt: 'desc' },
        take: 5,
      }),
      db.event.findMany({
        where: { ...schoolWhere, startDate: { gte: now }, audience: { in: ['STUDENTS', 'ALL'] }, status: { in: ['SCHEDULED', 'ONGOING'] } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
    ])

    const subjectNameOf = new Map(subjects.map((s: any) => [s.id, s.name]))
    const employeeNameOf = new Map(employees.map((e: any) => [e.id, `${e.firstName} ${e.lastName}`]))
    const examIds = [...new Set(reportCards.map((r: any) => r.examId))]
    const exams = examIds.length ? await db.exam.findMany({ where: { id: { in: examIds }, ...schoolWhere }, select: { id: true, name: true } }) : []
    const examNameOf = new Map(exams.map((e: any) => [e.id, e.name]))

    /* Timetable grid */
    const periods: { period: number; startTime: string; endTime: string }[] = []
    const seenPeriods = new Set<number>()
    timetableSlots.forEach((slot: any) => {
      if (!seenPeriods.has(slot.period)) {
        seenPeriods.add(slot.period)
        periods.push({ period: slot.period, startTime: slot.startTime, endTime: slot.endTime })
      }
    })
    periods.sort((a, b) => a.period - b.period)
    const timetable = timetableSlots.map((slot: any) => ({
      dayOfWeek: slot.dayOfWeek, period: slot.period,
      startTime: slot.startTime, endTime: slot.endTime, room: slot.room,
      subject: subjectNameOf.get(slot.subjectId || '') || 'Free period',
      teacher: slot.teacherId ? employeeNameOf.get(slot.teacherId) || null : null,
    }))

    /* Homework + my submissions */
    const submissionOf = new Map(mySubmissions.map((x: any) => [x.assignmentId, x]))
    const homework = assignments.map((a: any) => {
      const sub = submissionOf.get(a.id)
      return {
        id: a.id, title: a.title, description: a.description, type: a.type,
        subject: subjectNameOf.get(a.subjectId) || 'Subject',
        teacherName: a.teacherName, dueDate: a.dueDate, maxMarks: a.maxMarks,
        daysLeft: Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / DAY),
        submission: sub ? {
          status: sub.status, contentText: sub.contentText, submittedAt: sub.submittedAt,
          marks: sub.marks, grade: sub.grade, feedback: sub.feedback,
        } : null,
      }
    }).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    /* Attendance */
    const present = attRows.filter((r: any) => r.status === 'PRESENT').length
    const late = attRows.filter((r: any) => r.status === 'LATE').length
    const halfDay = attRows.filter((r: any) => r.status === 'HALF_DAY').length
    const absent = attRows.filter((r: any) => r.status === 'ABSENT' || r.status === 'EXCUSED').length
    const total = attRows.length
    const pct = total ? Math.round(((present + late + halfDay) / total) * 1000) / 10 : 0

    /* Exam results */
    const latestExamId = reportCards[0]?.examId
    const latestMarks = latestExamId
      ? await db.mark.findMany({ where: { studentId: student.id, examId: latestExamId, isAbsent: false } })
      : []
    const subjectMarks = latestMarks.map((m: any) => {
      const max = m.maxMarks || 100
      return {
        subject: subjectNameOf.get(m.subjectId) || 'Subject',
        marks: m.marksObtained, maxMarks: max,
        pct: Math.round((m.marksObtained / max) * 1000) / 10,
        grade: m.grade || null,
      }
    })
    const examResults = {
      reportCards: reportCards.map((rc: any) => ({
        examName: examNameOf.get(rc.examId) || 'Examination',
        obtained: rc.obtained, totalMarks: rc.totalMarks,
        percentage: rc.percentage, grade: rc.grade, rank: rc.rank,
      })),
      subjectMarks,
    }

    /* Library books issued to me */
    const library = await db.libraryTransaction.findMany({
      where: { userType: 'STUDENT', userId: student.id, status: { in: ['ISSUED', 'OVERDUE'] } },
      orderBy: { issueDate: 'desc' },
    })

    /* Next exam for this class */
    const nextSchedule = student.classId
      ? await db.examSchedule.findFirst({
          where: { classId: student.classId, date: { gte: now } },
          orderBy: { date: 'asc' },
        })
      : null
    const nextExamExam = nextSchedule?.examId ? await db.exam.findUnique({ where: { id: nextSchedule.examId }, select: { name: true } }) : null

    return json({
      profile: {
        id: student.id, name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo, rollNo: student.rollNo,
        className: student.klass?.name || null, sectionName: student.section?.name || null,
        house: student.house, photoUrl: student.photoUrl, barcode: student.barcode,
        classTeacher: student.section?.teacherName || null,
      },
      periods, timetable,
      homework,
      attendance: {
        pct, present, late, halfDay, absent, total,
        log: attRows.map((r: any) => ({ date: dayKey(r.date), status: r.status })),
        daily: [...attRows]
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((r: any) => ({
            date: dayKey(r.date),
            pct: r.status === 'PRESENT' ? 100 : r.status === 'LATE' || r.status === 'HALF_DAY' ? 50 : 0,
          })),
      },
      examResults,
      library: library.map((l: any) => ({
        bookTitle: l.bookTitle, issueDate: l.issueDate, dueDate: l.dueDate,
        status: l.status, fine: l.fine, renewals: l.renewals,
      })),
      announcements,
      events,
      kpis: {
        pendingHomework: homework.filter((h: any) => !h.submission).length,
        nextExam: nextSchedule && nextExamExam ? { name: nextExamExam.name, date: nextSchedule.date } : null,
        booksIssued: library.length,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[portal:student]', e)
    return err(500, 'Unable to load your space right now. Please try again.', {
      details: process.env.NODE_ENV !== 'production' ? e?.message : undefined,
    })
  }
}
