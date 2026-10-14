import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'auditLog',
  module: 'audit-logs',
  searchFields: ['userName', 'entity', 'entityId'],
  filterFields: ['action', 'entity'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
})

export const GET = crud.list
