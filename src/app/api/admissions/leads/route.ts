import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Admission leads (CRM pipeline). Kanban drag & drop PATCHes `stage`. */
const crud = defineCrud({
  model: 'lead',
  module: 'admissions',
  searchFields: ['name', 'phone', 'email'],
  filterFields: ['stage', 'source', 'assignedToName', 'campaignId'],
  defaultSort: { field: 'updatedAt', dir: 'desc' },
  required: ['name', 'phone'],
  beforeSave: (data: any) => {
    for (const k of ['email', 'classAppliedFor', 'assignedToId', 'assignedToName', 'notes', 'campaignId']) {
      if (data[k] === '') data[k] = null
    }
    if (data.nextFollowUp === '' || data.nextFollowUp === undefined) data.nextFollowUp = null
    else if (data.nextFollowUp) data.nextFollowUp = new Date(data.nextFollowUp)
    return data
  },
})

export const GET = crud.list
export const POST = crud.create
