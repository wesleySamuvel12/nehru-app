'use client'

/**
 * Expenses tab — school spend ledger with Approve / Reject row actions.
 */
import * as React from 'react'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateOne, ApiError } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { CATEGORY_LABELS } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'].map(s => ({ label: s, value: s }))

export default function ExpensesTable() {
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const decide = async (row: any, status: 'APPROVED' | 'REJECTED', refresh: () => void) => {
    setBusyId(row.id)
    try {
      await updateOne('api/fees/expenses', row.id, { status })
      toast.success(`Expense “${row.title}” ${status === 'APPROVED' ? 'approved' : 'rejected'}.`)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the expense.')
    } finally {
      setBusyId(null)
    }
  }

  const fields: FormField[] = [
    { name: 'title', label: 'Expense Title', type: 'text', required: true, placeholder: 'Faculty salaries — November' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value })) },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'date', label: 'Expense Date', type: 'date', required: true },
    { name: 'vendor', label: 'Vendor / Payee', type: 'text', placeholder: 'e.g. Adani Electricity' },
    { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: [
      { label: 'Bank Transfer', value: 'BANK_TRANSFER' }, { label: 'UPI', value: 'UPI' }, { label: 'Cash', value: 'CASH' },
      { label: 'Card', value: 'CARD' }, { label: 'Cheque', value: 'CHEQUE' },
    ] },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, placeholder: 'Optional detail for the approval trail' },
  ]

  const columns: Column[] = [
    { key: 'title', label: 'Expense', render: row => <span className="font-medium">{row.title}</span> },
    {
      key: 'category', label: 'Category', sortable: false,
      render: row => <Badge variant="outline" className="whitespace-nowrap">{CATEGORY_LABELS[row.category] || row.category}</Badge>,
    },
    { key: 'amount', label: 'Amount', money: true },
    { key: 'date', label: 'Date', date: true },
    { key: 'vendor', label: 'Vendor', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.vendor || '—'}</span> },
    { key: 'status', label: 'Status', badge: true },
    { key: 'approvedBy', label: 'Approved By', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.approvedBy || '—'}</span> },
  ]

  return (
    <DataTable
      endpoint="api/fees/expenses"
      columns={columns}
      fields={fields}
      filters={[
        { key: 'status', label: 'statuses', options: STATUS_OPTIONS },
        { key: 'category', label: 'categories', options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value })) },
      ]}
      searchPlaceholder="Search expenses or vendors…"
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      exportEntity="expenses"
      createLabel="Record Expense"
      emptyTitle="No expenses recorded"
      emptyDescription="Log school spend here — pending items can be approved or rejected from the row actions."
      transformSave={values => ({
        ...values,
        description: typeof values.description === 'string' && values.description.trim() ? values.description : null,
      })}
      rowActions={(row, { refresh }) => row.status === 'PENDING' ? (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" disabled={busyId === row.id}
            title="Approve" aria-label={`Approve ${row.title}`} onClick={() => decide(row, 'APPROVED', refresh)}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 text-rose-600 dark:text-rose-400" disabled={busyId === row.id}
            title="Reject" aria-label={`Reject ${row.title}`} onClick={() => decide(row, 'REJECTED', refresh)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    />
  )
}
