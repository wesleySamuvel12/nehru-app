import { NextRequest } from 'next/server'
import { scheduleCrud } from './_crud'
import { requireAuth } from '@/lib/auth'
import { err } from '@/lib/crud'
import { getTeacherExamContext } from '../_auth'

export const GET = scheduleCrud.list

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  if (session.role === 'TEACHER') {
    const teacherCtx = await getTeacherExamContext(session, session.schoolId)
    if (!teacherCtx) return err(403, 'Teacher profile not found.')

    // Check if teacher teaches the subject they are trying to schedule
    try {
      const cloned = req.clone()
      const body = await cloned.json()
      const subjectId = String(body.subjectId || '').trim()
      if (!subjectId || !teacherCtx.teacherSubjectIds.includes(subjectId)) {
        return err(403, 'You are only authorized to schedule papers for your assigned subjects.')
      }
    } catch {
      return err(400, 'Invalid request body.')
    }
  }

  return scheduleCrud.create(req)
}
