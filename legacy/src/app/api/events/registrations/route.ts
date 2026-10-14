import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notify, notifyRoles } from '@/lib/notify'


const crud = defineCrud({
  model: 'eventRegistration',
  module: 'events',
  filterFields: ['eventId', 'status', 'userId'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['eventId'],
  // Identity always comes from the session — never trust client-provided user fields.
  beforeSave: (data: any, session: any) => {
    delete data.userId
    delete data.userName
    delete data.userType
    data.userId = session.sub
    data.userName = session.name
    data.userType = session.role === 'PARENT' ? 'PARENT' : session.role === 'STUDENT' ? 'STUDENT' : 'STAFF'
    if (!data.status) data.status = 'REGISTERED'
    return data
  },
  afterCreate: async (row: any, session: any) => {
    try {
      const ev = await db.event.findUnique({ where: { id: row.eventId }, select: { id: true, title: true, organizerId: true } })
      const title = ev?.title || 'an event'
      const who = row.userName || session.name
      if (ev?.organizerId) {
        await notify({ userId: ev.organizerId, title: 'New event registration', message: `${who} registered for ${title}.`, type: 'INFO', link: 'events' })
      } else {
        await notifyRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'], 'New event registration', `${who} registered for ${title}.`, { link: 'events' })
      }
    } catch (e) {
      console.error('[eventRegistrations:notify]', e)
    }
  },
})

export const GET = crud.list
export const POST = crud.create
