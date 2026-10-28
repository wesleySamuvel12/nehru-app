import { NextRequest, NextResponse } from 'next/server'
import { getId } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'
import { decideLeave, type DecideAction } from '@/lib/leave-workflow'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await getId(ctx)
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const action = (body.action || '').toUpperCase() as DecideAction

  if (!action || !['APPROVE', 'REJECT', 'RETURN', 'RESUBMIT', 'WITHDRAW'].includes(action)) {
    return NextResponse.json({ error: 'Valid action (APPROVE, REJECT, RETURN, RESUBMIT, WITHDRAW) is required.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') || null
  const result = await decideLeave({
    session,
    leaveId: id,
    action,
    comments: body.comments || body.remarks || body.returnedReason || null,
    ip,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ data: result.record })
}
