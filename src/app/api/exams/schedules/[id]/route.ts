import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { scheduleCrud } from '../_crud'
import { getId, err } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'
import { getTeacherExamContext } from '../../_auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return scheduleCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid schedule ID.')

  if (session.role === 'TEACHER') {
    const teacherCtx = await getTeacherExamContext(session, session.schoolId)
    if (!teacherCtx) return err(403, 'Teacher profile not found.')

    const schedule = await db.examSchedule.findUnique({ where: { id } })
    if (!schedule) return err(404, 'Exam schedule paper not found.')

    if (!teacherCtx.teacherSubjectIds.includes(schedule.subjectId) && schedule.invigilatorId !== teacherCtx.teacher.id) {
      return err(403, 'You do not have permission to modify this exam schedule.')
    }
  }

  return scheduleCrud.update(req, id)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const id = await getId(ctx)
  if (!id) return err(400, 'Invalid schedule ID.')

  if (session.role === 'TEACHER') {
    return err(403, 'Teachers do not have permission to delete examination schedule papers.')
  }

  return scheduleCrud.remove(req, id)
}
