'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StudentLite {
  id: string
  name: string
  admissionNo: string
  className?: string
  barcode?: string
}

/** Loads the student directory once (used for name maps + pickers). */
export function useStudents() {
  const [students, setStudents] = React.useState<StudentLite[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list<any>('api/students', { all: 1, sortBy: 'firstName', sortDir: 'asc' })
      .then(res => {
        if (!alive) return
        setStudents((res.data || []).map((s: any) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          admissionNo: s.admissionNo,
          className: s.klass?.name || s.className,
          barcode: s.barcode,
        })))
      })
      .catch((e: any) => { if (alive) setError(e?.message || 'Unable to load students') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { load() }, [load])

  const map = React.useMemo(() => {
    const m: Record<string, StudentLite> = {}
    students.forEach(s => { m[s.id] = s })
    return m
  }, [students])

  return { students, map, loading, error, reload: load }
}
