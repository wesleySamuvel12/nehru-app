import { NextRequest, NextResponse } from 'next/server'
import { leaveCrud } from '../_crud'
import { getId } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'
import { decideLeave, type DecideAction } from '@/lib/leave-workflow'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return leaveCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await getId(ctx)
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 })
  }

  // Clone request to inspect body without consuming the stream if we fall back
  const body = await req.clone().json().catch(() => ({}))
  let action: DecideAction | null = null

  if (body.action) {
    action = String(body.action).toUpperCase() as DecideAction
  } else if (body.status === 'APPROVED') {
    action = 'APPROVE'
  } else if (body.status === 'REJECTED') {
    action = 'REJECT'
  }

  if (action && ['APPROVE', 'REJECT', 'RETURN', 'RESUBMIT', 'WITHDRAW'].includes(action)) {
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

  return leaveCrud.update(req, id)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return leaveCrud.remove(req, await getId(ctx))
}
