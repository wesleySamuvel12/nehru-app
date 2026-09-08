import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'securityAlert',
  module: 'security',
  beforeSave: (data: Record<string, unknown>) => {
    if (data.location === '') data.location = null
    if (data.resolution === '') data.resolution = null
    if (data.resolvedAt === '') data.resolvedAt = null
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
