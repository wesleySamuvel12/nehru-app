'use client'

import { api, list } from '@/lib/api-client'

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  EXCUSED: 'Excused',
  HOLIDAY: 'Holiday',
  LEAVE: 'Leave',
}

/** Chip tones per status (active state). */
export const STATUS_CHIP_ACTIVE: Record<string, string> = {
  PRESENT: 'bg-emerald-600 text-white border-emerald-600 font-semibold',
  ABSENT: 'bg-rose-600 text-white border-rose-600 font-semibold',
  LATE: 'bg-amber-600 text-white border-amber-600 font-semibold',
  HALF_DAY: 'bg-orange-600 text-white border-orange-600 font-semibold',
  EXCUSED: 'bg-sky-600 text-white border-sky-600 font-semibold',
}

export const STATUS_CHIP_IDLE: Record<string, string> = {
  PRESENT: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10',
  ABSENT: 'border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10',
  LATE: 'border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
  HALF_DAY: 'border-orange-500/40 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10',
  EXCUSED: 'border-sky-500/40 text-sky-700 dark:text-sky-400 hover:bg-sky-500/10',
}

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

export interface Option { label: string; value: string }

export interface TeacherClassItem {
  id: string
  classId: string
  sectionId: string
  className: string
  sectionName: string
  displayName: string
  level: number
  capacity: number
  studentCount: number
  isClassTeacher: boolean
  subjects: Array<{ id: string; name: string; code: string }>
}

export async function loadTeacherClasses(): Promise<TeacherClassItem[]> {
  try {
    const res = await api<{ data: { classes: TeacherClassItem[] } }>('/api/portal/teacher/classes')
    return res.data?.classes || []
  } catch {
    return []
  }
}

export async function loadClassOptions(): Promise<Option[]> {
  const teacherClasses = await loadTeacherClasses()
  if (teacherClasses.length > 0) {
    const seen = new Set<string>()
    const opts: Option[] = []
    for (const c of teacherClasses) {
      if (!seen.has(c.classId)) {
        seen.add(c.classId)
        opts.push({ label: c.className, value: c.classId })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }

  const rows = await safeList('api/academics/classes', { all: 1, sortBy: 'name', sortDir: 'asc' })
  return rows.map(c => ({ label: c.name, value: c.id }))
}

export async function loadSectionOptions(classId?: string): Promise<Option[]> {
  const teacherClasses = await loadTeacherClasses()
  if (teacherClasses.length > 0) {
    const filtered = classId ? teacherClasses.filter(c => c.classId === classId) : teacherClasses
    return filtered.map(c => ({
      label: classId ? (c.isClassTeacher ? `${c.sectionName} (Homeroom)` : c.sectionName) : c.displayName,
      value: c.sectionId,
    }))
  }

  const rows = await safeList('api/academics/sections', classId ? { classId, all: 1 } : { all: 1 })
  const classes = classId ? [] : await safeList('api/academics/classes', { all: 1 })
  const className = new Map<string, string>(classes.map((c: any) => [c.id, c.name]))
  return rows.map((s: any) => ({
    label: classId ? s.name : `${className.get(s.classId) || 'Class'}-${s.name}`,
    value: s.id,
  }))
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
