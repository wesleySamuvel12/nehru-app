import { defineCrud } from '@/lib/crud'

export const scheduleCrud = defineCrud({
  model: 'examSchedule',
  module: 'examinations',
  searchFields: ['room'],
  filterFields: ['examId', 'classId', 'subjectId'],
  defaultSort: { field: 'date', dir: 'asc' },
  required: ['examId', 'subjectId', 'classId', 'date', 'startTime', 'endTime'],
})
