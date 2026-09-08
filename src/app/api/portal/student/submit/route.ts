import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/portal/student/submit — create or update the student's submission for an assignment.
 * Body: { assignmentId, contentText }
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (session.role !== 'STUDENT') return err(403, 'Only student accounts can submit homework here.')
  if (!session.studentId) return err(403, 'Your account is not linked to a student profile.')

  try {
    const body = await req.json()
    const assignmentId = String(body.assignmentId || '')
    const contentText = String(body.contentText || '').trim()
    if (!assignmentId) return err(400, 'Assignment is required.')
    if (contentText.length < 10) return err(400, 'Please write at least a couple of lines before submitting.')

    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return err(404, 'Assignment not found.')
    if (assignment.classId !== (await db.student.findUnique({ where: { id: session.studentId }, select: { classId: true } }))?.classId) {
      return err(403, 'This assignment does not belong to your class.')
    }

    const existing = await db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: session.studentId } },
    })

    const late = new Date(assignment.dueDate).getTime() < Date.now()
    const data = {
      contentText,
      status: existing?.marks != null ? existing.status : 'SUBMITTED',
    }

    const row = existing
      ? await db.submission.update({ where: { id: existing.id }, data })
      : await db.submission.create({
          data: { assignmentId, studentId: session.studentId, contentText, status: 'SUBMITTED' },
        })

    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: existing ? 'UPDATE' : 'CREATE', entity: 'Submission', entityId: row.id,
      details: { assignment: assignment.title, late }, ip: req.headers.get('x-forwarded-for'),
    })

    return json({
      data: {
        id: row.id, assignmentId: row.assignmentId, status: row.status,
        submittedAt: row.submittedAt, marks: row.marks, grade: row.grade, feedback: row.feedback,
      },
    }, existing ? 200 : 201)
  } catch (e: any) {
    console.error('[portal:student:submit]', e)
    return err(500, 'Could not save your submission. Please try again.')
  }
}
