import { defineCrud } from '@/lib/crud'

/** Vaccination drives — recorded doses per student. */
const crud = defineCrud({
  model: 'vaccination',
  module: 'health',
  searchFields: ['vaccine', 'administeredBy'],
  filterFields: ['status', 'studentId'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['studentId', 'vaccine'],
  beforeSave: async (data: any, session, mode) => {
    if (mode !== 'create') return data
    if (!data.administeredBy) data.administeredBy = session?.name || 'Clinic Staff'
    if (!data.status) data.status = 'COMPLETED'
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
