'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/erp/DataTable'
import { useStudents, SEVERITY_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function VisitsTab() {
  const dir = useStudents()

  const studentFilterOptions = React.useMemo(
    () => dir.students.slice(0, 200).map((s: any) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
    [dir.students],
  )

  return (
    <DataTable
      endpoint="api/health/visits"
      searchPlaceholder="Search reason, diagnosis…"
      exportEntity="clinicVisits"
      createLabel="Log Visit"
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      emptyTitle="No clinic visits logged"
      emptyDescription="Log each visit to the clinic with symptoms, treatment and severity."
      filters={[
        {
          key: 'severity', label: 'Severities',
          options: [
            { label: 'Minor', value: 'MINOR' },
            { label: 'Moderate', value: 'MODERATE' },
            { label: 'Serious', value: 'SERIOUS' },
          ],
        },
        ...(studentFilterOptions.length ? [{ key: 'studentId', label: 'Students', options: studentFilterOptions }] : []),
      ]}
      fields={[
        {
          name: 'studentId', label: 'Student', type: 'select', required: true, colSpan: 2,
          optionsLoader: async () => dir.students.map((s: any) => ({ label: `${s.firstName} ${s.lastName}${s.admissionNo ? ` · ${s.admissionNo}` : ''}`, value: s.id })),
          help: dir.error ? 'Student directory unavailable — please retry later.' : undefined,
        },
        { name: 'reason', label: 'Reason', type: 'text', required: true, placeholder: 'e.g. Fever, Scraped knee' },
        { name: 'severity', label: 'Severity', type: 'select', defaultValue: 'MINOR', options: [
          { label: 'Minor', value: 'MINOR' }, { label: 'Moderate', value: 'MODERATE' }, { label: 'Serious', value: 'SERIOUS' },
        ] },
        { name: 'symptoms', label: 'Symptoms', type: 'textarea', colSpan: 2 },
        { name: 'temperatureC', label: 'Temperature (°F)', type: 'number', min: 90, max: 112 },
        { name: 'bp', label: 'BP', type: 'text', placeholder: 'e.g. 110/70' },
        { name: 'diagnosis', label: 'Diagnosis', type: 'text' },
        { name: 'treatment', label: 'Treatment Given', type: 'text' },
        { name: 'medication', label: 'Medication', type: 'text' },
        { name: 'followUpRequired', label: 'Follow-up Required', type: 'switch' },
        { name: 'parentNotified', label: 'Parent Notified', type: 'switch' },
      ]}
      columns={[
        { key: 'studentId', label: 'Student', render: (row) => <span className="font-medium">{dir.nameOf(row.studentId)}</span> },
        { key: 'date', label: 'Date', date: true },
        { key: 'reason', label: 'Reason', render: (row) => <span className="font-medium">{row.reason}</span> },
        { key: 'diagnosis', label: 'Diagnosis', render: (row) => row.diagnosis || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
        { key: 'medication', label: 'Medication', render: (row) => row.medication || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
        { key: 'severity', label: 'Severity', badge: true, badgeMap: SEVERITY_BADGE_MAP },
        { key: 'attendedBy', label: 'Attended By', hideOnMobile: true, render: (row) => row.attendedBy || <span className="text-muted-foreground">—</span> },
        {
          key: 'parentNotified', label: 'Parent',
          render: (row) => row.parentNotified
            ? <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Notified</Badge>
            : <Badge variant="secondary">Not yet</Badge>,
        },
        {
          key: 'followUpRequired', label: 'Follow-up',
          render: (row) => row.followUpRequired
            ? <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">Required</Badge>
            : <span className="text-muted-foreground">—</span>,
          hideOnMobile: true,
        },
      ]}
    />
  )
}
