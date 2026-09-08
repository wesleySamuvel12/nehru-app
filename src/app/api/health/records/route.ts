import { defineCrud } from '@/lib/crud'

/**
 * Student health records — one per student (studentId unique).
 * Student names are resolved client-side (no schema relation on this model).
 */
const crud = defineCrud({
  model: 'healthRecord',
  module: 'health',
  searchFields: ['bloodGroup', 'allergies', 'chronicConditions', 'emergencyContact'],
  filterFields: ['bloodGroup', 'studentId'],
  defaultSort: { field: 'id', dir: 'desc' },
  required: ['studentId'],
})

export const GET = crud.list
export const POST = crud.create
