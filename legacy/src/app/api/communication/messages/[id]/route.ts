import { NextRequest } from 'next/server'
import { json, err, getId } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'

/** PATCH /api/communication/messages/[id] — recipient marks a message as read. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'communication')) return err(403, 'You do not have permission to access this module.')
  try {
    const id = await getId(ctx)
    const row = await db.message.findUnique({ where: { id } })
    if (!row) return err(404, 'Message not found.')
    if (row.toUserId !== session.sub) return err(403, 'Only the recipient can mark a message as read.')
    if (row.readAt) return json({ data: row })
    const updated = await db.message.update({ where: { id }, data: { readAt: new Date() } })
    return json({ data: updated })
  } catch (e) {
    console.error('[messages:read]', e)
    return err(500, 'Could not update the message. Please try again.')
  }
}
