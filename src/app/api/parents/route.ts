import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'parent',
  module: 'parents',
  searchFields: ['name', 'phone', 'email'],
  filterFields: ['relation'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['name', 'phone'],
  include: { _count: { select: { students: true } } },
  beforeSave: async (data: any, _session, mode) => {
    const b = { ...data }
    for (const k of ['name', 'occupation', 'phone', 'altPhone', 'email', 'emergencyContact']) {
      if (typeof b[k] === 'string') b[k] = b[k].trim()
    }
    if (mode === 'create' && !b.relation) b.relation = 'FATHER'
    if (b.relation && !['FATHER', 'MOTHER', 'GUARDIAN'].includes(b.relation)) delete b.relation
    if (b.phone === '') delete b.phone
    for (const k of ['occupation', 'altPhone', 'email', 'address', 'emergencyContact']) {
      if (b[k] === '') b[k] = null
    }
    return b
  },
})

export const GET = crud.list
export const POST = crud.create
