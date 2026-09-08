import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, requireAuth } from '@/lib/auth'
import { can, ROLES } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { err, json } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET /api/settings/users/:id */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to manage users.')
  const { id } = await ctx.params
  const row = await db.user.findUnique({ where: { id } })
  if (!row) return err(404, 'User not found.')
  const { passwordHash: _omit, ...safe } = row
  return json({ data: safe })
}

/** PATCH /api/settings/users/:id — role, status and optional password reset */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to manage users.')
  const { id } = await ctx.params
  try {
    const before = await db.user.findUnique({ where: { id } })
    if (!before) return err(404, 'User not found.')
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return err(400, 'Invalid role selected.', { fields: ['role'] })
      data.role = body.role
    }
    if (body.status !== undefined) {
      if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(body.status)) return err(400, 'Invalid status.', { fields: ['status'] })
      data.status = body.status
    }
    if (body.password) {
      const pw = String(body.password)
      if (pw.length < 6) return err(400, 'Password must be at least 6 characters.', { fields: ['password'] })
      data.passwordHash = await hashPassword(pw)
    }
    if (!Object.keys(data).length) return err(400, 'Nothing to update. Only role, status or password can be changed.')
    const row = await db.user.update({ where: { id }, data })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'User', entityId: id,
      details: { changes: Object.keys(data) }, ip: req.headers.get('x-forwarded-for'),
    })
    const { passwordHash: _omit, ...safe } = row
    return json({ data: safe })
  } catch (e: any) {
    console.error('[settings:users:patch]', e)
    return err(500, 'Could not update the user. Please try again.')
  }
}

/** DELETE /api/settings/users/:id */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to manage users.')
  const { id } = await ctx.params
  if (id === session.sub) return err(400, 'You cannot delete your own account.')
  try {
    const row = await db.user.delete({ where: { id } })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'DELETE', entity: 'User', entityId: id,
      details: { email: row.email }, ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: { ok: true } })
  } catch (e: any) {
    if (String(e?.code) === 'P2025') return err(404, 'User not found.')
    console.error('[settings:users:delete]', e)
    return err(500, 'Could not delete the user. Please try again.')
  }
}
