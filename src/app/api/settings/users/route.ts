import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, requireAuth } from '@/lib/auth'
import { can, ROLES } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { defineCrud, json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const crud = defineCrud({
  model: 'user',
  module: 'settings',
  searchFields: ['name', 'email'],
  filterFields: ['role', 'status'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  omitFields: ['passwordHash'],
})

/** GET /api/settings/users — paginated user list (password hashes omitted) */
export async function GET(req: NextRequest) {
  return crud.list(req)
}

/** POST /api/settings/users — create a user with a hashed password */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to manage users.')
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = String(body.role || '')
    const phone = body.phone ? String(body.phone).trim() : null

    const missing = [['name', name], ['email', email], ['password', password], ['role', role]].filter(([, v]) => !v).map(([k]) => k)
    if (missing.length) return err(400, `Missing required fields: ${missing.join(', ')}`, { fields: missing })
    if (!ROLES.includes(role as any)) return err(400, 'Invalid role selected.', { fields: ['role'] })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, 'Please enter a valid email address.', { fields: ['email'] })
    if (password.length < 6) return err(400, 'Password must be at least 6 characters.', { fields: ['password'] })

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return err(409, 'A user with this email already exists.', { fields: ['email'] })

    const passwordHash = await hashPassword(password)
    const row = await db.user.create({
      data: { name, email, passwordHash, role, phone, status: 'ACTIVE' },
    })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'User', entityId: row.id,
      details: { name, email, role }, ip: req.headers.get('x-forwarded-for'),
    })
    await notify({
      userId: row.id,
      title: 'Welcome to NIS ERP',
      message: `Your ${role.replace(/_/g, ' ').toLowerCase()} account was created. Sign in with the password shared by the admin.`,
      type: 'SUCCESS',
    })
    const { passwordHash: _omit, ...safe } = row
    return json({ data: safe }, 201)
  } catch (e: any) {
    if (String(e?.code) === 'P2002') return err(409, 'A user with this email already exists.', { fields: ['email'] })
    console.error('[settings:users:create]', e)
    return err(500, 'Could not create the user. Please try again.')
  }
}
