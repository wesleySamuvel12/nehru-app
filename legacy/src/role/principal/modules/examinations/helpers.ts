'use client'

import { list } from '@/lib/api-client'


export const EXAM_TYPES = ['TERM', 'UNIT', 'MONTHLY', 'FINAL', 'PRACTICAL', 'QUIZ']
export const EXAM_STATUSES = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'PUBLISHED']
export const QUESTION_TYPES = ['MCQ', 'SHORT', 'LONG', 'TRUE_FALSE', 'NUMERIC']
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

export interface Option { label: string; value: string }

/** Fetch a list endpoint, returning [] instead of throwing (for option loaders / name maps). */
export async function safeList(endpoint: string, params: Record<string, unknown> = {}): Promise<any[]> {
  try {
    const res = await list(endpoint, params as any)
    return res.data || []
  } catch {
    return []
  }
}

export function personName(p?: { firstName?: string; lastName?: string } | null): string {
  if (!p) return 'Unknown'
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'
}

export async function loadClassOptions(): Promise<Option[]> {
  const rows = await safeList('api/academics/classes', { all: 1, sortBy: 'name', sortDir: 'asc' })
  return rows.map(c => ({ label: c.name, value: c.id }))
}

export async function loadSubjectOptions(classId?: string): Promise<Option[]> {
  const rows = await safeList('api/academics/subjects', classId ? { classId, all: 1 } : { all: 1 })
  return rows.map(s => ({ label: classId ? s.name : `${s.name}${s.code ? ` (${s.code})` : ''}`, value: s.id }))
}

/** Academic years from /api/academics/years — falls back to known year labels if the endpoint is unavailable. */
export async function loadYearOptions(): Promise<Option[]> {
  const rows = await safeList('api/academics/years', { all: 1, sortBy: 'startDate', sortDir: 'desc' })
  if (rows.length) return rows.map((y: any) => ({ label: y.name, value: y.id }))
  return [
    { label: '2025-26', value: '2025-26' },
    { label: '2024-25', value: '2024-25' },
  ]
}

export async function loadTermOptions(): Promise<Option[]> {
  const [terms, years] = await Promise.all([
    safeList('api/academics/terms', { all: 1, sortBy: 'startDate', sortDir: 'asc' }),
    safeList('api/academics/years', { all: 1 }),
  ])
  const yearName = new Map<string, string>(years.map((y: any) => [y.id, y.name]))
  return terms.map((t: any) => ({
    label: yearName.get(t.academicYearId) ? `${t.name} — ${yearName.get(t.academicYearId)}` : t.name,
    value: t.id,
  }))
}

export async function loadExamOptions(): Promise<Option[]> {
  const rows = await safeList('api/exams', { all: 1, sortBy: 'startDate', sortDir: 'desc' })
  return rows.map((e: any) => ({ label: `${e.name} (${e.status})`, value: e.id }))
}

export async function loadEmployeeOptions(): Promise<Option[]> {
  const [a, b] = await Promise.all([safeList('api/employees', { all: 1 }), safeList('api/hr/employees', { all: 1 })])
  const rows = a.length ? a : b
  return rows.map((e: any) => ({ label: personName(e), value: e.id }))
}

const FALLBACK_BANDS = [
  { minPercent: 90, grade: 'A+' },
  { minPercent: 80, grade: 'A' },
  { minPercent: 70, grade: 'B+' },
  { minPercent: 60, grade: 'B' },
  { minPercent: 50, grade: 'C' },
  { minPercent: 35, grade: 'D' },
  { minPercent: 0, grade: 'F' },
]

/** Grade from % using GradeConfig rows (sorted desc by minPercent) or the default bands. */
export function gradeFromPct(pct: number, configs?: { minPercent: number; grade: string }[]): string {
  const bands = (configs && configs.length ? [...configs] : FALLBACK_BANDS)
    .sort((a, b) => b.minPercent - a.minPercent)
  for (const b of bands) {
    if (pct >= b.minPercent) return b.grade
  }
  return 'F'
}

export function parseClassIds(classIds?: string | null): string[] {
  if (!classIds) return []
  try {
    const arr = JSON.parse(classIds)
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : []
  } catch {
    return []
  }
}
