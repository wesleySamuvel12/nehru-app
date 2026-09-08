import { defineCrud } from '@/lib/crud'

export const employeeAttendanceCrud = defineCrud({
  model: 'employeeAttendance',
  module: 'attendance',
  searchFields: ['remarks'],
  filterFields: ['status', 'employeeId', 'dateFrom', 'dateTo'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['employeeId', 'date', 'status'],
})
