'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_BADGE: Record<string, string> = {
  DOCUMENT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  VIDEO: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  LINK: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  PRESENTATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const ONLINE_BADGE = { TRUE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' }

const columns: Column[] = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type', render: row => <StatusBadge value={row.type} map={TYPE_BADGE} /> },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'subject', label: 'Subject', sortable: false, render: row => row.subject?.name || <span className="text-muted-foreground">—</span> },
  { key: 'teacherName', label: 'Teacher', render: row => row.teacherName || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
  {
    key: 'isOnline', label: 'Online', sortable: false,
    render: row => row.isOnline ? <StatusBadge value="TRUE" map={ONLINE_BADGE} /> : <span className="text-xs text-muted-foreground">—</span>,
  },
  { key: 'scheduledAt', label: 'Scheduled', date: true, render: row => row.scheduledAt ? <span className="whitespace-nowrap text-muted-foreground">{new Date(row.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-muted-foreground">—</span> },
  { key: 'createdAt', label: 'Created', date: true, defaultHidden: true },
]

const TYPE_OPTIONS = ['DOCUMENT', 'VIDEO', 'LINK', 'PRESENTATION']

export default function MaterialsTab() {
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

  const classById = React.useMemo(() => new Map(classes.map(c => [c.id, c])), [classes])

  const fields: FormField[] = React.useMemo(() => [
    { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Photosynthesis — Video Lecture' },
    {
      name: 'type', label: 'Type', type: 'select', defaultValue: 'DOCUMENT',
      options: TYPE_OPTIONS.map(t => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), value: t })),
    },
    { name: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://…' },
    { name: 'classId', label: 'Class', type: 'select', options: classes.map(c => ({ label: c.name, value: c.id })) },
    {
      name: 'subjectId', label: 'Subject', type: 'select',
      options: subjects.map(s => ({ label: `${s.name}${s.classId && classById.get(s.classId) ? ` · ${classById.get(s.classId)!.name}` : ''}`, value: s.id })),
    },
    { name: 'teacherName', label: 'Teacher', type: 'text', placeholder: 'Defaults to you' },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    { name: 'isOnline', label: 'Online class', type: 'switch', help: 'Shown under the Online Classes tab' },
    { name: 'scheduledAt', label: 'Scheduled At', type: 'date' },
  ], [classes, subjects, classById])

  return (
    <DataTable
      endpoint="api/lms/materials"
      columns={columns}
      fields={fields}
      transformSave={(values) => ({
        ...values,
        description: values.description || null,
        classId: values.classId || null,
        subjectId: values.subjectId || null,
        teacherName: values.teacherName || null,
        scheduledAt: values.scheduledAt || null,
      })}
      defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
      searchPlaceholder="Search materials…"
      createLabel="Add Material"
      filters={[{ key: 'type', label: 'Types', options: TYPE_OPTIONS.map(t => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), value: t })) }]}
      emptyTitle="No learning materials yet"
      emptyDescription="Share documents, videos, links and presentations with your classes."
      deleteLabelField="title"
    />
  )
}
