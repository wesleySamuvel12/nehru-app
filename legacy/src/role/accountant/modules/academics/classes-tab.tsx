'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { SectionCard } from '@/components/erp/ui'
import { list } from '@/lib/api-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

const classColumns: Column[] = [
  { key: 'name', label: 'Class' },
  { key: 'level', label: 'Level' },
  { key: 'stream', label: 'Stream', render: row => row.stream || <span className="text-muted-foreground">—</span> },
  { key: 'sections', label: 'Sections', sortable: false, render: row => row._count?.sections ?? 0 },
  { key: 'students', label: 'Students', sortable: false, render: row => row._count?.students ?? 0 },
]

const classFields: FormField[] = [
  { name: 'name', label: 'Class Name', type: 'text', required: true, placeholder: 'e.g. Grade 9' },
  { name: 'level', label: 'Level (1–14)', type: 'number', required: true, min: 1, max: 14 },
  { name: 'stream', label: 'Stream', type: 'text', placeholder: 'Science / Commerce (11–12 only)' },
]

const sectionColumns: Column[] = [
  { key: 'name', label: 'Section' },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'capacity', label: 'Capacity' },
  { key: 'teacherName', label: 'Class Teacher', render: row => row.teacherName || <span className="text-muted-foreground">—</span> },
  { key: 'studentsCount', label: 'Students', sortable: false, render: row => row.studentsCount ?? '—' },
]

export default function ClassesTab() {
  const [classes, setClasses] = React.useState<any[]>([])

  React.useEffect(() => {
    let alive = true
    list('api/academics/classes', { all: 1 })
      .then(res => { if (alive) setClasses(res.data || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const sectionFields: FormField[] = React.useMemo(() => [
    { name: 'name', label: 'Section Name', type: 'text', required: true, placeholder: 'e.g. A' },
    { name: 'classId', label: 'Class', type: 'select', required: true, options: classes.map(c => ({ label: c.name, value: c.id })) },
    { name: 'capacity', label: 'Capacity', type: 'number', min: 1, defaultValue: 40 },
    { name: 'teacherName', label: 'Class Teacher', type: 'text', placeholder: 'Teacher name' },
  ], [classes])

  return (
    <div className="space-y-4">
      <SectionCard title="Classes" description="Grade levels offered by the school">
        <DataTable
          endpoint="api/academics/classes"
          columns={classColumns}
          fields={classFields}
          defaultSort={{ sortBy: 'level', sortDir: 'asc' }}
          searchPlaceholder="Search classes…"
          createLabel="Add Class"
          pageSizeOptions={[12, 24]}
          emptyTitle="No classes yet"
          emptyDescription="Create grade levels — e.g. Grade 1 through Grade 12."
          deleteLabelField="name"
        />
      </SectionCard>

      <SectionCard title="Sections" description="Divisions within each class, with capacity and class teacher">
        <DataTable
          endpoint="api/academics/sections"
          columns={sectionColumns}
          fields={sectionFields}
          defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
          searchPlaceholder="Search sections…"
          createLabel="Add Section"
          pageSizeOptions={[12, 24]}
          emptyTitle="No sections yet"
          emptyDescription="Add sections like A / B under each class."
          deleteLabelField="name"
        />
      </SectionCard>
    </div>
  )
}
