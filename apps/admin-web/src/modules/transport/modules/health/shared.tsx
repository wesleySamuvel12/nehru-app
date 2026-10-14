'use client'

import * as React from 'react'
import { list, api, ApiError } from '@/lib/api-client'

/* ── Domain constants ── */
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export const VACCINES = [
  'MMR Booster', 'Td (Tetanus)', 'Hepatitis B', 'HPV (Girls 10-14)', 'Influenza (Seasonal)', 'COVID-19',
]

export const DOSES = ['1st', '2nd', 'Booster']
export const VACCINATION_STATUSES = ['COMPLETED', 'SCHEDULED', 'MISSED']

export const SEVERITY_BADGE_MAP: Record<string, string> = {
  MINOR: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  MODERATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SERIOUS: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

export const DOSE_BADGE_MAP: Record<string, string> = {
  '1st': 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  '2nd': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  'Booster': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

export interface StudentDirectory {
  students: any[]
  loading: boolean
  error: boolean
  reload: () => void
  nameOf: (studentId: string | null | undefined) => string
  studentOf: (studentId: string | null | undefined) => any
}

/** Student directory for id → name mapping (health records have no schema relations). */
export function useStudents(): StudentDirectory {
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    list<any>('api/students', { all: 1, sortBy: 'firstName', sortDir: 'asc' })
      .then((res) => { if (alive) { setStudents(res.data); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [tick])

  const map = React.useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  return {
    students,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    nameOf: (id) => {
      const s = map.get(id || '')
      return s ? `${s.firstName} ${s.lastName}` : '—'
    },
    studentOf: (id) => map.get(id || ''),
  }
}

/** Download any export-entity as CSV via /api/export. */
export async function downloadExport(entity: string, fileName?: string) {
  const res = await api<{ data?: any[] }>(`/api/export?entity=${entity}`)
  const data = res.data || []
  if (!data.length) throw new ApiError(404, 'No data to export yet.')
  const headers = Object.keys(data[0])
  const csv = [headers.join(','), ...data.map((r) => headers.map((h) => {
    const v = r[h]
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName || entity}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
