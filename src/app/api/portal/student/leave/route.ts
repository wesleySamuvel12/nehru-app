import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { notifyRoles } from '@/lib/notify'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/portal/student/leave — fallback leave request creator for students.
 * The canonical endpoint is /api/attendance/leave (Attendance module).
 * Body: { type, fromDate, toDate, reason }
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (session.role !== 'STUDENT') return err(403, 'Only student accounts can use this endpoint.')
  if (!session.studentId) return err(403, 'Your account is not linked to a student profile.')

  try {
    const body = await req.json()
    const fromDate = body.fromDate ? new Date(body.fromDate) : null
    const toDate = body.toDate ? new Date(body.toDate) : null
    const reason = String(body.reason || '').trim()
    const type = String(body.type || 'OTHER')
    if (!fromDate || !toDate || reason.length < 5) {
      return err(400, 'Please provide the date range and a short reason.')
    }
    if (toDate < fromDate) return err(400, 'The “to” date cannot be before the “from” date.')

    const student = await db.student.findUnique({ where: { id: session.studentId } })
    if (!student) return err(404, 'Student profile not found.')

    const row = await db.leaveRequest.create({
      data: {
        requesterType: 'STUDENT',
        requesterId: student.id,
        requesterName: `${student.firstName} ${student.lastName}`,
        type: ['SICK', 'CASUAL', 'PRIVILEGE', 'MATERNITY', 'EMERGENCY', 'OTHER'].includes(type) ? type : 'OTHER',
        fromDate, toDate, reason,
        status: 'PENDING',
      },
    })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'LeaveRequest', entityId: row.id,
      details: { type, fromDate, toDate }, ip: req.headers.get('x-forwarded-for'),
    })
    await notifyRoles(['TEACHER', 'PRINCIPAL'], 'New leave request', `${row.requesterName} — ${type.toLowerCase()} leave ${fromDate.toLocaleDateString('en-IN')} to ${toDate.toLocaleDateString('en-IN')}.`, { type: 'INFO' })

    return json({ data: row }, 201)
  } catch (e: any) {
    console.error('[portal:student:leave]', e)
    return err(500, 'Could not submit the leave request. Please try again.')
  }
}
