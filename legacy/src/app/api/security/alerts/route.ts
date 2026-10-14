import { defineCrud } from '@/lib/crud'
import { notifyRoles } from '@/lib/notify'

const SEVERITY_ORDER: Record<string, 'INFO' | 'WARNING' | 'DANGER' | 'ALERT'> = { LOW: 'INFO', MEDIUM: 'WARNING', HIGH: 'DANGER', CRITICAL: 'ALERT' }

const crud = defineCrud({
  model: 'securityAlert',
  module: 'security',
  searchFields: ['description', 'location', 'raisedBy'],
  filterFields: ['type', 'severity', 'status'],
  required: ['type', 'description'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  beforeSave: (data: Record<string, unknown>, session: any, mode: 'create' | 'update') => {
    if (mode === 'create') {
      data.raisedById = session.sub
      if (!data.raisedBy) data.raisedBy = session.name
    }
    if (data.location === '') data.location = null
    if (data.resolution === '') data.resolution = null
    if (data.resolvedAt === '') data.resolvedAt = null
    return data
  },
  afterCreate: async (row: any) => {
    await notifyRoles(
      ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'],
      `Security alert — ${String(row.severity || 'MEDIUM')} ${String(row.type || '').replace(/_/g, ' ').toLowerCase()}`,
      row.description,
      { type: SEVERITY_ORDER[row.severity] || 'ALERT', link: 'security' },
    )
  },
})

export const GET = crud.list
export const POST = crud.create
