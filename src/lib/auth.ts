import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'school-erp-dev-secret-key-2025-change-me')
export const SESSION_COOKIE = 'erp_session'

export interface Session {
  sub: string
  name: string
  email: string
  role: string
  studentId?: string | null
  parentId?: string | null
  employeeId?: string | null
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10)
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}

export async function signSession(session: Session) {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function getSessionFromReq(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
    || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifySessionToken(token)
}

/** Returns session or null. Use in API routes. */
export async function requireAuth(req: NextRequest): Promise<Session | null> {
  return getSessionFromReq(req)
}

export { cookies }
