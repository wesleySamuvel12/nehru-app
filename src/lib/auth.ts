import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'erp_session'
const MIN_SECRET_LENGTH = 32

let hasWarnedMissingDevSecret = false

/**
 * Returns the secret key for signing and verifying JWT session tokens.
 * - In production: Throws a secure error if AUTH_SECRET is missing or < 32 chars.
 * - In development/test: Emits a console warning if unset and falls back to a temporary dev key.
 * Secrets are never logged or exposed in API responses.
 */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Security Error] AUTH_SECRET is not configured. Set a secure random string of at least 32 characters in production.'
      )
    }

    if (!hasWarnedMissingDevSecret) {
      console.warn(
        '[auth] Warning: AUTH_SECRET is not set in development. Using temporary development key. Set AUTH_SECRET in your .env file.'
      )
      hasWarnedMissingDevSecret = true
    }
    return new TextEncoder().encode('development-only-insecure-secret-key-must-set-in-env-32-chars')
  }

  if (process.env.NODE_ENV === 'production' && secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[Security Error] AUTH_SECRET is too short (${secret.length} characters). It must be at least ${MIN_SECRET_LENGTH} characters in production.`
    )
  }

  return new TextEncoder().encode(secret)
}

export interface Session {
  sub: string
  name: string
  email: string
  role: string
  studentId?: string | null
  parentId?: string | null
  employeeId?: string | null
  schoolId?: string | null
  schoolCode?: string | null
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10)
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}

export async function signSession(session: Session, expiresIn = '7d') {
  const secret = getAuthSecret()
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const secret = getAuthSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function getSessionFromReq(req: NextRequest): Promise<Session | null> {
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  return verifySessionToken(token)
}

/** Returns session or null. Use in API routes. */
export async function requireAuth(req: NextRequest): Promise<Session | null> {
  return getSessionFromReq(req)
}

/** Standard secure cookie options for session token handling */
export function getSessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: remember ? 7 * 24 * 3600 : 24 * 3600,
    secure: process.env.NODE_ENV === 'production',
  }
}

export { cookies }
