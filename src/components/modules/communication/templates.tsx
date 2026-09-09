'use client'

import * as React from 'react'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { titleCase } from '@/lib/format'


const CHANNEL_MAP: Record<string, string> = {
  IN_APP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  EMAIL: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SMS: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  WHATSAPP: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  PUSH: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

const columns: Column[] = [
  { key: 'key', label: 'Key', render: row => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.key}</code> },
  { key: 'name', label: 'Name' },
  { key: 'channel', label: 'Channel', badge: true, badgeMap: CHANNEL_MAP },
  { key: 'subject', label: 'Subject' },
  { key: 'body', label: 'Body', sortable: false, className: 'min-w-[220px]', render: row => <span className="line-clamp-2 text-muted-foreground">{row.body}</span> },
  {
    key: 'active', label: 'Active', sortable: false,
    render: row => (
      <span className={row.active
        ? 'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-emerald-700 dark:text-emerald-400'
        : 'inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-zinc-700 dark:text-zinc-400'}>
        {row.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
]

export default function TemplatesTab() {
  return (
    <DataTable
      endpoint="api/communication/templates"
      columns={columns}
      defaultSort={{ sortBy: 'key', sortDir: 'asc' }}
      searchPlaceholder="Search templates…"
      filters={[{
        key: 'channel', label: 'Channels',
        options: Object.keys(CHANNEL_MAP).map(c => ({ label: titleCase(c), value: c })),
      }]}
      fields={[
        { name: 'key', label: 'Key', type: 'text', required: true, placeholder: 'e.g. fee_overdue', help: 'Lowercase key used by the system, unique.' },
        { name: 'name', label: 'Name', type: 'text', required: true },
        {
          name: 'channel', label: 'Channel', type: 'select', required: true, defaultValue: 'IN_APP',
          options: Object.keys(CHANNEL_MAP).map(c => ({ label: titleCase(c), value: c })),
        },
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'body', label: 'Body', type: 'textarea', required: true, colSpan: 2, placeholder: 'Dear {{studentName}}, …', help: 'Use {{placeholders}} — they are replaced with record values at send time.' },
        { name: 'active', label: 'Active', type: 'switch', defaultValue: true },
      ]}
      rowToForm={row => ({
        key: row.key, name: row.name, channel: row.channel, subject: row.subject, body: row.body, active: !!row.active,
      })}
      createLabel="New Template"
      emptyTitle="No templates yet"
      emptyDescription="Create reusable message templates with {{placeholders}} for announcements and alerts."
    />
  )
}
