import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'


/** Audience → user roles mapping for the event-driven notification engine */
const AUDIENCE_ROLES: Record<string, string[]> = {
  STUDENTS: ['STUDENT'],
  PARENTS: ['PARENT'],
  TEACHERS: ['TEACHER'],
  STAFF: ['TEACHER', 'ACCOUNTANT', 'HR', 'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
}

const crud = defineCrud({
  model: 'announcement',
  module: 'communication',
  searchFields: ['title', 'body'],
  filterFields: ['type', 'audience', 'priority', 'status'],
  defaultSort: { field: 'publishAt', dir: 'desc' },
  required: ['title', 'body'],
  beforeSave: (data: any, session: any, mode: 'create' | 'update') => {
    if (data.expiresAt === '') data.expiresAt = null
    if (!data.targetClassId || data.targetClassId === 'NONE') data.targetClassId = null
    if (!data.channels) data.channels = 'IN_APP'
    if (data.status === 'PUBLISHED') {
      data.publishedBy = session.name
      data.publishedById = session.sub
      if (mode === 'create' && !data.publishAt) data.publishAt = new Date()
    }
    if (data.publishAt === '') delete data.publishAt
    return data
  },
  afterCreate: async (row: any) => {
    // Event-driven notification engine: fan the published announcement out to the target audience.
    if (row.status !== 'PUBLISHED') return
    try {
      const where: any = { status: 'ACTIVE' }
      const roles = AUDIENCE_ROLES[row.audience]
      if (row.audience !== 'ALL' && roles?.length) where.role = { in: roles }

      let users: { id: string }[] = []
      if (row.audience === 'CLASS' && row.targetClassId) {
        const studs = await db.student.findMany({ where: { classId: row.targetClassId }, select: { id: true, parentId: true } })
        const studentIds = studs.map(s => s.id)
        const parentIds = studs.map(s => s.parentId).filter(Boolean) as string[]
        users = await db.user.findMany({
          where: { status: 'ACTIVE', OR: [{ linkedStudentId: { in: studentIds } }, { linkedParentId: { in: parentIds } }] },
          select: { id: true },
        })
      } else {
        users = await db.user.findMany({ where, select: { id: true } })
      }
      if (!users.length) return

      const nType = row.priority === 'URGENT' ? 'ALERT' : row.priority === 'HIGH' ? 'WARNING' : 'INFO'
      const message = String(row.body || '').slice(0, 300)
      await db.notification.createMany({
        data: users.map((u: { id: string }) => ({
          userId: u.id, title: row.title, message, type: nType, link: 'communication', channel: 'IN_APP',
        })),
      })
      // Simulated multi-channel fan-out (EMAIL / SMS / WHATSAPP / PUSH) recorded for Delivery History.
      const extraChannels = String(row.channels || '')
        .split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== 'IN_APP')
      for (const ch of extraChannels) {
        const sample = users.slice(0, 25) // capped simulation of external gateway deliveries
        await db.notification.createMany({
          data: sample.map((u: { id: string }) => ({
            userId: u.id, title: row.title, message: `[${ch} delivery] ${message.slice(0, 240)}`,
            type: nType, link: 'communication', channel: ch,
          })),
        })
      }
    } catch (e) {
      console.error('[announcements:notify]', e)
    }
  },
})

export const GET = crud.list
export const POST = crud.create
