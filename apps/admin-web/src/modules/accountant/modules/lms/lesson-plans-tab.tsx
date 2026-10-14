'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'
import { isPastDay } from '@/role/accountant/modules/admissions/constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_BADGE: Record<string, string> = {
  PLANNED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

const columns: Column[] = [
  { key: 'title', label: 'Title' },
  { key: 'teacherName', label: 'Teacher', render: row => row.teacherName || <span className="text-muted-foreground">—</span> },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'subject', label: 'Subject', sortable: false, render: row => row.subject?.name || <span className="text-muted-foreground">—</span> },
  {
    key: 'date', label: 'Date',
    render: row => {
      const overdue = row.status === 'PLANNED' && isPastDay(row.date)
      return (
        <span className={overdue ? 'whitespace-nowrap font-medium text-amber-600 dark:text-amber-400' : 'whitespace-nowrap text-muted-foreground'}>
          {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
  },
  { key: 'status', label: 'Status', render: row => <StatusBadge value={row.status} map={STATUS_BADGE} /> },
]

export default function LessonPlansTab() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])

  React.useEffect(() => {
    let alive = true
    Promise.all([
      list('api/academics/classes', { all: 1 }).catch(() => ({ data: [] })),
      list('api/academics/subjects', { all: 1 }).catch(() => ({ data: [] })),
    ])
      .then(([classesRes, subjectsRes]) => {
        if (!alive) return
        setClasses(classesRes.data || [])
        setSubjects(subjectsRes.data || [])
      })
    return () => { alive = false }
  }, [])

  const classById = React.useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes])

  const fields: FormField[] = React.useMemo(() => [
    { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Letter Writing — Formal Letters' },
    { name: 'classId', label: 'Class', type: 'select', required: true, options: classes.map(c => ({ label: c.name, value: c.id })) },
    {
      name: 'subjectId', label: 'Subject', type: 'select', required: true,
      options: subjects.map(s => ({ label: `${s.name}${s.classId && classById.get(s.classId) ? ` · ${classById.get(s.classId)}` : ''}`, value: s.id })),
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
    {
      name: 'status', label: 'Status', type: 'select', defaultValue: 'PLANNED',
      options: [{ label: 'Planned', value: 'PLANNED' }, { label: 'Completed', value: 'COMPLETED' }],
    },
    { name: 'teacherName', label: 'Teacher', type: 'text', placeholder: 'Defaults to you' },
    { name: 'objectives', label: 'Objectives', type: 'textarea', colSpan: 2, placeholder: 'What should students achieve?' },
    { name: 'content', label: 'Content / Flow', type: 'textarea', colSpan: 2, placeholder: 'Warm-up, examples, activities, assessment…' },
  ], [classes, subjects, classById])

  return (
    <DataTable
      endpoint="api/lms/lesson-plans"
      columns={columns}
      fields={fields}
      transformSave={(values) => ({
        ...values,
        objectives: values.objectives || null,
        content: values.content || null,
        teacherName: values.teacherName || null,
      })}
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      searchPlaceholder="Search lesson plans…"
      createLabel="Add Lesson Plan"
      filters={[
        { key: 'status', label: 'Statuses', options: [
          { label: 'Planned', value: 'PLANNED' }, { label: 'Completed', value: 'COMPLETED' },
        ] },
      ]}
      emptyTitle="No lesson plans yet"
      emptyDescription="Plan your teaching flow — objectives, content and resources per class."
      deleteLabelField="title"
      rowToForm={(row) => ({
        title: row.title || '',
        classId: row.classId || '',
        subjectId: row.subjectId || '',
        date: row.date ? String(row.date).slice(0, 10) : '',
        status: row.status || 'PLANNED',
        teacherName: row.teacherName || '',
        objectives: row.objectives || '',
        content: row.content || '',
      })}
    />
  )
}
