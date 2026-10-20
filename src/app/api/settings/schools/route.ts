import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'school',
  module: 'settings',
  publicRead: true,
  searchFields: ['name', 'code', 'email', 'phone'],
  defaultSort: { field: 'name', dir: 'asc' },
})

/** GET /api/settings/schools — list of schools/campuses */
export const GET = crud.list

/** POST /api/settings/schools — create a school (admin only) */
export const POST = crud.create
