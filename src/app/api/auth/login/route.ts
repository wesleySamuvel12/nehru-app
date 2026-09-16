import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession, SESSION_COOKIE, Session } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { can } from '@/lib/rbac'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export function defaultModuleFor(s: Session): string {
  switch (s.role) {
    case 'SUPER_ADMIN':
    case 'SCHOOL_ADMIN':
    case 'PRINCIPAL':
      return 'dashboard'
    case 'TEACHER':
      return 'academics'
    case 'ACCOUNTANT':
      return 'fees'
    case 'HR':
      return 'hr'
    case 'COUNSELLOR':
      return 'admissions'
    case 'LIBRARIAN':
      return 'library'
    case 'TRANSPORT':
      return 'transport'
    case 'WARDEN':
      return 'hostel'
    case 'NURSE':
      return 'health'
    case 'SECURITY':
      return 'security'
    case 'PARENT':
      return 'parent-portal'
    case 'STUDENT':
      return 'student-portal'
    default:
      return can(s.role, 'dashboard') ? 'dashboard' : 'events'
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password, selectedLoginType, remember } = body || {}
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    const ip = req.headers.get('x-forwarded-for') || 'local'
    const userAgent = req.headers.get('user-agent') || ''

    const normalizedEmail = String(email).toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    const failLog = async (reason: string) => {
      try {
        await db.loginLog.create({ data: { email: normalizedEmail, userId: user?.id, success: false, reason, ip, userAgent } })
      } catch (err) {
        console.error('[failLog error]', err)
      }
    }

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

    // Optional Role Selector validation against user's actual registered role
    if (selectedLoginType && selectedLoginType !== 'Auto') {
      const roleMap: Record<string, string[]> = {
        Student: ['STUDENT'],
        Parent: ['PARENT'],
        Teacher: ['TEACHER'],
        Staff: ['ACCOUNTANT', 'HR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY', 'COUNSELLOR'],
        Administration: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'],
      }
      const allowedRoles = roleMap[selectedLoginType]
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        await failLog(`Role mismatch (${selectedLoginType} vs ${user.role})`)
        return NextResponse.json({
          error: `These credentials are not registered as a ${selectedLoginType} account.`,
        }, { status: 403 })
      }
    }

    if (!user.passwordHash) {
      await failLog('Missing password hash')
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const ok = await verifyPassword(String(password), user.passwordHash)
    if (!ok) {
      const failedAttempts = (user.failedAttempts || 0) + 1
      const lockedUntil = failedAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null
      try {
        await db.user.update({ where: { id: user.id }, data: { failedAttempts, lockedUntil } })
      } catch (err) {
        console.error('[user.update failedAttempts error]', err)
      }
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
    try {
      await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })
      await db.loginLog.create({ data: { email: normalizedEmail, userId: user.id, success: true, ip, userAgent } })
      await audit({ userId: user.id, userName: user.name, userRole: user.role, action: 'LOGIN', entity: 'Auth', entityId: user.id, ip })
    } catch (err) {
      console.error('[login success logging error]', err)
    }

    const res = NextResponse.json({ data: session, token, defaultModule: defaultModuleFor(session) })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: remember ? 7 * 24 * 3600 : 24 * 3600, secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (e) {
    console.error('[login server error]', e)
    return NextResponse.json({ error: 'Sign-in failed due to a server error. Please try again.' }, { status: 500 })
  }
}
