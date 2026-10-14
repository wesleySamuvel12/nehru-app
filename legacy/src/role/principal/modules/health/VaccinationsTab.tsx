'use client'

import * as React from 'react'
import { DataTable } from '@/components/erp/DataTable'
import { useStudents, VACCINES, DOSES, VACCINATION_STATUSES, DOSE_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function VaccinationsTab() {
  const dir = useStudents()

  const studentFilterOptions = React.useMemo(
    () => dir.students.slice(0, 200).map((s: any) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
    [dir.students],
  )

  return (
    <DataTable
      endpoint="api/health/vaccinations"
      searchPlaceholder="Search vaccine…"
      exportEntity={undefined}
      createLabel="Record Dose"
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      emptyTitle="No vaccinations recorded"
      emptyDescription="Record each administered dose with vaccine, date and next due date."
      filters={[
        { key: 'status', label: 'Statuses', options: VACCINATION_STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })) },
        ...(studentFilterOptions.length ? [{ key: 'studentId', label: 'Students', options: studentFilterOptions }] : []),
      ]}
      fields={[
        {
          name: 'studentId', label: 'Student', type: 'select', required: true, colSpan: 2,
          optionsLoader: async () => dir.students.map((s: any) => ({ label: `${s.firstName} ${s.lastName}${s.admissionNo ? ` · ${s.admissionNo}` : ''}`, value: s.id })),
          help: dir.error ? 'Student directory unavailable — please retry later.' : undefined,
        },
        { name: 'vaccine', label: 'Vaccine', type: 'select', required: true, options: VACCINES.map((v) => ({ label: v, value: v })) },
        { name: 'dose', label: 'Dose', type: 'select', defaultValue: '1st', options: DOSES.map((d) => ({ label: d, value: d })) },
        { name: 'date', label: 'Administered On', type: 'date', required: true },
        { name: 'nextDueDate', label: 'Next Due Date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', defaultValue: 'COMPLETED', options: VACCINATION_STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })) },
        { name: 'administeredBy', label: 'Administered By', type: 'text', placeholder: 'e.g. Dr. Sanjay Gupta' },
      ]}
      columns={[
        { key: 'studentId', label: 'Student', render: (row) => <span className="font-medium">{dir.nameOf(row.studentId)}</span> },
        { key: 'vaccine', label: 'Vaccine', render: (row) => <span className="font-medium">{row.vaccine}</span> },
        { key: 'dose', label: 'Dose', badge: true, badgeMap: DOSE_BADGE_MAP },
        { key: 'date', label: 'Date', date: true },
        {
          key: 'nextDueDate', label: 'Next Due', date: true,
          render: (row) => {
            if (!row.nextDueDate) return <span className="text-muted-foreground">—</span>
            const due = new Date(row.nextDueDate)
            const overdue = due < new Date() && row.status !== 'COMPLETED'
            return (
              <span className={overdue ? 'font-semibold text-amber-600 dark:text-amber-400' : 'whitespace-nowrap text-muted-foreground'}>
                {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {overdue ? ' · overdue' : ''}
              </span>
            )
          },
        },
        { key: 'status', label: 'Status', badge: true },
        { key: 'administeredBy', label: 'Administered By', hideOnMobile: true, render: (row) => row.administeredBy || <span className="text-muted-foreground">—</span> },
      ]}
    />
  )
}
