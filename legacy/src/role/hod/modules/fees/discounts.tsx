'use client'

/**
 * Discounts & Scholarships tab — concession catalogue with active toggling.
 */
import * as React from 'react'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { updateOne, ApiError } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { DISCOUNT_TYPE_LABELS, APPLIES_TO_LABELS } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DiscountsTable() {
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const toggleActive = async (row: any, active: boolean, refresh: () => void) => {
    setBusyId(row.id)
    try {
      await updateOne('api/fees/discounts', row.id, { active })
      toast.success(`“${row.name}” ${active ? 'activated' : 'deactivated'}.`)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the discount.')
    } finally {
      setBusyId(null)
    }
  }

  const fields: FormField[] = [
    { name: 'name', label: 'Discount / Scholarship Name', type: 'text', required: true, placeholder: 'Sibling Concession' },
    { name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'PERCENT', options: Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({ label, value })) },
    { name: 'value', label: 'Value', type: 'number', required: true, min: 0, help: 'Percent (0–100) for percent type, rupees for flat amount.' },
    { name: 'reason', label: 'Reason', type: 'text', placeholder: 'Scholarship / Sibling / Staff ward' },
    { name: 'appliesTo', label: 'Applies To', type: 'select', defaultValue: 'ALL', options: Object.entries(APPLIES_TO_LABELS).map(([value, label]) => ({ label, value })) },
    { name: 'targetId', label: 'Target ID (class / student)', type: 'text', placeholder: 'Record ID when not “All students”', colSpan: 2 },
    { name: 'active', label: 'Active', type: 'switch', defaultValue: true },
  ]

  const columns: Column[] = [
    { key: 'name', label: 'Name', render: row => <span className="font-medium">{row.name}</span> },
    {
      key: 'type', label: 'Type', sortable: false,
      render: row => <Badge variant="outline" className="whitespace-nowrap">{DISCOUNT_TYPE_LABELS[row.type] || row.type}</Badge>,
    },
    {
      key: 'value', label: 'Value', sortable: false,
      render: row => (
        <span className="font-medium tabular-nums">
          {row.type === 'PERCENT' ? `${row.value}%` : inr(row.value)}
        </span>
      ),
    },
    { key: 'reason', label: 'Reason', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.reason || '—'}</span> },
    { key: 'appliesTo', label: 'Applies To', sortable: false, hideOnMobile: true, render: row => <span className="text-muted-foreground">{APPLIES_TO_LABELS[row.appliesTo] || row.appliesTo}</span> },
    {
      key: 'active', label: 'Active', sortable: false,
      render: row => (
        <Badge variant="outline" className={row.active
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
          : 'text-muted-foreground'}>
          {row.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <DataTable
      endpoint="api/fees/discounts"
      columns={columns}
      fields={fields}
      filters={[
        { key: 'type', label: 'types', options: Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({ label, value })) },
      ]}
      searchPlaceholder="Search discounts, scholarships…"
      defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
      createLabel="New Discount"
      emptyTitle="No discounts configured"
      emptyDescription="Add concessions and scholarships that can be applied while billing."
      transformSave={values => ({
        ...values,
        reason: typeof values.reason === 'string' && values.reason.trim() ? values.reason : null,
        targetId: typeof values.targetId === 'string' && values.targetId.trim() ? values.targetId : null,
      })}
      rowActions={(row, { refresh }) => (
        <div className="mr-1 flex items-center" onClick={e => e.stopPropagation()}>
          <Switch
            checked={!!row.active}
            disabled={busyId === row.id}
            aria-label={`Toggle ${row.name} ${row.active ? 'inactive' : 'active'}`}
            onCheckedChange={v => toggleActive(row, v, refresh)}
          />
        </div>
      )}
    />
  )
}
