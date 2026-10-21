import { defineCrud } from '@/lib/crud'
import type { Session } from '@/lib/auth'

export const employeeAttendanceCrud = defineCrud({
  model: 'employeeAttendance',
  module: 'attendance',
  searchFields: ['remarks'],
  filterFields: ['status', 'employeeId', 'dateFrom', 'dateTo'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['employeeId', 'date', 'status'],
  scope: (session: Session) => {
    // Row-level security: teachers can only view their own punch/attendance records
    if (session.role === 'TEACHER' && session.employeeId) {
      return { employeeId: session.employeeId }
    }
    return null
  },
})
