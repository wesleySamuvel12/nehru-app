'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'

/* ── Domain constants ── */
export const ASSET_CATEGORIES = ['CLASSROOM', 'LAB', 'SPORTS', 'IT', 'FURNITURE', 'SMART_BOARD', 'DEVICE', 'VEHICLE', 'OTHER']
export const ASSET_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISPOSED']
export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'WORN', 'NEEDS_REPAIR']
export const TRANSFER_TO_TYPES = ['CLASS', 'ROOM', 'EMPLOYEE', 'STUDENT']

export const CATEGORY_BADGE_MAP: Record<string, string> = {
  CLASSROOM: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  LAB: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  SPORTS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  IT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  FURNITURE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  SMART_BOARD: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  DEVICE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  VEHICLE: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

export const CONDITION_BADGE_MAP: Record<string, string> = {
  NEW: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  GOOD: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  WORN: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  NEEDS_REPAIR: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

export type WarrantyState = 'ok' | 'expiring' | 'expired'

export function warrantyState(warrantyExpiry: string | Date | null | undefined): WarrantyState {
  if (!warrantyExpiry) return 'ok'
  const d = new Date(warrantyExpiry)
  if (isNaN(d.getTime())) return 'ok'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
  if (d < today) return 'expired'
  if (d <= in90) return 'expiring'
  return 'ok'
}

export interface AssetDirectory {
  assets: any[]
  loading: boolean
  error: boolean
  reload: () => void
  assetOf: (assetId: string | null | undefined) => any
  nameOf: (assetId: string | null | undefined) => string
}

/** Asset directory for id → name mapping (asset transfers have no schema relations). */
export function useAssets(): AssetDirectory {
  const [assets, setAssets] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    list<any>('api/assets/items', { all: 1, sortBy: 'name', sortDir: 'asc' })
      .then((res) => { if (alive) { setAssets(res.data); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [tick])

  const map = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  return {
    assets,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    assetOf: (id) => map.get(id || ''),
    nameOf: (id) => {
      const a = map.get(id || '')
      return a ? `${a.name} (${a.assetTag})` : '—'
    },
  }
}
