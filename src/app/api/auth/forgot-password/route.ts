import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { getAuthSecret, hashPassword } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { audit } from '@/lib/audit'

// Rate limiting in memory for password reset requests (per email & IP)
const resetRequests = new Map<string, { count: number; firstAt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = resetRequests.get(key)
  if (!record || now - record.firstAt > RATE_LIMIT_WINDOW_MS) {
    resetRequests.set(key, { count: 1, firstAt: now })
    return true
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }
  record.count += 1
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action = 'request', email, token, newPassword } = body || {}
    const ip = req.headers.get('x-forwarded-for') || 'local'

    // ──────────────────────────── 1. REQUEST RESET TOKEN ────────────────────────────
    if (action === 'request') {
      if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      const normalizedEmail = email.toLowerCase().trim()

      // Rate limit check
      if (!checkRateLimit(`reset:${normalizedEmail}:${ip}`)) {
        return NextResponse.json(
          { error: 'Too many password reset requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        )
      }

      // Safe neutral response to avoid user enumeration
      const neutralResponse = {
        message: 'If an account associated with this email exists, password reset instructions have been dispatched.',
      }

      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, name: true, schoolId: true, passwordHash: true, status: true },
      })

      if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
        // Return neutral response immediately
        return NextResponse.json(neutralResponse)
      }

      // Generate a cryptographically signed, short-lived (15m) single-use token
      const secret = getAuthSecret()
      const resetToken = await new SignJWT({
        sub: user.id,
        email: user.email,
        hashPrefix: user.passwordHash.substring(0, 12),
        purpose: 'password_reset',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret)

      // Send reset instructions via the auditable email service
      const hostUrl = req.nextUrl.origin || 'http://localhost:3000'
      const resetUrl = `${hostUrl}/?action=reset-password&token=${encodeURIComponent(resetToken)}`

      const emailResult = await sendEmail({
        schoolId: user.schoolId,
        to: user.email,
        subject: 'Nehru ERP — Password Reset Request',
        body: `Dear ${user.name},\n\nA request to reset the password for your Nehru ERP account has been received.\n\nTo reset your password, please use the following secure link (valid for 15 minutes):\n${resetUrl}\n\nReset Token:\n${resetToken}\n\nIf you did not request this change, please ignore this email or contact your school administrator immediately.\n\nWarm regards,\nNehru International School Administration`,
        dedupeKey: `pwd-reset-${user.id}-${Math.floor(Date.now() / 300000)}`, // 5-minute dedupe
      })

      return NextResponse.json({
        ...neutralResponse,
        emailStatus: emailResult.status,
        // In non-production environments, expose the token to allow automated testing and verification
        ...(process.env.NODE_ENV !== 'production' ? { resetToken } : {}),
      })
    }

    // ──────────────────────────── 2. CONFIRM PASSWORD RESET ────────────────────────────
    if (action === 'reset') {
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Password reset token is required.' }, { status: 400 })
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters in length.' }, { status: 400 })
      }

      // Verify token
      let payload: any
      try {
        const secret = getAuthSecret()
        const verified = await jwtVerify(token, secret)
        payload = verified.payload
      } catch (err: any) {
        if (err?.code === 'ERR_JWT_EXPIRED') {
          return NextResponse.json({ error: 'This password reset link has expired. Please request a new one.' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Invalid or malformed password reset token.' }, { status: 400 })
      }

      if (payload.purpose !== 'password_reset' || !payload.sub || !payload.hashPrefix) {
        return NextResponse.json({ error: 'Invalid token purpose or payload.' }, { status: 400 })
      }

      // Retrieve user
      const user = await db.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) {
        return NextResponse.json({ error: 'User account not found.' }, { status: 404 })
      }

      // Replay protection: if password was already changed, the hash prefix will no longer match
      if (user.passwordHash.substring(0, 12) !== payload.hashPrefix) {
        return NextResponse.json(
          { error: 'This reset token has already been used or has been invalidated by a subsequent password change.' },
          { status: 400 }
        )
      }

      // Hash and update password
      const newHash = await hashPassword(newPassword)
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          failedAttempts: 0,
          lockedUntil: null,
        },
      })

      await audit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        details: 'Password successfully reset via token authorization',
        ip,
      })

      return NextResponse.json({
        success: true,
        message: 'Password successfully updated. You may now sign in with your new credentials.',
      })
    }

    return NextResponse.json({ error: 'Invalid action. Expected "request" or "reset".' }, { status: 400 })
  } catch (error) {
    console.error('[forgot-password error]', error)
    return NextResponse.json({ error: 'An unexpected server error occurred. Please try again.' }, { status: 500 })
  }
}

