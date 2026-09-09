import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'announcement',
  module: 'communication',
  searchFields: ['title', 'body'],
  filterFields: ['type', 'audience', 'priority', 'status'],
  beforeSave: (data: any, session: any) => {
    if (data.expiresAt === '') data.expiresAt = null
    if (!data.targetClassId || data.targetClassId === 'NONE') data.targetClassId = null
    if (!data.channels) data.channels = 'IN_APP'
    if (data.status === 'PUBLISHED' && !data.publishedBy) {
      data.publishedBy = session.name
      data.publishedById = session.sub
    }
    if (data.publishAt === '') delete data.publishAt
    return data
  },
})

export const PATCH = crud.update
export const DELETE = crud.remove
