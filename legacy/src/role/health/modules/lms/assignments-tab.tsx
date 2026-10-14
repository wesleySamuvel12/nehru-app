'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { isPastDay } from '@/role/health/modules/admissions/constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_BADGE: Record<string, string> = {
  HOMEWORK: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  ASSIGNMENT: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  PROJECT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const columns: Column[] = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type', render: row => <StatusBadge value={row.type} map={TYPE_BADGE} /> },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'section', label: 'Section', sortable: false, render: row => row.section?.name || <span className="text-muted-foreground">—</span> },
  { key: 'subject', label: 'Subject', sortable: false, render: row => row.subject?.name || <span className="text-muted-foreground">—</span> },
  { key: 'teacherName', label: 'Teacher', render: row => row.teacherName || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
  {
    key: 'dueDate', label: 'Due Date',
    render: row => {
      const overdue = row.status === 'PUBLISHED' && isPastDay(row.dueDate)
      return (
        <span className={overdue ? 'whitespace-nowrap font-medium text-rose-600 dark:text-rose-400' : 'whitespace-nowrap text-muted-foreground'}>
          {fmtDate(row.dueDate)}{overdue ? ' · Overdue' : ''}
        </span>
      )
    },
  },
  { key: 'maxMarks', label: 'Max Marks', hideOnMobile: true },
  { key: 'status', label: 'Status', badge: true },
]

const TYPE_OPTIONS = ['HOMEWORK', 'ASSIGNMENT', 'PROJECT']
const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'CLOSED']

export default function AssignmentsTab() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [sections, setSections] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])

  React.useEffect(() => {
    let alive = true
    Promise.all([
      list('api/academics/classes', { all: 1 }).catch(() => ({ data: [] })),
      list('api/academics/sections', { all: 1 }).catch(() => ({ data: [] })),
      list('api/academics/subjects', { all: 1 }).catch(() => ({ data: [] })),
    ])
      .then(([classesRes, sectionsRes, subjectsRes]) => {
        if (!alive) return
        setClasses(classesRes.data || [])
        setSections(sectionsRes.data || [])
        setSubjects(subjectsRes.data || [])
      })
    return () => { alive = false }
  }, [])

  const classById = React.useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes])

  const fields: FormField[] = React.useMemo(() => [
    { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Algebra Worksheet — Linear Equations' },
    {
      name: 'type', label: 'Type', type: 'select', defaultValue: 'HOMEWORK',
      options: TYPE_OPTIONS.map(t => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), value: t })),
    },
    { name: 'maxMarks', label: 'Max Marks', type: 'number', min: 1, defaultValue: 20 },
    { name: 'classId', label: 'Class', type: 'select', required: true, options: classes.map(c => ({ label: c.name, value: c.id })) },
    {
      name: 'sectionId', label: 'Section', type: 'select', required: true,
      options: sections.map(s => ({ label: `${classById.get(s.classId) || 'Class'} — ${s.name}`, value: s.id })),
    },
    {
      name: 'subjectId', label: 'Subject', type: 'select', required: true,
      options: subjects.map(s => ({ label: `${s.name}${s.classId && classById.get(s.classId) ? ` · ${classById.get(s.classId)}` : ''}`, value: s.id })),
    },
    { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
    {
      name: 'status', label: 'Status', type: 'select', defaultValue: 'PUBLISHED',
      options: STATUS_OPTIONS.map(s => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })),
    },
    { name: 'teacherName', label: 'Teacher', type: 'text', placeholder: 'Defaults to you' },
    { name: 'attachmentUrl', label: 'Attachment URL', type: 'url', placeholder: 'https://…' },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  ], [classes, sections, subjects, classById])

  return (
    <DataTable
      endpoint="api/lms/assignments"
      columns={columns}
      fields={fields}
      transformSave={(values) => ({
        ...values,
        description: values.description || null,
        attachmentUrl: values.attachmentUrl || null,
        teacherName: values.teacherName || null,
      })}
      defaultSort={{ sortBy: 'dueDate', sortDir: 'asc' }}
      searchPlaceholder="Search assignments…"
      createLabel="Add Assignment"
      filters={[
        { key: 'type', label: 'Types', options: TYPE_OPTIONS.map(t => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), value: t })) },
        { key: 'status', label: 'Statuses', options: STATUS_OPTIONS.map(s => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })) },
      ]}
      emptyTitle="No assignments yet"
      emptyDescription="Create homework, assignments or projects for your classes."
      deleteLabelField="title"
      rowToForm={(row) => ({
        title: row.title || '',
        type: row.type || 'HOMEWORK',
        maxMarks: row.maxMarks ?? 20,
        classId: row.classId || '',
        sectionId: row.sectionId || '',
        subjectId: row.subjectId || '',
        dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : '',
        status: row.status || 'PUBLISHED',
        teacherName: row.teacherName || '',
        attachmentUrl: row.attachmentUrl || '',
        description: row.description || '',
      })}
    />
  )
}
