import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1'
  const rows = await db.notification.findMany({
    where: { userId: session.sub, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const unread = await db.notification.count({ where: { userId: session.sub, read: false } })
  return NextResponse.json({ data: rows, unread })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body.all) {
    await db.notification.updateMany({ where: { userId: session.sub, read: false }, data: { read: true, readAt: new Date() } })
  } else if (body.id) {
    await db.notification.updateMany({ where: { id: body.id, userId: session.sub }, data: { read: true, readAt: new Date() } })
  }
  return NextResponse.json({ data: { ok: true } })
}
