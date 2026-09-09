'use client'

/**
 * Performance Reviews tab — appraisal records with star scores.
 */
import * as React from 'react'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { useEmployees, stars } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'].map(s => ({ label: s, value: s }))

export default function PerformanceTable() {
  const { options: employeeOptions } = useEmployees()

  const fields: FormField[] = React.useMemo(() => [
    { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: employeeOptions, colSpan: 2, help: employeeOptions.length ? undefined : 'Loading employees…' },
    { name: 'period', label: 'Review Period', type: 'text', required: true, placeholder: '2025 H2' },
    { name: 'reviewerName', label: 'Reviewer', type: 'text', placeholder: 'Principal / HOD name' },
    { name: 'score', label: 'Overall Score (0–5)', type: 'number', min: 0, max: 5, placeholder: 'e.g. 4.5' },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'DRAFT', options: STATUS_OPTIONS },
    { name: 'goals', label: 'Goals for Next Period', type: 'textarea', colSpan: 2, placeholder: 'Measurable objectives agreed with the teacher' },
    { name: 'strengths', label: 'Strengths Observed', type: 'textarea', colSpan: 2 },
    { name: 'improvements', label: 'Areas of Improvement', type: 'textarea', colSpan: 2 },
    { name: 'training', label: 'Training Recommendations', type: 'textarea', colSpan: 2 },
  ], [employeeOptions])

  const columns: Column[] = [
    { key: 'employeeName', label: 'Employee', render: row => <span className="font-medium">{row.employeeName || '—'}</span> },
    { key: 'period', label: 'Period' },
    {
      key: 'score', label: 'Score', sortable: false,
      render: row => row.score == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="whitespace-nowrap" title={`${row.score} / 5`}>
          <span className="text-amber-500">{stars(row.score)}</span>
          <span className="ml-1.5 text-xs font-semibold tabular-nums text-muted-foreground">{row.score}</span>
        </span>
      ),
    },
    { key: 'status', label: 'Status', badge: true },
    { key: 'reviewerName', label: 'Reviewer', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.reviewerName || '—'}</span> },
    { key: 'createdAt', label: 'Created', date: true },
  ]

  return (
    <DataTable
      endpoint="api/hr/performance"
      columns={columns}
      fields={fields}
      filters={[{ key: 'status', label: 'statuses', options: STATUS_OPTIONS }]}
      searchPlaceholder="Search reviews, periods…"
      defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
      createLabel="New Review"
      emptyTitle="No performance reviews yet"
      emptyDescription="Record appraisal outcomes, goals and training needs for your staff."
      transformSave={values => {
        const payload: any = { ...values }
        for (const k of ['goals', 'strengths', 'improvements', 'training']) {
          if (typeof payload[k] === 'string' && !payload[k].trim()) payload[k] = null
        }
        return payload
      }}
    />
  )
}
