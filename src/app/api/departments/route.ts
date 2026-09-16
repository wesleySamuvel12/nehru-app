import { defineCrud } from '@/lib/crud'


const crud = defineCrud({
  model: 'department',
  module: 'teachers',
  searchFields: ['name'],
  defaultSort: { field: 'name', dir: 'asc' }, // Department has no createdAt — must sort by name
  required: ['name'],
  include: { _count: { select: { employees: true } } },
  beforeSave: async (data: any) => {
    const b = { ...data }
    if (typeof b.name === 'string') b.name = b.name.trim()
    if (b.headName === '') b.headName = null
    return b
  },
})

export const GET = crud.list
export const POST = crud.create
