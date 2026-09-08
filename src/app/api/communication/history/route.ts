import { defineCrud } from '@/lib/crud'

/**
 * GET /api/communication/history — delivery history across ALL users (admin view).
 * Read-only: only the list handler is exposed. EMAIL/SMS/WHATSAPP rows are
 * simulated deliveries recorded by the announcement notification engine.
 */
const crud = defineCrud({
  model: 'notification',
  module: 'communication',
  searchFields: ['title', 'message'],
  filterFields: ['channel', 'type'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
})

export const GET = crud.list
