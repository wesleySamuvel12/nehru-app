import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Classes (Grade 1..12) with section & student counts. */
const crud = defineCrud({
  model: 'class',
  module: 'academics',
  searchFields: ['name', 'stream'],
  defaultSort: { field: 'level', dir: 'asc' },
  required: ['name', 'level'],
  include: { _count: { select: { sections: true, students: true } } },
  beforeSave: (data: any) => {
    if (data.level !== undefined && data.level !== null && data.level !== '') data.level = Number(data.level)
    if (data.stream === '') data.stream = null
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
