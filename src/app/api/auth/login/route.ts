import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession, SESSION_COOKIE, Session } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { can } from '@/lib/rbac'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export function defaultModuleFor(s: Session): string {
  if (s.role === 'PARENT') return 'parent-portal'
  if (s.role === 'STUDENT') return 'student-portal'
  if (!can(s.role, 'dashboard')) return 'events'
  return 'dashboard'
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    const ip = req.headers.get('x-forwarded-for') || 'local'
    const userAgent = req.headers.get('user-agent') || ''

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    const failLog = (reason: string) => db.loginLog.create({ data: { email, userId: user?.id, success: false, reason, ip, userAgent } })

    if (!user) {
      await failLog('Unknown email')
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    if (user.status !== 'ACTIVE') {
      await failLog('Account not active')
      return NextResponse.json({ error: 'Your account is not active. Contact the administrator.' }, { status: 403 })
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      await failLog('Locked account')
      return NextResponse.json({ error: `Account temporarily locked. Try again in ${mins} minute(s).` }, { status: 423 })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      const failedAttempts = user.failedAttempts + 1
      const lockedUntil = failedAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null
      await db.user.update({ where: { id: user.id }, data: { failedAttempts, lockedUntil } })
      await failLog('Wrong password')
      return NextResponse.json({
        error: lockedUntil
          ? `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`
          : `Invalid email or password. ${MAX_ATTEMPTS - failedAttempts} attempt(s) left.`,
      }, { status: 401 })
    }

    const session: Session = {
      sub: user.id, name: user.name, email: user.email, role: user.role,
      studentId: user.linkedStudentId, parentId: user.linkedParentId, employeeId: user.linkedEmployeeId,
    }
    const token = await signSession(session)
    await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })
    await db.loginLog.create({ data: { email, userId: user.id, success: true, ip, userAgent } })
    await audit({ userId: user.id, userName: user.name, userRole: user.role, action: 'LOGIN', entity: 'Auth', entityId: user.id, ip })

    const res = NextResponse.json({ data: session, defaultModule: defaultModuleFor(session) })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600, secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ error: 'Sign-in failed due to a server error. Please try again.' }, { status: 500 })
  }
}
