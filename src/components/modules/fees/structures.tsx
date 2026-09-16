'use client'

/**
 * Fee Structures tab — per-class annual fee configuration.
 */
import * as React from 'react'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { Badge } from '@/components/ui/badge'
import { inr } from '@/lib/format'
import { useClasses, useAcademicYears } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function StructuresTable() {
  const { options: classOptions, nameOf: classNameOf } = useClasses()
  const { options: yearOptions, nameOf: yearNameOf } = useAcademicYears()

  const fields: FormField[] = React.useMemo(() => [
    { name: 'name', label: 'Structure Name', type: 'text', required: true, placeholder: 'Grade 5 — Annual Fee 2025-26' },
    { name: 'classId', label: 'Class', type: 'select', options: classOptions },
    { name: 'academicYearId', label: 'Academic Year', type: 'select', options: yearOptions },
    { name: 'totalAmount', label: 'Total Annual Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'installments', label: 'Installments', type: 'number', min: 1, defaultValue: 2, help: 'How many times the year is billed.' },
    { name: 'itemsJson', label: 'Fee Heads (JSON, optional)', type: 'textarea', colSpan: 2, placeholder: '[{"name":"Tuition","amount":96000,"frequency":"Annual"}]' },
    { name: 'isActive', label: 'Active', type: 'switch', defaultValue: true },
  ], [classOptions, yearOptions])

  const columns: Column[] = [
    { key: 'name', label: 'Structure', render: row => <span className="font-medium">{row.name}</span> },
    { key: 'className', label: 'Class', sortable: false, render: row => <span className="text-muted-foreground">{row.classId ? classNameOf(row.classId) : 'All classes'}</span> },
    { key: 'yearName', label: 'Academic Year', sortable: false, hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.academicYearId ? yearNameOf(row.academicYearId) : '—'}</span> },
    { key: 'totalAmount', label: 'Annual Amount', money: true },
    { key: 'installments', label: 'Installments', render: row => <span className="tabular-nums">{row.installments || 1}</span> },
    {
      key: 'isActive', label: 'Status', sortable: false,
      render: row => row.isActive
        ? <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" variant="outline">Active</Badge>
        : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>,
    },
  ]

  return (
    <DataTable
      endpoint="api/fees/structures"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search structures…"
      defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
      createLabel="New Fee Structure"
      emptyTitle="No fee structures yet"
      emptyDescription="Define the annual fee head-wise for each class — invoices are raised against these."
      transformSave={values => ({
        ...values,
        itemsJson: typeof values.itemsJson === 'string' && values.itemsJson.trim() ? values.itemsJson : null,
      })}
    />
  )
}
