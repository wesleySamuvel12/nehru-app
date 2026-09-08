import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

const crud = defineCrud({
  model: 'visitor',
  module: 'security',
  searchFields: ['name', 'phone', 'passNo'],
  filterFields: ['purpose', 'status'],
  required: ['name', 'phone', 'personToMeet'],
  defaultSort: { field: 'checkInAt', dir: 'desc' },
  beforeSave: async (data: Record<string, unknown>, _session: unknown, mode: 'create' | 'update') => {
    for (const f of ['idProof', 'vehicleNo', 'notes', 'photoUrl', 'approvedBy']) {
      if (data[f] === '') data[f] = null
    }
    if (mode === 'create' && !data.passNo) {
      const count = await db.visitor.count()
      data.passNo = `PASS-${101 + count}`
    }
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
