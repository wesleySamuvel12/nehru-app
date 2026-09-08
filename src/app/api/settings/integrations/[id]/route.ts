import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'integrationSetting',
  module: 'integrations',
  beforeSave: (data) => {
    // Only these fields may be patched on an existing integration
    const out: Record<string, unknown> = {}
    for (const key of ['name', 'provider', 'category', 'status', 'configJson', 'lastSyncAt']) {
      if (data[key] !== undefined) out[key] = data[key]
    }
    if (out.status && !['CONNECTED', 'DISCONNECTED', 'ERROR'].includes(String(out.status))) delete out.status
    if (typeof out.configJson === 'string' && String(out.configJson).trim() === '') out.configJson = '{}'
    return out
  },
})

export const GET = crud.detail
export const PATCH = crud.update
export const DELETE = crud.remove
