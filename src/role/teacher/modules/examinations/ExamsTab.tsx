'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { fmtDate } from '@/lib/format'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ClipboardEdit, CalendarClock, Award } from 'lucide-react'
import {
  EXAM_TYPES, EXAM_STATUSES, loadClassOptions, loadYearOptions, loadTermOptions, safeList,
} from './helpers'

export default function ExamsTab() {
  const { session, setModule } = useErp()
  const isTeacher = session?.role === 'TEACHER'

  const [classMap, setClassMap] = React.useState<Map<string, string>>(new Map())
  const [yearMap, setYearMap] = React.useState<Map<string, string>>(new Map())
  const [termMap, setTermMap] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    let alive = true
    Promise.all([
      safeList('api/academics/classes', { all: 1 }),
      safeList('api/academics/years', { all: 1 }),
      safeList('api/academics/terms', { all: 1 }),
    ]).then(([classes, years, terms]) => {
      if (!alive) return
      setClassMap(new Map(classes.map((c: any) => [c.id, c.name])))
      setYearMap(new Map(years.map((y: any) => [y.id, y.name])))
      setTermMap(new Map(terms.map((t: any) => [t.id, t.name])))
    })
    return () => { alive = false }
  }, [])

  const columns: Column[] = [
    {
      key: 'name', label: 'Exam', sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{classMapLabel(row, classMap, termMap, yearMap)}</p>
        </div>
      ),
    },
    { key: 'type', label: 'Type', badge: true },
    { key: 'startDate', label: 'Starts', date: true, sortable: true, hideOnMobile: true },
    { key: 'endDate', label: 'Ends', date: true, sortable: true, hideOnMobile: true },
    {
      key: 'dateRange', label: 'Dates', sortable: false,
      render: (row) => <span className="whitespace-nowrap text-xs">{fmtDate(row.startDate)} → {fmtDate(row.endDate)}</span>,
    },
    { key: 'status', label: 'Status', badge: true },
    {
      key: 'resultPublished', label: 'Results', sortable: false,
      render: (row) => <StatusBadge value={row.resultPublished ? 'PUBLISHED' : 'DRAFT'} />,
    },
  ]

  const fields: FormField[] = [
    { name: 'name', label: 'Exam Name', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Term 1 Examination' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: EXAM_TYPES.map(t => ({ label: title(t), value: t })), defaultValue: 'TERM' },
    {
      name: 'academicYearId', label: 'Academic Year', type: 'select', required: true,
      optionsLoader: loadYearOptions,
    },
    { name: 'termId', label: 'Term', type: 'select', optionsLoader: loadTermOptions },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'endDate', label: 'End Date', type: 'date', required: true },
    {
      name: 'classId', label: 'Class', type: 'select',
      optionsLoader: loadClassOptions,
      help: 'The exam is linked to this class (single-class selection for now).',
    },
    { name: 'status', label: 'Status', type: 'select', options: EXAM_STATUSES.map(s => ({ label: title(s), value: s })), defaultValue: 'DRAFT' },
    { name: 'isOnline', label: 'Conducted Online', type: 'switch' },
  ]

  const filters: FilterDef[] = [
    { key: 'type', label: 'types', options: EXAM_TYPES.map(t => ({ label: title(t), value: t })) },
    { key: 'status', label: 'statuses', options: EXAM_STATUSES.map(s => ({ label: title(s), value: s })) },
  ]

  return (
    <DataTable
      endpoint="api/exams"
      columns={columns}
      fields={fields}
      filters={filters}
      defaultSort={{ sortBy: 'startDate', sortDir: 'desc' }}
      searchPlaceholder="Search exams…"
      createLabel={isTeacher ? undefined : 'Add Exam'}
      allowCreate={!isTeacher}
      allowEdit={!isTeacher}
      allowDelete={!isTeacher}
      rowToForm={(row) => ({
        name: row.name || '',
        type: row.type || 'TERM',
        academicYearId: row.academicYearId || '',
        termId: row.termId || '',
        startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
        endDate: row.endDate ? String(row.endDate).slice(0, 10) : '',
        classId: parseFirstClass(row.classIds),
        status: row.status || 'DRAFT',
        isOnline: !!row.isOnline,
      })}
      transformSave={(values) => {
        const { classId, ...rest } = values
        return {
          ...rest,
          classIds: classId ? JSON.stringify([classId]) : null,
          termId: values.termId || null,
          isOnline: !!values.isOnline,
        }
      }}
      emptyTitle="No exams configured"
      emptyDescription="Create your first exam to start scheduling papers and entering marks."
      rowActions={(row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium border-border/80"
            onClick={() => setModule('examinations', { tab: 'marks', examId: row.id })}
            title="Enter marks for this exam"
          >
            <ClipboardEdit className="mr-1.5 h-3.5 w-3.5 text-primary" /> Marks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setModule('examinations', { tab: 'schedule', examId: row.id })}
            title="View paper schedule"
          >
            <CalendarClock className="mr-1 h-3.5 w-3.5" /> Schedule
          </Button>
          {row.resultPublished && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              onClick={() => setModule('examinations', { tab: 'results', examId: row.id })}
              title="View published results"
            >
              <Award className="mr-1 h-3.5 w-3.5" /> Results
            </Button>
          )}
        </div>
      )}
    />
  )
}

function title(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

function parseFirstClass(classIds?: string | null): string {
  if (!classIds) return ''
  try {
    const arr = JSON.parse(classIds)
    return Array.isArray(arr) && typeof arr[0] === 'string' ? arr[0] : ''
  } catch {
    return ''
  }
}

function classMapLabel(row: any, classMap: Map<string, string>, termMap: Map<string, string>, yearMap: Map<string, string>): string {
  const parts: string[] = []
  const term = row.termId ? termMap.get(row.termId) : undefined
  const year = row.academicYearId ? (yearMap.get(row.academicYearId) || (row.academicYearId.length < 12 ? row.academicYearId : '')) : ''
  if (term || year) parts.push([term, year].filter(Boolean).join(' · '))
  try {
    const ids: string[] = row.classIds ? JSON.parse(row.classIds) : []
    const names = ids.map(id => classMap.get(id)).filter(Boolean)
    if (names.length) parts.push(names.join(', '))
  } catch { /* ignore */ }
  return parts.join(' · ') || '—'
}
