import { defineCrud } from '@/lib/crud'
import { notifyParentOfStudent } from './lib'

/**
 * Clinic visits. beforeSave stamps the attending staff from the session;
 * afterCreate notifies the linked parent user when "parent notified" is checked.
 */
const crud = defineCrud({
  model: 'clinicVisit',
  module: 'health',
  searchFields: ['reason', 'diagnosis', 'symptoms', 'medication', 'attendedBy'],
  filterFields: ['severity', 'studentId', 'dateFrom', 'dateTo'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['studentId', 'reason'],
  beforeSave: async (data: any, session, mode) => {
    if (mode !== 'create') return data
    if (!data.attendedBy) data.attendedBy = session?.name || 'Clinic Staff'
    if (!data.attendedById) data.attendedById = session?.sub || null
    if (!data.date) data.date = new Date()
    return data
  },
  afterCreate: async (row: any) => {
    if (row.parentNotified) {
      await notifyParentOfStudent(
        row.studentId,
        'Clinic visit — parent notified',
        `${row.attendedBy || 'Clinic staff'} attended to your child today for “${row.reason}”. Severity: ${(row.severity || 'MINOR').toLowerCase()}.`,
        row.severity === 'SERIOUS' ? 'DANGER' : row.severity === 'MODERATE' ? 'WARNING' : 'INFO',
      )
    }
  },
})

export const GET = crud.list
export const POST = crud.create
