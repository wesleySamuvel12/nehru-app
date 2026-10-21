import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'
import { getTeacherLmsContext, isTeacherAuthorizedForAssignment, getTeacherAssignmentScope } from '../_auth'

/**
 * GET /api/lms/submissions
 * Lists submissions with teacher authorization scoping, student search, status filter, and enriched relations.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to access submissions.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10')))
    const all = sp.get('all') === '1'
    const sortBy = sp.get('sortBy') || 'submittedAt'
    const sortDir = (sp.get('sortDir') || 'desc') as 'asc' | 'desc'
    const assignmentId = sp.get('assignmentId')
    const studentId = sp.get('studentId')
    const status = sp.get('status')
    const q = sp.get('q')?.trim()

    const where: any = { ...schoolWhere }

    // Role-based teacher authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx) {
        return json({ data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } })
      }

      if (assignmentId) {
        const assignment = await db.assignment.findUnique({
          where: { id: assignmentId },
          select: { id: true, teacherId: true, subjectId: true, classId: true, sectionId: true, schoolId: true },
        })
        if (!assignment || (tenant.schoolId && assignment.schoolId && assignment.schoolId !== tenant.schoolId)) {
          return err(404, 'Assignment not found.')
        }
        if (!isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
          return err(403, 'You do not have permission to view submissions for this assignment.')
        }
        where.assignmentId = assignmentId
      } else {
        const teacherAssignments = await db.assignment.findMany({
          where: { ...schoolWhere, ...getTeacherAssignmentScope(teacherCtx) },
          select: { id: true },
        })
        const teacherAssignmentIds = teacherAssignments.map(a => a.id)
        if (teacherAssignmentIds.length === 0) {
          return json({ data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } })
        }
        where.assignmentId = { in: teacherAssignmentIds }
      }
    } else if (assignmentId) {
      where.assignmentId = assignmentId
    }

    if (studentId) {
      where.studentId = studentId
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    // Search by student name or admission number
    if (q) {
      const matchingStudents = await db.student.findMany({
        where: {
          ...schoolWhere,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { admissionNo: { contains: q } },
          ],
        },
        select: { id: true },
        take: 200,
      })

      if (matchingStudents.length === 0) {
        return json({ data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } })
      }

      const matchedStudentIds = matchingStudents.map(s => s.id)
      if (where.studentId) {
        if (!matchedStudentIds.includes(where.studentId)) {
          return json({ data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } })
        }
      } else {
        where.studentId = { in: matchedStudentIds }
      }
    }

    const [submissions, total] = await Promise.all([
      db.submission.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        ...(all ? { take: 5000 } : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
      db.submission.count({ where }),
    ])

    if (!submissions.length) {
      return json({
        data: [],
        meta: { page, pageSize: all ? 0 : pageSize, total: 0, totalPages: 0 },
      })
    }

    // Lookups for Students & Assignments
    const targetStudentIds = [...new Set(submissions.map(s => s.studentId).filter(Boolean))]
    const targetAssignmentIds = [...new Set(submissions.map(s => s.assignmentId).filter(Boolean))]

    const [students, assignments] = await Promise.all([
      targetStudentIds.length
        ? db.student.findMany({
            where: { id: { in: targetStudentIds } },
            select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true, sectionId: true },
          })
        : [],
      targetAssignmentIds.length
        ? db.assignment.findMany({
            where: { id: { in: targetAssignmentIds } },
            select: { id: true, title: true, maxMarks: true, dueDate: true, status: true, classId: true, sectionId: true, subjectId: true },
          })
        : [],
    ])

    const sMap = Object.fromEntries(
      students.map(s => [s.id, { ...s, name: `${s.firstName} ${s.lastName}`.trim() }])
    )
    const aMap = Object.fromEntries(assignments.map(a => [a.id, a]))

    const data = submissions.map(sub => ({
      ...sub,
      student: sMap[sub.studentId] || null,
      assignment: aMap[sub.assignmentId] || null,
    }))

    return json({
      data,
      meta: {
        page,
        pageSize: all ? data.length : pageSize,
        total,
        totalPages: all ? 1 : Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[api:lms:submissions:list]', error)
    return err(500, 'Unable to load submissions. Please try again.')
  }
}

/**
 * POST /api/lms/submissions
 * Submits an assignment response for a student.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to submit assignments.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolId = tenant.schoolId!

  try {
    const body = await req.json()
    const assignmentId = String(body.assignmentId || '').trim()
    const studentId = String(body.studentId || '').trim()

    if (!assignmentId || !studentId) {
      return err(400, 'Assignment ID and Student ID are required.')
    }

    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return err(404, 'Assignment not found.')

    if (tenant.schoolId && assignment.schoolId && assignment.schoolId !== tenant.schoolId) {
      return err(404, 'Assignment not found.')
    }

    // Check if student belongs to the same school
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student || (tenant.schoolId && student.schoolId && student.schoolId !== tenant.schoolId)) {
      return err(404, 'Student not found in your campus.')
    }

    const isLate = assignment.dueDate ? new Date().getTime() > new Date(assignment.dueDate).getTime() : false
    const status = isLate ? 'LATE' : 'SUBMITTED'

    const submission = await db.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      update: {
        submittedAt: new Date(),
        contentUrl: body.contentUrl ? String(body.contentUrl).trim() : null,
        contentText: body.contentText ? String(body.contentText).trim() : null,
        status,
      },
      create: {
        schoolId,
        assignmentId,
        studentId,
        submittedAt: new Date(),
        contentUrl: body.contentUrl ? String(body.contentUrl).trim() : null,
        contentText: body.contentText ? String(body.contentText).trim() : null,
        status,
      },
    })

    await audit({
      schoolId,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      entity: 'submission',
      entityId: submission.id,
      details: { assignmentId, studentId, isLate },
      ip: req.headers.get('x-forwarded-for'),
    })

    return NextResponse.json({ data: submission }, { status: 201 })
  } catch (error) {
    console.error('[api:lms:submissions:create]', error)
    return err(500, 'Could not save submission. Please try again.')
  }
}
