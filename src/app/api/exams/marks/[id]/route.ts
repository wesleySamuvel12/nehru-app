import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err, getId } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'
import { gradeForPercent } from '../_crud'
import { getTeacherExamContext } from '../../_auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to view marks.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid mark ID.')

  try {
    const mark = await db.mark.findUnique({ where: { id } })
    if (!mark) return err(404, 'Mark record not found.')

    if (tenant.schoolId && mark.schoolId && mark.schoolId !== tenant.schoolId) {
      return err(404, 'Mark record not found.')
    }

    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherExamContext(session, tenant.schoolId)
      if (!teacherCtx) return err(403, 'Teacher profile not found.')
      const isAuthorized = teacherCtx.teacherSubjectIds.includes(mark.subjectId) || mark.enteredById === teacherCtx.teacher.id
      if (!isAuthorized) {
        return err(403, 'You do not have permission to view this student mark record.')
      }
    }

    return json({ data: mark })
  } catch (error) {
    console.error('[api:exams:marks:detail]', error)
    return err(500, 'Unable to load mark record.')
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to edit marks.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid mark ID.')

  try {
    const mark = await db.mark.findUnique({ where: { id } })
    if (!mark) return err(404, 'Mark record not found.')

    if (tenant.schoolId && mark.schoolId && mark.schoolId !== tenant.schoolId) {
      return err(404, 'Mark record not found.')
    }

    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherExamContext(session, tenant.schoolId)
      if (!teacherCtx) return err(403, 'Teacher profile not found.')
      const isAuthorized = teacherCtx.teacherSubjectIds.includes(mark.subjectId) || mark.enteredById === teacherCtx.teacher.id
      if (!isAuthorized) {
        return err(403, 'You do not have permission to edit marks for this subject.')
      }
    }

    const body = await req.json()
    const updateData: any = {}

    const maxMarks = body.maxMarks !== undefined ? Number(body.maxMarks) : mark.maxMarks
    if (isNaN(maxMarks) || maxMarks <= 0) {
      return err(400, 'Maximum marks must be a positive number.')
    }
    updateData.maxMarks = maxMarks

    const isAbsent = body.isAbsent !== undefined ? !!body.isAbsent : mark.isAbsent
    updateData.isAbsent = isAbsent

    if (body.marksObtained !== undefined) {
      if (!isAbsent) {
        const marks = Number(body.marksObtained)
        if (isNaN(marks)) return err(400, 'Marks must be a valid number.')
        if (marks < 0) return err(400, 'Marks cannot be negative.')
        if (marks > maxMarks) return err(400, `Marks cannot exceed the maximum allowed marks (${maxMarks}).`)
        updateData.marksObtained = marks
      } else {
        updateData.marksObtained = 0
      }
    }

    const finalMarks = updateData.marksObtained !== undefined ? updateData.marksObtained : mark.marksObtained
    const pct = maxMarks > 0 ? (finalMarks / maxMarks) * 100 : 0
    updateData.grade = isAbsent ? 'F' : (body.grade || gradeForPercent(pct))

    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks ? String(body.remarks).trim() : null
    }

    const updated = await db.mark.update({
      where: { id },
      data: updateData,
    })

    await audit({
      schoolId: tenant.schoolId || mark.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      entity: 'Mark',
      entityId: id,
      details: { marksObtained: updated.marksObtained, grade: updated.grade, isAbsent: updated.isAbsent },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: updated })
  } catch (error) {
    console.error('[api:exams:marks:update]', error)
    return err(500, 'Could not update marks. Please check the values and try again.')
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to delete marks.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid mark ID.')

  try {
    const mark = await db.mark.findUnique({ where: { id } })
    if (!mark) return err(404, 'Mark record not found.')

    if (tenant.schoolId && mark.schoolId && mark.schoolId !== tenant.schoolId) {
      return err(404, 'Mark record not found.')
    }

    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherExamContext(session, tenant.schoolId)
      if (!teacherCtx) return err(403, 'Teacher profile not found.')
      const isAuthorized = teacherCtx.teacherSubjectIds.includes(mark.subjectId) || mark.enteredById === teacherCtx.teacher.id
      if (!isAuthorized) {
        return err(403, 'You do not have permission to delete marks for this subject.')
      }
    }

    await db.mark.delete({ where: { id } })

    await audit({
      schoolId: tenant.schoolId || mark.schoolId || null,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'DELETE',
      entity: 'Mark',
      entityId: id,
      details: { examId: mark.examId, studentId: mark.studentId, subjectId: mark.subjectId },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { ok: true } })
  } catch (error) {
    console.error('[api:exams:marks:delete]', error)
    return err(500, 'Could not delete mark record.')
  }
}
