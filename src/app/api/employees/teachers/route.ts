import { defineCrud } from '@/lib/crud'
import { makeEmployeeConfig } from '../shared'

/**
 * Teaching-staff subset endpoint — server-side isTeacher filter via crud `scope`.
 * Used by the "Teaching Staff" tab so search/sort/pagination stay server-side
 * without touching the shared crud engine (which cannot coerce boolean query params).
 */
const crud = defineCrud(makeEmployeeConfig({
  scope: () => ({ isTeacher: true }),
}))

export const GET = crud.list
export const POST = crud.create
