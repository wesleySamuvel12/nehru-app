import { NextRequest } from 'next/server'
import { defineCrud, json, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { notify } from '@/lib/notify'


const crud = defineCrud({
  model: 'message',
  module: 'communication',
  required: ['toUserId', 'subject', 'body'],
  beforeSave: async (data: any, session: any) => {
    data.fromUserId = session.sub
    data.fromName = session.name
    data.fromRole = session.role
    if (!data.threadId) data.threadId = [session.sub, data.toUserId].sort().join('_')
    // Fill recipient identity if not supplied by the client
    if (!data.toName || !data.toRole) {
      const to = await db.user.findUnique({ where: { id: data.toUserId }, select: { name: true, role: true } })
      data.toName = data.toName || to?.name || 'Unknown'
      data.toRole = data.toRole || to?.role || 'STAFF'
    }
    data.subject = String(data.subject || 'Message').slice(0, 190)
    return data
  },
  afterCreate: async (row: any) => {
    // In-app notification for the recipient
    await notify({
      userId: row.toUserId,
      title: `New message from ${row.fromName}`,
      message: String(row.body || '').slice(0, 140),
      type: 'INFO',
      link: 'communication',
    })
  },
})

/** GET /api/communication/messages — every message involving me (inbox source), latest 200. */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'communication')) return err(403, 'You do not have permission to access this module.')
  try {
    const rows = await db.message.findMany({
      where: { OR: [{ toUserId: session.sub }, { fromUserId: session.sub }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return json({ data: rows, meta: { page: 1, pageSize: rows.length, total: rows.length, totalPages: 1 } })
  } catch (e) {
    console.error('[messages:list]', e)
    return err(500, 'Unable to load your messages right now. Please try again.')
  }
}

export const POST = crud.create
