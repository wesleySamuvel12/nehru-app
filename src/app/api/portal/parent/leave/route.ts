import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { notifyRoles } from '@/lib/notify'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/portal/parent/leave — fallback leave request creator.
 * The canonical endpoint is /api/attendance/leave (Attendance module); this route
 * guarantees parents can always submit leave even before that module is live.
 * Body: { requesterId (studentId), requesterName, type, fromDate, toDate, reason }
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  const isStaff = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(session.role)
  if (session.role !== 'PARENT' && !isStaff) {
    return err(403, 'Only parent accounts can use this endpoint.')
  }

  try {
    const body = await req.json()
    const studentId = String(body.requesterId || '')
    const fromDate = body.fromDate ? new Date(body.fromDate) : null
    const toDate = body.toDate ? new Date(body.toDate) : null
    const reason = String(body.reason || '').trim()
    const type = String(body.type || 'OTHER')

    if (!studentId || !fromDate || !toDate || reason.length < 5) {
      return err(400, 'Please provide the student, date range and a short reason.')
    }
    const child = session.parentId
      ? await db.student.findFirst({ where: { id: studentId, parentId: session.parentId } })
      : await db.student.findUnique({ where: { id: studentId } })
    if (!child) return err(403, 'Leave can only be requested for active students.')
    if (toDate < fromDate) return err(400, 'The “to” date cannot be before the “from” date.')

    const row = await db.leaveRequest.create({
      data: {
        requesterType: 'STUDENT',
        requesterId: child.id,
        requesterName: `${child.firstName} ${child.lastName}`,
        type: ['SICK', 'CASUAL', 'PRIVILEGE', 'MATERNITY', 'EMERGENCY', 'OTHER'].includes(type) ? type : 'OTHER',
        fromDate, toDate, reason,
        status: 'PENDING',
      },
    })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'LeaveRequest', entityId: row.id,
      details: { student: row.requesterName, fromDate, toDate, reason },
      ip: req.headers.get('x-forwarded-for'),
    })
    await notifyRoles(['TEACHER', 'PRINCIPAL'], 'New leave request', `${row.requesterName} — ${type.toLowerCase()} leave ${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}.`, { type: 'INFO' })

    return json({ data: row }, 201)
  } catch (e: any) {
    console.error('[portal:parent:leave]', e)
    return err(500, 'Could not submit the leave request. Please try again.')
  }
}
