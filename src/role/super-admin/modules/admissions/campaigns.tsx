'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { CAMPAIGN_SOURCES, SOURCE_LABELS } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

const SOURCE_TONE: Record<string, string> = {
  GOOGLE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SOCIAL: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  OFFLINE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  REFERRAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

const columns: Column[] = [
  { key: 'name', label: 'Campaign' },
  { key: 'source', label: 'Source', render: row => <StatusBadge value={row.source} map={SOURCE_TONE} /> },
  { key: 'budget', label: 'Budget', money: true },
  { key: 'spend', label: 'Spend', money: true },
  { key: 'leadsCount', label: 'Leads' },
  { key: 'conversions', label: 'Conversions' },
  {
    key: 'conversionRate', label: 'Conversion %', sortable: false,
    render: row => {
      const pct = row.leadsCount ? Math.round((row.conversions / row.leadsCount) * 1000) / 10 : 0
      return (
        <span className={pct >= 15 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : pct >= 8 ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
          {pct}%
        </span>
      )
    },
  },
  { key: 'status', label: 'Status', badge: true },
  { key: 'startDate', label: 'Start Date', date: true, hideOnMobile: true },
  { key: 'endDate', label: 'End Date', date: true, defaultHidden: true },
]

const fields: FormField[] = [
  { name: 'name', label: 'Campaign Name', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Google Ads — Admissions 2026' },
  {
    name: 'source', label: 'Source', type: 'select', required: true,
    options: CAMPAIGN_SOURCES.map(s => ({ label: SOURCE_LABELS[s] || s, value: s })),
  },
  {
    name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE',
    options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Paused', value: 'PAUSED' }, { label: 'Completed', value: 'COMPLETED' }],
  },
  { name: 'budget', label: 'Budget (₹)', type: 'number', min: 0 },
  { name: 'spend', label: 'Spend (₹)', type: 'number', min: 0 },
  { name: 'startDate', label: 'Start Date', type: 'date', required: true },
  { name: 'endDate', label: 'End Date', type: 'date' },
  { name: 'leadsCount', label: 'Leads Generated', type: 'number', min: 0 },
  { name: 'conversions', label: 'Conversions', type: 'number', min: 0 },
]

function cleanPayload(values: Record<string, any>) {
  return {
    ...values,
    endDate: values.endDate || null,
  }
}

export default function CampaignsTab() {
  return (
    <DataTable
      endpoint="api/admissions/campaigns"
      columns={columns}
      fields={fields}
      transformSave={cleanPayload}
      defaultSort={{ sortBy: 'startDate', sortDir: 'desc' }}
      searchPlaceholder="Search campaigns…"
      createLabel="Add Campaign"
      filters={[
        { key: 'source', label: 'Sources', options: CAMPAIGN_SOURCES.map(s => ({ label: SOURCE_LABELS[s] || s, value: s })) },
        { key: 'status', label: 'Statuses', options: [
          { label: 'Active', value: 'ACTIVE' }, { label: 'Paused', value: 'PAUSED' }, { label: 'Completed', value: 'COMPLETED' },
        ] },
      ]}
      emptyTitle="No campaigns yet"
      emptyDescription="Track marketing spend and the leads each campaign brings in."
      deleteLabelField="name"
    />
  )
}
