import { defineCrud } from '@/lib/crud'

export const gradeCrud = defineCrud({
  model: 'gradeConfig',
  module: 'examinations',
  searchFields: ['name', 'grade', 'remark'],
  defaultSort: { field: 'minPercent', dir: 'desc' },
  required: ['name', 'grade'],
})
