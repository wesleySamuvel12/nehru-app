import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err, getId, type IdContext } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'
import { getTeacherLmsContext, isTeacherAuthorizedForAssignment } from '../../_auth'

const VALID_TYPES = ['HOMEWORK', 'ASSIGNMENT', 'PROJECT']
const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED']

/**
 * GET /api/lms/assignments/[id]
 */
export async function GET(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to view assignments.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid assignment ID.')

  try {
    const assignment = await db.assignment.findUnique({ where: { id } })
    if (!assignment) return err(404, 'Assignment not found.')

    if (tenant.schoolId && assignment.schoolId && assignment.schoolId !== tenant.schoolId) {
      return err(404, 'Assignment not found.')
    }

    // Role-based authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to access this assignment.')
      }
    }

    // Enrich relations
    const [cls, sec, sub, statsGroup] = await Promise.all([
      assignment.classId ? db.class.findUnique({ where: { id: assignment.classId }, select: { id: true, name: true } }) : null,
      assignment.sectionId ? db.section.findUnique({ where: { id: assignment.sectionId }, select: { id: true, name: true } }) : null,
      assignment.subjectId ? db.subject.findUnique({ where: { id: assignment.subjectId }, select: { id: true, name: true, code: true } }) : null,
      db.submission.groupBy({
        by: ['status'],
        where: { assignmentId: id },
        _count: true,
      }),
    ])

    const stats = { total: 0, graded: 0, pending: 0 }
    for (const g of statsGroup) {
      stats.total += g._count
      if (g.status === 'GRADED') stats.graded += g._count
      else stats.pending += g._count
    }

    return json({
      data: {
        ...assignment,
        class: cls,
        section: sec,
        subject: sub,
        stats,
      },
    })
  } catch (error) {
    console.error('[api:lms:assignments:detail]', error)
    return err(500, 'Unable to load assignment details.')
  }
}

/**
 * PATCH /api/lms/assignments/[id]
 */
export async function PATCH(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to edit assignments.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid assignment ID.')

  try {
    const assignment = await db.assignment.findUnique({ where: { id } })
    if (!assignment) return err(404, 'Assignment not found.')

    if (tenant.schoolId && assignment.schoolId && assignment.schoolId !== tenant.schoolId) {
      return err(404, 'Assignment not found.')
    }

    // Role-based authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to edit this assignment.')
      }
    }

    const body = await req.json()
    const updateData: any = {}

    if (body.title !== undefined) {
      const title = String(body.title).trim()
      if (!title) return err(400, 'Title cannot be empty.')
      updateData.title = title
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null
    }

    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return err(400, `Invalid assignment type. Allowed types: ${VALID_TYPES.join(', ')}.`)
      }
      updateData.type = body.type
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return err(400, `Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}.`)
      }
      updateData.status = body.status
    }

    if (body.maxMarks !== undefined && body.maxMarks !== null && body.maxMarks !== '') {
      const maxMarks = Number(body.maxMarks)
      if (isNaN(maxMarks) || maxMarks <= 0 || !Number.isInteger(maxMarks)) {
        return err(400, 'Maximum marks must be a positive whole number.')
      }
      updateData.maxMarks = maxMarks
    }

    if (body.dueDate !== undefined) {
      const dueDate = new Date(body.dueDate)
      if (isNaN(dueDate.getTime())) {
        return err(400, 'Invalid due date provided.')
      }
      updateData.dueDate = dueDate
    }

    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl ? String(body.attachmentUrl).trim() : null
    }

    // Updating class, section or subject
    if (body.classId !== undefined) updateData.classId = String(body.classId).trim()
    if (body.sectionId !== undefined) updateData.sectionId = String(body.sectionId).trim()
    if (body.subjectId !== undefined) updateData.subjectId = String(body.subjectId).trim()

    if (session.role === 'TEACHER' && (body.classId || body.subjectId || body.sectionId)) {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (teacherCtx) {
        const checkSubject = updateData.subjectId || assignment.subjectId
        const checkSection = updateData.sectionId || assignment.sectionId
        const isAuthorized =
          teacherCtx.teacherSubjectIds.includes(checkSubject) ||
          teacherCtx.teacherSectionIds.includes(checkSection)
        if (!isAuthorized) {
          return err(403, 'You are not assigned to teach the updated class or subject.')
        }
      }
    }

    const updated = await db.assignment.update({
      where: { id },
      data: updateData,
    })

    await audit({
      schoolId: tenant.schoolId || assignment.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      entity: 'assignment',
      entityId: id,
      details: { changes: Object.keys(updateData) },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: updated })
  } catch (error) {
    console.error('[api:lms:assignments:update]', error)
    return err(500, 'Could not update assignment. Please try again.')
  }
}

/**
 * DELETE /api/lms/assignments/[id]
 */
export async function DELETE(req: NextRequest, ctx: IdContext) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to delete assignments.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid assignment ID.')

  try {
    const assignment = await db.assignment.findUnique({ where: { id } })
    if (!assignment) return err(404, 'Assignment not found.')

    if (tenant.schoolId && assignment.schoolId && assignment.schoolId !== tenant.schoolId) {
      return err(404, 'Assignment not found.')
    }

    // Role-based authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx || !isTeacherAuthorizedForAssignment(assignment, teacherCtx)) {
        return err(403, 'You do not have permission to delete this assignment.')
      }
    }

    // Delete associated submissions first to maintain data integrity in SQLite
    await db.submission.deleteMany({ where: { assignmentId: id } })
    await db.assignment.delete({ where: { id } })

    await audit({
      schoolId: tenant.schoolId || assignment.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'DELETE',
      entity: 'assignment',
      entityId: id,
      details: { title: assignment.title },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { ok: true } })
  } catch (error) {
    console.error('[api:lms:assignments:delete]', error)
    return err(500, 'Could not delete assignment. Please try again.')
  }
}
