import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

const PERIOD_TIMES = [
  '08:00 - 08:45',
  '08:45 - 09:30',
  '09:45 - 10:30',
  '10:30 - 11:15',
  '11:45 - 12:30',
  '12:30 - 13:15',
  '13:45 - 14:30',
]

/**
 * GET /api/portal/teacher
 * Aggregated live data for the Teacher Portal Dashboard:
 * - Teacher profile & department
 * - Today's schedule & timetable slots (scoped to teacher)
 * - Assigned classes and student counts
 * - Pending roll calls (scoped to teacher's assigned homeroom / schedule)
 * - Ungraded assignment submissions (strictly scoped to teacher's assignments)
 * - Upcoming examination schedules (scoped to teacher's classes / subjects)
 * - Campus circulars and alerts
 * - Actionable pending tasks
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const allowedRoles = ['TEACHER', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']
  if (!allowedRoles.includes(session.role)) {
    return err(403, 'You do not have permission to access the Teacher Portal.')
  }

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    // 1. Resolve Teacher Employee Record
    let teacher: any = null
    if (session.employeeId) {
      teacher = await db.employee.findFirst({
        where: { id: session.employeeId, ...schoolWhere },
      })
    }

    if (!teacher) {
      if (session.role === 'TEACHER') {
        teacher = await db.employee.findFirst({
          where: { ...schoolWhere, status: 'ACTIVE' },
        })
      } else {
        teacher = await db.employee.findFirst({
          where: { ...schoolWhere, designation: { contains: 'Teacher' } },
        }) || await db.employee.findFirst({
          where: schoolWhere,
        })
      }
    }

    if (!teacher) {
      return err(404, 'Teacher profile not found.')
    }

    const department = teacher.departmentId
      ? await db.department.findUnique({ where: { id: teacher.departmentId }, select: { name: true } })
      : null

    // 2. Resolve Teacher's Assigned Classes, Sections, and Subjects
    const [homeroomSections, taughtSubjects] = await Promise.all([
      db.section.findMany({
        where: { ...schoolWhere, teacherId: teacher.id },
        select: { id: true, name: true, classId: true, capacity: true },
      }),
      db.subject.findMany({
        where: { ...schoolWhere, teacherId: teacher.id },
        select: { id: true, name: true, code: true, classId: true },
      }),
    ])

    const teacherSubjectIds = taughtSubjects.map(s => s.id)
    const teacherClassIds = [
      ...new Set([
        ...homeroomSections.map(s => s.classId),
        ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
      ])
    ]

    const allTeacherSections = await db.section.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { teacherId: teacher.id },
          ...(teacherClassIds.length ? [{ classId: { in: teacherClassIds } }] : []),
        ],
      },
      select: { id: true, name: true, classId: true, teacherId: true, capacity: true },
    })
    const teacherSectionIds = allTeacherSections.map(s => s.id)

    // Count enrolled active students across teacher's assigned sections
    const assignedStudentsCount = teacherSectionIds.length
      ? await db.student.count({
          where: {
            ...schoolWhere,
            sectionId: { in: teacherSectionIds },
            status: 'ACTIVE',
          },
        })
      : 0

    // 3. Determine Day of Week (1 = Mon ... 6 = Sat, 0 = Sun -> default to 1 on weekends)
    const now = new Date()
    const jsDay = now.getDay()
    const currentDayOfWeek = jsDay === 0 ? 1 : Math.min(6, jsDay)

    // Today's Timetable Slots for this Teacher
    const teacherSlotWhere: any = {
      ...schoolWhere,
      dayOfWeek: currentDayOfWeek,
      OR: [
        { teacherId: teacher.id },
        ...(teacherSubjectIds.length ? [{ subjectId: { in: teacherSubjectIds } }] : []),
      ],
    }

    const rawSlots = await db.timetableSlot.findMany({
      where: teacherSlotWhere,
      orderBy: { period: 'asc' },
    })

    // Batch resolve lookups for classes, sections, subjects
    const slotClassIds = [...new Set(rawSlots.map(s => s.classId).filter(Boolean))]
    const slotSectionIds = [...new Set(rawSlots.map(s => s.sectionId).filter(Boolean))]
    const slotSubjectIds = [...new Set(rawSlots.map(s => s.subjectId).filter(Boolean))] as string[]

    const [slotClasses, slotSections, slotSubjects] = await Promise.all([
      slotClassIds.length ? db.class.findMany({ where: { id: { in: slotClassIds } }, select: { id: true, name: true } }) : [],
      slotSectionIds.length ? db.section.findMany({ where: { id: { in: slotSectionIds } }, select: { id: true, name: true } }) : [],
      slotSubjectIds.length ? db.subject.findMany({ where: { id: { in: slotSubjectIds } }, select: { id: true, name: true, code: true } }) : [],
    ])

    const classMap = new Map(slotClasses.map(c => [c.id, c.name]))
    const sectionMap = new Map(slotSections.map(s => [s.id, s.name]))
    const subjectMap = new Map(slotSubjects.map(s => [s.id, s.name]))

    const timetableToday = rawSlots.map((s: any) => ({
      id: s.id,
      period: s.period,
      time: PERIOD_TIMES[s.period - 1] || `${s.startTime || ''} - ${s.endTime || ''}`,
      className: classMap.get(s.classId) || 'Class',
      sectionName: sectionMap.get(s.sectionId) || 'A',
      subject: s.subjectId ? (subjectMap.get(s.subjectId) || 'General') : 'General',
      room: s.room || `Room ${100 + s.period}`,
    }))

    // 4. Attendance Roll Call Status for Today (Scoped to Teacher's Responsibility)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Check attendance records submitted today
    const attendanceToday = await db.attendance.groupBy({
      by: ['classId', 'sectionId'],
      where: {
        ...schoolWhere,
        date: { gte: todayStart, lte: todayEnd },
      },
      _count: true,
    })
    const recordedSectionKeys = new Set(attendanceToday.map((r: any) => `${r.classId}_${r.sectionId}`))

    // If teacher is a Homeroom Class Teacher: their homeroom sections require daily roll call.
    // If teacher is not a homeroom teacher: check if they have scheduled classes today requiring period roll call.
    let pendingSections: any[] = []
    if (homeroomSections.length > 0) {
      pendingSections = homeroomSections.filter(sec => !recordedSectionKeys.has(`${sec.classId}_${sec.id}`))
    } else if (rawSlots.length > 0) {
      const todaySlotSectionKeys = new Set(rawSlots.map(s => `${s.classId}_${s.sectionId}`))
      pendingSections = allTeacherSections.filter(
        sec => todaySlotSectionKeys.has(`${sec.classId}_${sec.id}`) && !recordedSectionKeys.has(`${sec.classId}_${sec.id}`)
      )
    }

    // Resolve class names for pending sections
    const pendingClassIds = [...new Set(pendingSections.map(s => s.classId))]
    const pendingClasses = pendingClassIds.length
      ? await db.class.findMany({ where: { id: { in: pendingClassIds } }, select: { id: true, name: true } })
      : []
    const pendingClassMap = new Map(pendingClasses.map(c => [c.id, c.name]))
    const attendancePendingCount = pendingSections.length

    // 5. Assignments Awaiting Review & Grading (Strictly Scoped to Teacher's Assignments)
    const teacherAssignments = await db.assignment.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { teacherId: teacher.id },
          ...(teacherSubjectIds.length ? [{ subjectId: { in: teacherSubjectIds } }] : []),
        ],
      },
      select: { id: true, title: true, subjectId: true, classId: true },
    })
    const teacherAssignmentIds = teacherAssignments.map(a => a.id)

    const [assignmentsToGradeCount, pendingSubmissions] = await Promise.all([
      teacherAssignmentIds.length
        ? db.submission.count({
            where: {
              ...schoolWhere,
              assignmentId: { in: teacherAssignmentIds },
              status: { in: ['SUBMITTED', 'RESUBMITTED', 'LATE'] },
            },
          })
        : 0,
      teacherAssignmentIds.length
        ? db.submission.findMany({
            where: {
              ...schoolWhere,
              assignmentId: { in: teacherAssignmentIds },
              status: { in: ['SUBMITTED', 'RESUBMITTED', 'LATE'] },
            },
            select: { id: true, assignmentId: true, studentId: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
            take: 6,
          })
        : [],
    ])

    // Resolve assignment & student names for pending submissions
    const subAssignmentIds = [...new Set(pendingSubmissions.map(s => s.assignmentId))]
    const subStudentIds = [...new Set(pendingSubmissions.map(s => s.studentId))]

    const [subAssignments, subStudents] = await Promise.all([
      subAssignmentIds.length
        ? db.assignment.findMany({ where: { id: { in: subAssignmentIds } }, select: { id: true, title: true } })
        : [],
      subStudentIds.length
        ? db.student.findMany({ where: { id: { in: subStudentIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
    ])
    const assignmentMap = new Map(subAssignments.map(a => [a.id, a.title]))
    const studentMap = new Map(subStudents.map(s => [s.id, `${s.firstName} ${s.lastName}`]))

    // 6. Upcoming Examinations & Assessment Cycles (Scoped to Teacher's Classes & Subjects)
    // First, check future scheduled papers (date >= todayStart)
    const upcomingSchedules = await db.examSchedule.findMany({
      where: {
        ...schoolWhere,
        date: { gte: todayStart },
        OR: [
          ...(teacherSubjectIds.length ? [{ subjectId: { in: teacherSubjectIds } }] : []),
          ...(teacherClassIds.length ? [{ classId: { in: teacherClassIds } }] : []),
          { invigilatorId: teacher.id },
        ],
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    // Also check active/scheduled exams with results pending for the teacher's classes
    const activeExams = await db.exam.findMany({
      where: {
        ...schoolWhere,
        status: { in: ['SCHEDULED', 'PUBLISHED', 'ACTIVE'] },
        resultPublished: false,
      },
      orderBy: { startDate: 'desc' },
      take: 4,
    })

    const teacherActiveExams = activeExams.filter(e => {
      try {
        const cids: string[] = JSON.parse(e.classIds || '[]')
        return cids.some(cid => teacherClassIds.includes(cid))
      } catch {
        return false
      }
    })

    // Lookup class names for teacher classes
    const allClasses = teacherClassIds.length
      ? await db.class.findMany({ where: { id: { in: teacherClassIds } }, select: { id: true, name: true } })
      : []
    const teacherClassMap = new Map(allClasses.map(c => [c.id, c.name]))

    let formattedExams: any[] = []
    if (upcomingSchedules.length > 0) {
      const examIds = [...new Set(upcomingSchedules.map(es => es.examId))]
      const schedSubjectIds = [...new Set(upcomingSchedules.map(es => es.subjectId))]
      const schedClassIds = [...new Set(upcomingSchedules.map(es => es.classId))]

      const [schedExams, schedSubjects, schedClasses] = await Promise.all([
        examIds.length ? db.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, name: true, type: true } }) : [],
        schedSubjectIds.length ? db.subject.findMany({ where: { id: { in: schedSubjectIds } }, select: { id: true, name: true } }) : [],
        schedClassIds.length ? db.class.findMany({ where: { id: { in: schedClassIds } }, select: { id: true, name: true } }) : [],
      ])

      const examLookup = new Map(schedExams.map(e => [e.id, e]))
      const schedSubMap = new Map(schedSubjects.map(s => [s.id, s.name]))
      const schedClsMap = new Map(schedClasses.map(c => [c.id, c.name]))

      formattedExams = upcomingSchedules.map((es: any) => {
        const ex = examLookup.get(es.examId)
        return {
          id: es.id,
          examName: ex?.name || 'Upcoming Exam',
          examType: ex?.type || 'STANDARD',
          subjectName: schedSubMap.get(es.subjectId) || 'Subject',
          className: schedClsMap.get(es.classId) || 'Grade',
          date: es.date,
          startTime: es.startTime || '09:00',
          endTime: es.endTime || '12:00',
          room: es.room || 'Main Hall',
          maxMarks: es.maxMarks,
        }
      })
    } else if (teacherActiveExams.length > 0) {
      formattedExams = teacherActiveExams.map(ex => {
        let classNames = 'Assigned Classes'
        try {
          const cids: string[] = JSON.parse(ex.classIds || '[]')
          const names = cids.map(cid => teacherClassMap.get(cid) || 'Class').filter(Boolean)
          if (names.length) classNames = names.join(', ')
        } catch { /* ignore */ }

        return {
          id: ex.id,
          examName: ex.name,
          examType: ex.type || 'TERM',
          subjectName: `${taughtSubjects[0]?.name || 'Curriculum'} Paper`,
          className: classNames,
          date: ex.startDate,
          startTime: '09:00',
          endTime: '12:00',
          room: 'Exam Desk',
          maxMarks: 100,
        }
      })
    }

    const upcomingExamsCount = upcomingSchedules.length > 0
      ? upcomingSchedules.length
      : teacherActiveExams.length

    // 7. Recent Announcements & Campus Circulars
    const announcements = await db.announcement.findMany({
      where: {
        ...schoolWhere,
        status: 'PUBLISHED',
        audience: { in: ['ALL', 'TEACHERS', 'STAFF'] },
      },
      orderBy: { publishAt: 'desc' },
      take: 4,
    })

    // 8. Recent In-App Notifications for Current Teacher User
    const notifications = await db.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    // 9. Synthesize Actionable Pending Tasks for Teacher
    const pendingTasks: Array<{
      id: string
      title: string
      description: string
      badge: string
      badgeTone: 'danger' | 'warning' | 'info' | 'success'
      targetModule: string
      targetParams?: Record<string, string>
      actionLabel: string
    }> = []

    if (pendingSections.length > 0) {
      const firstSec = pendingSections[0]
      const className = pendingClassMap.get(firstSec.classId) || 'Class'
      pendingTasks.push({
        id: 'task-attendance',
        title: `Submit Daily Roll Call: ${className} - ${firstSec.name}`,
        description: `${pendingSections.length} assigned section${pendingSections.length > 1 ? 's' : ''} awaiting today's attendance record.`,
        badge: 'Attendance Due',
        badgeTone: 'danger',
        targetModule: 'attendance',
        targetParams: { tab: 'mark' },
        actionLabel: 'Mark Attendance',
      })
    }

    if (assignmentsToGradeCount > 0) {
      const topTitle = (pendingSubmissions[0] && assignmentMap.get(pendingSubmissions[0].assignmentId)) || 'Student Work'
      pendingTasks.push({
        id: 'task-grading',
        title: `Grade Submissions (${assignmentsToGradeCount} pending)`,
        description: `Review student submissions for "${topTitle}" and your active assignments.`,
        badge: 'Grading',
        badgeTone: 'warning',
        targetModule: 'lms',
        targetParams: { tab: 'submissions' },
        actionLabel: 'Review Work',
      })
    }

    if (teacherActiveExams.length > 0) {
      const topExam = teacherActiveExams[0]
      pendingTasks.push({
        id: 'task-exam',
        title: `Marks Entry: ${topExam.name}`,
        description: `Scheduled for your classes with results pending publication.`,
        badge: 'Assessments',
        badgeTone: 'info',
        targetModule: 'examinations',
        targetParams: { tab: 'marks' },
        actionLabel: 'Enter Marks',
      })
    }

    if (notifications.some(n => !n.read)) {
      const unreadCount = notifications.filter(n => !n.read).length
      pendingTasks.push({
        id: 'task-notif',
        title: `You have ${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`,
        description: 'Read recent updates and communications from administration.',
        badge: 'Circulars',
        badgeTone: 'info',
        targetModule: 'communication',
        actionLabel: 'View Alerts',
      })
    }

    // 10. Summary KPIs
    const kpis = {
      todayClassesCount: timetableToday.length,
      attendancePendingCount,
      assignmentsToGradeCount,
      upcomingExamsCount,
      assignedClassesCount: teacherClassIds.length,
      activeStudentsCount: assignedStudentsCount,
      isClassTeacher: homeroomSections.length > 0,
      homeroomCount: homeroomSections.length,
    }

    return json({
      data: {
        teacher: {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          designation: teacher.designation || 'Academic Faculty',
          department: department?.name || 'Academic Faculty',
          email: session.email,
          isClassTeacher: homeroomSections.length > 0,
          assignedClassesCount: teacherClassIds.length,
        },
        kpis,
        todayTimetable: timetableToday,
        pendingTasks,
        upcomingExams: formattedExams,
        announcements,
        notifications,
      },
    })
  } catch (error) {
    console.error('[portal:teacher error]', error)
    return err(500, 'Unable to load teacher dashboard data.')
  }
}
