import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err, getId } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/**
 * GET /api/portal/teacher/students/[id]
 * Returns full student profile with live academic performance:
 * - Demographics and guardian contact (sensitive financials redacted)
 * - Attendance summary (total sessions, present/absent counts, percentage)
 * - Assignment submissions and pending evaluations
 * - Examination marks and subject breakdown
 * Enforces server-side campus isolation and role verification.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const allowedRoles = ['TEACHER', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']
  if (!allowedRoles.includes(session.role)) {
    return err(403, 'You do not have permission to view student details.')
  }

  const studentId = await getId(ctx)
  if (!studentId) return err(400, 'Student ID is required.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    // 1. Fetch Student Core Record
    const student = await db.student.findFirst({
      where: { id: studentId, ...schoolWhere },
      include: {
        klass: { select: { id: true, name: true, level: true } },
        section: { select: { id: true, name: true, teacherName: true } },
        parent: { select: { id: true, name: true, relation: true, occupation: true, phone: true, email: true } },
      },
    })

    if (!student) {
      return err(404, 'Student profile not found in your school.')
    }

    // Server-side authorization: Teachers can only view records for students in their assigned classes/sections
    if (session.role === 'TEACHER') {
      let teacher: any = null
      if (session.employeeId) {
        teacher = await db.employee.findFirst({
          where: { id: session.employeeId, ...schoolWhere },
        })
      }
      if (!teacher) {
        const user = await db.user.findFirst({
          where: {
            OR: [
              ...(session.sub ? [{ id: session.sub }] : []),
              ...(session.email ? [{ email: session.email }] : []),
            ],
            ...schoolWhere,
          },
          select: { linkedEmployeeId: true, schoolId: true },
        })
        if (user?.linkedEmployeeId) {
          teacher = await db.employee.findFirst({
            where: { id: user.linkedEmployeeId, ...schoolWhere },
          })
        }
      }
      if (!teacher && session.email) {
        const emailPrefix = session.email.split('@')[0]
        teacher = await db.employee.findFirst({
          where: {
            OR: [
              { email: session.email },
              { email: { startsWith: emailPrefix } },
            ],
            ...schoolWhere,
          },
        })
      }

      if (!teacher) {
        return err(403, 'Teacher profile not found for this account.')
      }

      const [homeroomSections, taughtSubjects] = await Promise.all([
        db.section.findMany({ where: { teacherId: teacher.id, ...schoolWhere }, select: { id: true, classId: true } }),
        db.subject.findMany({ where: { teacherId: teacher.id, ...schoolWhere }, select: { classId: true } }),
      ])
      const teacherClassIds = new Set([
        ...homeroomSections.map(s => s.classId),
        ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
      ])
      const teacherSectionIds = new Set(homeroomSections.map(s => s.id))

      const isAuthorized =
        (student.sectionId && teacherSectionIds.has(student.sectionId)) ||
        (student.classId && teacherClassIds.has(student.classId))

      if (!isAuthorized) {
        return err(403, 'You do not have permission to view records for students outside your assigned classes.')
      }
    }

    // 2. Compute Attendance Statistics
    const [attTotal, attPresent, recentAttendance] = await Promise.all([
      db.attendance.count({ where: { studentId } }),
      db.attendance.count({ where: { studentId, status: { in: ['PRESENT', 'HALF_DAY', 'LATE'] } } }),
      db.attendance.findMany({
        where: { studentId },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, date: true, status: true, remarks: true },
      }),
    ])

    const attendanceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100

    // 3. Compute Assignment Submissions & Status
    const [subTotal, subGraded, recentSubmissions] = await Promise.all([
      db.submission.count({ where: { studentId } }),
      db.submission.count({ where: { studentId, status: 'GRADED' } }),
      db.submission.findMany({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, assignmentId: true, status: true, marks: true, grade: true, submittedAt: true },
      }),
    ])

    // Resolve assignment titles
    const subAssignmentIds = recentSubmissions.map(s => s.assignmentId)
    const assignments = subAssignmentIds.length
      ? await db.assignment.findMany({
          where: { id: { in: subAssignmentIds } },
          select: { id: true, title: true, maxMarks: true, dueDate: true },
        })
      : []
    const assignmentMap = new Map(assignments.map(a => [a.id, a]))

    const formattedSubmissions = recentSubmissions.map(s => {
      const a = assignmentMap.get(s.assignmentId)
      return {
        id: s.id,
        title: a?.title || 'Assignment',
        maxMarks: a?.maxMarks || 20,
        marksObtained: s.marks,
        grade: s.grade,
        status: s.status,
        submittedAt: s.submittedAt,
      }
    })

    // 4. Compute Exam Results and Subject Performance
    const recentMarks = await db.mark.findMany({
      where: { studentId },
      orderBy: { id: 'desc' },
      take: 12,
      select: { id: true, examId: true, subjectId: true, marksObtained: true, maxMarks: true, grade: true, isAbsent: true },
    })

    const examIds = [...new Set(recentMarks.map(m => m.examId))]
    const subjectIds = [...new Set(recentMarks.map(m => m.subjectId))]

    const [exams, subjects, reportCard] = await Promise.all([
      examIds.length ? db.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, name: true, type: true } }) : [],
      subjectIds.length ? db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, code: true } }) : [],
      db.reportCard.findFirst({ where: { studentId }, orderBy: { generatedAt: 'desc' } }),
    ])

    const examMap = new Map(exams.map(e => [e.id, e]))
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]))

    const formattedMarks = recentMarks.map(m => ({
      id: m.id,
      examName: examMap.get(m.examId)?.name || 'Exam',
      subjectName: subjectMap.get(m.subjectId) || 'Subject',
      marksObtained: m.marksObtained,
      maxMarks: m.maxMarks,
      percentage: m.maxMarks > 0 ? Math.round((m.marksObtained / m.maxMarks) * 100) : 0,
      grade: m.grade || '—',
      isAbsent: !!m.isAbsent,
    }))

    // Subject performance summary
    const subjectStatsMap = new Map<string, { totalPct: number; count: number; latestGrade: string }>()
    for (const m of recentMarks) {
      if (m.isAbsent || m.maxMarks <= 0) continue
      const subName = subjectMap.get(m.subjectId) || 'Curriculum Subject'
      const pct = Math.round((m.marksObtained / m.maxMarks) * 100)
      const existing = subjectStatsMap.get(subName) || { totalPct: 0, count: 0, latestGrade: m.grade || '—' }
      existing.totalPct += pct
      existing.count += 1
      subjectStatsMap.set(subName, existing)
    }

    const subjectPerformance = Array.from(subjectStatsMap.entries()).map(([subject, stat]) => ({
      subject,
      averagePercentage: Math.round(stat.totalPct / stat.count),
      latestGrade: stat.latestGrade,
      assessmentsCount: stat.count,
    }))

    return json({
      data: {
        student,
        academicPerformance: {
          attendance: {
            totalSessions: attTotal,
            presentCount: attPresent,
            absentCount: attTotal - attPresent,
            attendanceRate,
            recent: recentAttendance,
          },
          assignments: {
            totalSubmissions: subTotal,
            gradedCount: subGraded,
            pendingCount: subTotal - subGraded,
            recent: formattedSubmissions,
          },
          examinations: {
            recentMarks: formattedMarks,
            subjectPerformance,
            latestReportCard: reportCard ? {
              percentage: reportCard.percentage,
              grade: reportCard.grade,
              rank: reportCard.rank,
            } : null,
          },
        },
      },
    })
  } catch (error) {
    console.error('[portal:teacher:students:detail error]', error)
    return err(500, 'Unable to load student academic details.')
  }
}
