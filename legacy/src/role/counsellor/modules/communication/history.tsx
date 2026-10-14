'use client'

import * as React from 'react'
import { Info } from 'lucide-react'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { titleCase } from '@/lib/format'


const CHANNEL_MAP: Record<string, string> = {
  IN_APP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  EMAIL: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SMS: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  WHATSAPP: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  PUSH: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

const TYPE_MAP: Record<string, string> = {
  INFO: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SUCCESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  WARNING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  DANGER: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  ALERT: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

const columns: Column[] = [
  { key: 'title', label: 'Title', className: 'min-w-[180px]' },
  { key: 'message', label: 'Message', sortable: false, className: 'min-w-[220px]', render: row => <span className="line-clamp-2 text-muted-foreground">{row.message}</span> },
  { key: 'channel', label: 'Channel', badge: true, badgeMap: CHANNEL_MAP },
  { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
  { key: 'createdAt', label: 'Sent At', dateTime: true },
  {
    key: 'read', label: 'Read', sortable: false,
    render: row => (
      <span className={row.read
        ? 'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-emerald-700 dark:text-emerald-400'
        : 'inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-amber-700 dark:text-amber-400'}>
        {row.read ? 'Read' : 'Unread'}
      </span>
    ),
  },
]

export default function HistoryTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <p>
          Every in-app notification fanned out by the communication engine, across all users.
          <span className="font-medium text-foreground"> EMAIL / SMS / WHATSAPP rows are simulated deliveries</span> recorded when announcements select those channels.
        </p>
      </div>
      <DataTable
        endpoint="api/communication/history"
        columns={columns}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        defaultPageSize={25}
        pageSizeOptions={[25, 50, 100]}
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        searchPlaceholder="Search deliveries…"
        filters={[{
          key: 'channel', label: 'Channels',
          options: Object.keys(CHANNEL_MAP).map(c => ({ label: titleCase(c), value: c })),
        }]}
        emptyTitle="No deliveries yet"
        emptyDescription="Publish an announcement to see its audience deliveries appear here."
      />
    </div>
  )
}
