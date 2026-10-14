import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, SESSION_COOKIE, getSessionCookieOptions } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (session) {
    await audit({ userId: session.sub, userName: session.name, userRole: session.role, action: 'LOGOUT', entity: 'Auth', entityId: session.sub })
  }
  const res = NextResponse.json({ data: { ok: true } })
  res.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(), maxAge: 0 })
  return res
}
