'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

const columns: Column[] = [
  { key: 'name', label: 'Subject' },
  { key: 'code', label: 'Code' },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'teacherName', label: 'Teacher', render: row => row.teacherName || <span className="text-muted-foreground">—</span> },
  { key: 'maxMarks', label: 'Max Marks', hideOnMobile: true },
  {
    key: 'isElective', label: 'Type', sortable: false,
    render: row => row.isElective
      ? <StatusBadge value="ELECTIVE" map={{ ELECTIVE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' }} />
      : <StatusBadge value="CORE" map={{ CORE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20' }} />,
  },
]

export default function SubjectsTab() {
  const [classes, setClasses] = React.useState<any[]>([])

  React.useEffect(() => {
    let alive = true
    list('api/academics/classes', { all: 1 })
      .then(res => { if (alive) setClasses(res.data || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const fields: FormField[] = React.useMemo(() => [
    { name: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'e.g. Mathematics' },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. MATH-08' },
    { name: 'classId', label: 'Class', type: 'select', options: classes.map(c => ({ label: c.name, value: c.id })) },
    { name: 'teacherName', label: 'Teacher', type: 'text', placeholder: 'Teacher name' },
    { name: 'maxMarks', label: 'Max Marks', type: 'number', min: 1, defaultValue: 100 },
    { name: 'isElective', label: 'Elective Subject', type: 'switch' },
  ], [classes])

  return (
    <DataTable
      endpoint="api/academics/subjects"
      columns={columns}
      fields={fields}
      defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
      searchPlaceholder="Search subjects, codes, teachers…"
      createLabel="Add Subject"
      filters={[
        { key: 'classId', label: 'Classes', options: classes.map(c => ({ label: c.name, value: c.id })) },
      ]}
      pageSizeOptions={[12, 24]}
      emptyTitle="No subjects yet"
      emptyDescription="Add subjects and map them to classes with a teacher in charge."
      deleteLabelField="name"
    />
  )
}
