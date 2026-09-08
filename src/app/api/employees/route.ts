import { defineCrud } from '@/lib/crud'
import { makeEmployeeConfig } from './shared'

const crud = defineCrud(makeEmployeeConfig())

export const GET = crud.list
export const POST = crud.create
