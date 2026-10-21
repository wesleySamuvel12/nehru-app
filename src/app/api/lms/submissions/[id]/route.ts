import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err, getId, type IdContext } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'
import { getTeacherLmsContext, isTeacherAuthorizedForAssignment } from '../../_auth'

/**
 * GET /api/lms/submissions/[id]
 */
export async function GET(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to view submissions.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid submission ID.')

  try {
    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) return err(404, 'Submission not found.')

    if (tenant.schoolId && submission.schoolId && submission.schoolId !== tenant.schoolId) {
      return err(404, 'Submission not found.')
    }

    const assignment = await db.assignment.findUnique({ where: { id: submission.assignmentId } })
    if (!assignment) return err(404, 'Associated assignment not found.')

    // Role-based authorization for teachers
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to view this submission.')
      }
    }

    const student = await db.student.findUnique({
      where: { id: submission.studentId },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
    })

    return json({
      data: {
        ...submission,
        student: student ? { ...student, name: `${student.firstName} ${student.lastName}`.trim() } : null,
        assignment,
      },
    })
  } catch (error) {
    console.error('[api:lms:submissions:detail]', error)
    return err(500, 'Unable to load submission.')
  }
}

/**
 * PATCH /api/lms/submissions/[id]
 * Grades a submission: validates marks against assignment.maxMarks and updates status to GRADED.
 */
export async function PATCH(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to grade submissions.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid submission ID.')

  try {
    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) return err(404, 'Submission not found.')

    if (tenant.schoolId && submission.schoolId && submission.schoolId !== tenant.schoolId) {
      return err(404, 'Submission not found.')
    }

    const assignment = await db.assignment.findUnique({ where: { id: submission.assignmentId } })
    if (!assignment) return err(404, 'Associated assignment not found.')

    // Role-based authorization for teachers
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to grade submissions for this assignment.')
      }
    }

    const body = await req.json()
    const updateData: any = {}

    // Marks validation
    if (body.marks !== undefined) {
      if (body.marks === null || body.marks === '') {
        updateData.marks = null
      } else {
        const marks = Number(body.marks)
        if (isNaN(marks)) {
          return err(400, 'Marks must be a valid number.')
        }
        if (marks < 0) {
          return err(400, 'Marks cannot be negative.')
        }
        if (assignment.maxMarks !== null && assignment.maxMarks !== undefined && marks > assignment.maxMarks) {
          return err(400, `Marks cannot exceed the maximum allowed marks (${assignment.maxMarks}).`)
        }
        updateData.marks = marks
      }
    }

    if (body.grade !== undefined) {
      updateData.grade = body.grade === '' || body.grade === 'none' ? null : String(body.grade).trim()
    }

    if (body.feedback !== undefined) {
      updateData.feedback = body.feedback === '' ? null : String(body.feedback).trim()
    }

    if (body.contentUrl !== undefined) {
      updateData.contentUrl = body.contentUrl ? String(body.contentUrl).trim() : null
    }

    if (body.contentText !== undefined) {
      updateData.contentText = body.contentText ? String(body.contentText).trim() : null
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    } else if (updateData.marks !== undefined && updateData.marks !== null) {
      updateData.status = 'GRADED'
    }

    const updated = await db.submission.update({
      where: { id },
      data: updateData,
    })

    await audit({
      schoolId: tenant.schoolId || submission.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      entity: 'submission',
      entityId: id,
      details: {
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        marks: updateData.marks,
        grade: updateData.grade,
        status: updateData.status,
      },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: updated })
  } catch (error) {
    console.error('[api:lms:submissions:grade]', error)
    return err(500, 'Could not save grade. Please check the values and try again.')
  }
}

/**
 * DELETE /api/lms/submissions/[id]
 */
export async function DELETE(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to delete submissions.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid submission ID.')

  try {
    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) return err(404, 'Submission not found.')

    if (tenant.schoolId && submission.schoolId && submission.schoolId !== tenant.schoolId) {
      return err(404, 'Submission not found.')
    }

    const assignment = await db.assignment.findUnique({ where: { id: submission.assignmentId } })
    if (!assignment) return err(404, 'Associated assignment not found.')

    // Role-based authorization for teachers
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to delete this submission.')
      }
    }

    await db.submission.delete({ where: { id } })

    await audit({
      schoolId: tenant.schoolId || submission.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'DELETE',
      entity: 'submission',
      entityId: id,
      details: { assignmentId: submission.assignmentId, studentId: submission.studentId },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { ok: true } })
  } catch (error) {
    console.error('[api:lms:submissions:delete]', error)
    return err(500, 'Could not delete submission.')
  }
}
