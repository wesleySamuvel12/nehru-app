'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { todayISO } from '@/lib/format'
import { GraduationCap } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_BADGE: Record<string, string> = {
  NEW: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  PROMOTION: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  TRANSFER: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  RE_ENROLLMENT: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  WITHDRAWAL: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

const columns: Column[] = [
  {
    key: 'student', label: 'Student', sortable: false,
    render: row => row.student ? (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        onClick={(e) => { e.stopPropagation(); useErp.getState().setModule('students') }}
        title="Open Students module"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        {row.student.name}
        <span className="text-[11px] font-normal text-muted-foreground">({row.student.admissionNo})</span>
      </button>
    ) : <span className="text-muted-foreground">—</span>,
  },
  { key: 'class', label: 'Class', sortable: false, render: row => row.class?.name || <span className="text-muted-foreground">—</span> },
  { key: 'section', label: 'Section', sortable: false, render: row => row.section?.name || <span className="text-muted-foreground">—</span> },
  { key: 'type', label: 'Type', render: row => <StatusBadge value={row.type} map={TYPE_BADGE} /> },
  { key: 'status', label: 'Status', badge: true },
  { key: 'date', label: 'Date', date: true },
  { key: 'remarks', label: 'Remarks', render: row => row.remarks || <span className="text-muted-foreground">—</span>, defaultHidden: true },
]

export default function EnrollmentsTab() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [sections, setSections] = React.useState<any[]>([])
  const [years, setYears] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const currentYearId = useErp(s => s.academicYearId)

  React.useEffect(() => {
    let alive = true
    Promise.all([
      list('api/academics/classes', { all: 1 }).catch(() => ({ data: [] })),
      list('api/academics/sections', { all: 1 }).catch(() => ({ data: [] })),
      list('api/academics/years', { all: 1 }).catch(() => ({ data: [] })),
      list('api/students', { all: 1, sortBy: 'firstName', sortDir: 'asc' }).catch(() => ({ data: [] })),
    ])
      .then(([classesRes, sectionsRes, yearsRes, studentsRes]) => {
        if (!alive) return
        setClasses(classesRes.data || [])
        setSections(sectionsRes.data || [])
        setYears(yearsRes.data || [])
        setStudents(studentsRes.data || [])
      })
    return () => { alive = false }
  }, [])

  const studentOptions = React.useMemo(
    () => students.map(s => ({ label: `${s.firstName} ${s.lastName} (${s.admissionNo})`, value: s.id })),
    [students],
  )

  const fields: FormField[] = React.useMemo(() => [
    {
      name: 'studentId', label: 'Student', type: 'select', required: true,
      options: studentOptions,
      help: studentOptions.length ? undefined : 'Student list unavailable right now.',
    },
    { name: 'classId', label: 'Class', type: 'select', required: true, options: classes.map(c => ({ label: c.name, value: c.id })) },
    {
      name: 'sectionId', label: 'Section', type: 'select', required: true,
      options: sections.map(s => ({
        label: `${classes.find(c => c.id === s.classId)?.name || 'Class'} — ${s.name}`,
        value: s.id,
      })),
    },
    {
      name: 'academicYearId', label: 'Academic Year', type: 'select', required: true,
      options: years.map(y => ({ label: `${y.name}${y.isCurrent ? ' (current)' : ''}`, value: y.id })),
      defaultValue: years.find(y => y.isCurrent)?.id || currentYearId || undefined,
    },
    {
      name: 'type', label: 'Enrollment Type', type: 'select', defaultValue: 'NEW',
      options: [
        { label: 'New', value: 'NEW' }, { label: 'Promotion', value: 'PROMOTION' },
        { label: 'Transfer', value: 'TRANSFER' }, { label: 'Re-enrollment', value: 'RE_ENROLLMENT' },
        { label: 'Withdrawal', value: 'WITHDRAWAL' },
      ],
    },
    {
      name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE',
      options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Cancelled', value: 'CANCELLED' }],
    },
    { name: 'date', label: 'Enrollment Date', type: 'date', defaultValue: todayISO() },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
  ], [studentOptions, classes, sections, years, currentYearId])

  return (
    <DataTable
      endpoint="api/academics/enrollments"
      columns={columns}
      fields={fields}
      transformSave={(values) => ({ ...values, remarks: values.remarks || null, date: values.date || todayISO() })}
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      searchPlaceholder="Search enrollments…"
      createLabel="Add Enrollment"
      filters={[
        { key: 'type', label: 'Types', options: [
          { label: 'New', value: 'NEW' }, { label: 'Promotion', value: 'PROMOTION' },
          { label: 'Transfer', value: 'TRANSFER' }, { label: 'Re-enrollment', value: 'RE_ENROLLMENT' },
        ] },
        { key: 'status', label: 'Statuses', options: [
          { label: 'Active', value: 'ACTIVE' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Cancelled', value: 'CANCELLED' },
        ] },
      ]}
      emptyTitle="No enrollments yet"
      emptyDescription="Record new admissions, promotions and transfers here."
      rowToForm={(row) => ({
        studentId: row.studentId || '',
        classId: row.classId || '',
        sectionId: row.sectionId || '',
        academicYearId: row.academicYearId || '',
        type: row.type || 'NEW',
        status: row.status || 'ACTIVE',
        date: row.date ? String(row.date).slice(0, 10) : '',
        remarks: row.remarks || '',
      })}
      deleteLabelField="remarks"
    />
  )
}
