'use client'

/**
 * Budgets tab — allocation vs spend with utilisation progress bars.
 */
import * as React from 'react'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { inr } from '@/lib/format'
import { CATEGORY_LABELS, useAcademicYears } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

function utilizationPct(row: any): number {
  const allocated = Number(row.allocated) || 0
  if (!allocated) return Number(row.spent) ? 100 : 0
  return Math.round(((Number(row.spent) || 0) / allocated) * 100)
}

export default function BudgetsTable() {
  const { options: yearOptions } = useAcademicYears()

  const fields: FormField[] = React.useMemo(() => [
    { name: 'name', label: 'Budget Name', type: 'text', required: true, placeholder: 'Utilities — FY 2025-26' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value })) },
    { name: 'academicYearId', label: 'Academic Year', type: 'select', options: yearOptions },
    { name: 'allocated', label: 'Allocated (₹)', type: 'number', required: true, min: 0 },
    { name: 'spent', label: 'Spent So Far (₹)', type: 'number', min: 0, defaultValue: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, placeholder: 'Optional context for budget reviewers' },
  ], [yearOptions])

  const columns: Column[] = [
    { key: 'name', label: 'Budget', render: row => <span className="font-medium">{row.name}</span> },
    { key: 'category', label: 'Category', sortable: false, render: row => <span className="text-muted-foreground">{CATEGORY_LABELS[row.category] || row.category}</span> },
    { key: 'allocated', label: 'Allocated', money: true },
    { key: 'spent', label: 'Spent', money: true },
    {
      key: 'utilization', label: 'Utilisation', sortable: false, className: 'min-w-[150px]',
      render: row => {
        const pct = utilizationPct(row)
        return (
          <div className="flex items-center gap-2">
            <Progress
              value={Math.min(100, pct)} className={cn('h-2 w-24',
                pct > 100 ? '[&>div]:bg-rose-500' : pct > 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500')}
              aria-label={`${pct}% utilised`}
            />
            <span className={cn('w-12 shrink-0 text-xs font-semibold tabular-nums', pct > 100 ? 'text-rose-600 dark:text-rose-400' : pct > 75 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
              {pct}%
            </span>
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      endpoint="api/fees/budgets"
      columns={columns}
      fields={fields}
      filters={[{ key: 'category', label: 'categories', options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value })) }]}
      searchPlaceholder="Search budgets…"
      defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
      createLabel="New Budget"
      emptyTitle="No budgets defined"
      emptyDescription="Create category-wise budget allocations to track spending against plan."
      transformSave={values => ({
        ...values,
        notes: typeof values.notes === 'string' && values.notes.trim() ? values.notes : null,
        spent: Number(values.spent) || 0,
      })}
    />
  )
}
