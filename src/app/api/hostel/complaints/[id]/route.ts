import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'complaint',
  module: 'hostel',
  beforeSave: (data: Record<string, unknown>) => {
    if (data.resolution === '') data.resolution = null
    if (data.studentId === '') data.studentId = null
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
