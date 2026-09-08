import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'integrationSetting',
  module: 'integrations',
  searchFields: ['name', 'provider'],
  filterFields: ['category', 'status'],
  defaultSort: { field: 'name', dir: 'asc' },
  beforeSave: (data) => {
    // Normalise status values; trim text fields
    const out = { ...data }
    if (out.status && !['CONNECTED', 'DISCONNECTED', 'ERROR'].includes(out.status)) delete out.status
    if (typeof out.name === 'string') out.name = out.name.trim()
    if (typeof out.provider === 'string') out.provider = out.provider.trim()
    if (typeof out.configJson === 'string' && out.configJson.trim() === '') out.configJson = '{}'
    return out
  },
})

export const GET = crud.list
export const POST = crud.create
