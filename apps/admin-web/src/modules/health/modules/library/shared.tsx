'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'
import type { FieldOption } from '@/components/erp/DataTable'

/* ── Domain constants ── */
export const BOOK_CATEGORIES = [
  'Fiction', 'Science', 'Mathematics', 'History', 'Biography',
  'Reference', 'Computer Science', 'Literature', 'Sports', 'Environment',
]

export const TXN_STATUSES = ['ISSUED', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED']
export const RESERVATION_STATUSES = ['PENDING', 'READY', 'FULFILLED', 'CANCELLED']

export const USER_TYPE_BADGE_MAP: Record<string, string> = {
  STUDENT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  EMPLOYEE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

export const FINE_PER_DAY = 2
export const FINE_CAP = 100
export const LOAN_DAYS = 14

/** Date-only string for today + n days */
export function plusDaysISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Load student / employee options for pickers. Fails soft (other agents own these endpoints). */
export async function loadPersonOptions(userType: 'STUDENT' | 'EMPLOYEE'): Promise<FieldOption[]> {
  try {
    if (userType === 'EMPLOYEE') {
      const res = await list<any>('api/employees', { all: 1, sortBy: 'firstName', sortDir: 'asc' })
      return res.data.map((p: any) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}${p.employeeNo ? ` · ${p.employeeNo}` : ''}`,
      }))
    }
    const res = await list<any>('api/students', { all: 1, sortBy: 'firstName', sortDir: 'asc' })
    return res.data.map((p: any) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}${p.admissionNo ? ` · ${p.admissionNo}` : ''}`,
    }))
  } catch {
    return []
  }
}

export interface Directory {
  students: any[]
  employees: any[]
  loading: boolean
  error: boolean
  reload: () => void
  studentName: (id: string | null | undefined) => string
  employeeName: (id: string | null | undefined) => string
}

const nameOf = (p: any) => (p ? `${p.firstName} ${p.lastName}` : '')

/** Shared people directory (students + employees) with graceful failure. */
export function useDirectory(): Directory {
  const [students, setStudents] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    Promise.all([
      list<any>('api/students', { all: 1, sortBy: 'firstName', sortDir: 'asc' }).catch(() => null),
      list<any>('api/employees', { all: 1, sortBy: 'firstName', sortDir: 'asc' }).catch(() => null),
    ]).then(([s, e]) => {
      if (!alive) return
      setStudents(s?.data || [])
      setEmployees(e?.data || [])
      if (!s && !e) setError(true)
      setLoading(false)
    })
    return () => { alive = false }
  }, [tick])

  const studentMap = React.useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const employeeMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  return {
    students,
    employees,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    studentName: (id) => nameOf(studentMap.get(id || '')) || '—',
    employeeName: (id) => nameOf(employeeMap.get(id || '')) || '—',
  }
}

export interface BookDirectory {
  books: any[]
  loading: boolean
  error: boolean
  reload: () => void
  titleOf: (bookId: string | null | undefined) => string
}

/** Shared book directory (used for id → title mapping since schema has no relations). */
export function useBooks(): BookDirectory {
  const [books, setBooks] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    list<any>('api/library/books', { all: 1, sortBy: 'title', sortDir: 'asc' })
      .then((res) => { if (alive) { setBooks(res.data); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [tick])

  const map = React.useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  return {
    books,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    titleOf: (id) => map.get(id || '')?.title || '—',
  }
}
