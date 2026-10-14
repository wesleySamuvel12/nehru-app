import { defineCrud } from '@/lib/crud'
import type { Session } from '@/lib/auth'

const crud = defineCrud({
  model: 'pickupLog',
  module: 'security',
  beforeSave: (data: Record<string, unknown>, session: Session) => {
    if (data.relation === '') data.relation = null
    if (data.status === 'VERIFIED' && !data.verifiedById) data.verifiedById = session.sub
    return data
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
