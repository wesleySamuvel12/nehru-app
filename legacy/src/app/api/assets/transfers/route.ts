import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Asset transfers. afterCreate keeps the register in sync with the movement:
 * - toType STORE  → asset becomes AVAILABLE, assignment cleared, back to Main Store
 * - otherwise     → asset becomes IN_USE, assigned to the target, location updated
 */
const crud = defineCrud({
  model: 'assetTransfer',
  module: 'assets',
  searchFields: ['toName', 'fromName', 'reason'],
  filterFields: ['assetId', 'toType'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['assetId', 'toType', 'toName'],
  beforeSave: async (data: any, session, mode) => {
    if (mode !== 'create') return data
    if (!data.date) data.date = new Date()
    if (!data.byId) data.byId = session?.sub || null
    if (!data.byName) data.byName = session?.name || null
    if (!data.fromName) data.fromName = 'Main Store'
    return data
  },
  afterCreate: async (row: any) => {
    try {
      if (!row?.assetId) return
      if (row.toType === 'STORE') {
        await db.asset.update({
          where: { id: row.assetId },
          data: { status: 'AVAILABLE', assignedToType: null, assignedToId: null, assignedToName: null, location: 'Main Store' },
        })
      } else {
        await db.asset.update({
          where: { id: row.assetId },
          data: {
            status: 'IN_USE',
            assignedToType: row.toType,
            assignedToId: null,
            assignedToName: row.toName,
            location: row.toName,
          },
        })
      }
    } catch (e) {
      console.error('[assets:transfer:afterCreate]', e)
    }
  },
})

export const GET = crud.list
export const POST = crud.create
