import { defineCrud } from '@/lib/crud'

export const questionCrud = defineCrud({
  model: 'question',
  module: 'examinations',
  searchFields: ['text', 'correctAnswer'],
  filterFields: ['subjectId', 'classId', 'type', 'difficulty'],
  defaultSort: { field: 'id', dir: 'desc' },
  required: ['subjectId', 'classId', 'type', 'text'],
})
