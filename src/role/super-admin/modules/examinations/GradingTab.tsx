'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'


export default function GradingTab() {
  const columns: Column[] = [
    { key: 'grade', label: 'Grade', sortable: true, render: (row) => <span className="font-bold">{row.grade}</span> },
    { key: 'name', label: 'Band Name', sortable: true },
    { key: 'minPercent', label: 'Min %', sortable: true, render: (row) => `${row.minPercent}%` },
    { key: 'maxPercent', label: 'Max %', sortable: true, render: (row) => `${row.maxPercent}%` },
    { key: 'gpa', label: 'GPA', sortable: true },
    {
      key: 'remark', label: 'Remark', sortable: false,
      render: (row) => <span className="text-muted-foreground">{row.remark || '—'}</span>,
    },
  ]

  const fields: FormField[] = [
    { name: 'name', label: 'Band Name', type: 'text', required: true, placeholder: 'e.g. Outstanding' },
    { name: 'grade', label: 'Grade', type: 'text', required: true, placeholder: 'e.g. A+' },
    { name: 'minPercent', label: 'Min Percent', type: 'number', required: true, min: 0, max: 100, defaultValue: 0 },
    { name: 'maxPercent', label: 'Max Percent', type: 'number', required: true, min: 0, max: 100, defaultValue: 100 },
    { name: 'gpa', label: 'GPA', type: 'number', min: 0, max: 10, defaultValue: 0 },
    { name: 'remark', label: 'Remark', type: 'text', colSpan: 2, placeholder: 'Short comment shown on results' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Grade bands drive automatic grade calculation in Marks Entry, Results and printed report cards.
        Lower the Min % of a band to widen it; bands are matched from the highest Min % downwards.
      </p>
      <DataTable
        endpoint="api/exams/grades"
        columns={columns}
        fields={fields}
        defaultSort={{ sortBy: 'minPercent', sortDir: 'desc' }}
        searchPlaceholder="Search grades…"
        createLabel="Add Grade Band"
        transformSave={(values) => ({
          ...values,
          minPercent: Number(values.minPercent) || 0,
          maxPercent: values.maxPercent === '' || values.maxPercent === undefined || values.maxPercent === null ? 100 : Number(values.maxPercent),
          gpa: values.gpa === '' || values.gpa === undefined || values.gpa === null ? 0 : Number(values.gpa),
          remark: values.remark || null,
        })}
        emptyTitle="No grade bands"
        emptyDescription="Add grade bands (e.g. A+ for 90–100%) to enable automatic grading."
      />
    </div>
  )
}
