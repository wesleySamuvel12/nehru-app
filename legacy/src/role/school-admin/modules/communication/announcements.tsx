'use client'

import * as React from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { titleCase } from '@/lib/format'
import { useErp } from '@/lib/store'
import { COMM_MANAGEMENT } from './constants'
import AnnouncementDialog from './announcement-dialog'


const PRIORITY_MAP: Record<string, string> = {
  URGENT: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  HIGH: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  NORMAL: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  LOW: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

const TYPE_MAP: Record<string, string> = {
  ANNOUNCEMENT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  CIRCULAR: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  EMERGENCY: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  EVENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REMINDER: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'bg-primary/10 text-primary border-primary/20',
  STUDENTS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PARENTS: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  TEACHERS: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  STAFF: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

function ChannelChips({ value }: { value?: string | null }) {
  const channels = String(value || '').split(',').map(c => c.trim()).filter(Boolean)
  if (!channels.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex max-w-[170px] flex-wrap gap-1">
      {channels.map(ch => (
        <span key={ch} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-4">
          {ch.replace('_', '-')}
        </span>
      ))}
    </div>
  )
}

const columns: Column[] = [
  { key: 'title', label: 'Title', className: 'min-w-[220px]' },
  { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
  { key: 'audience', label: 'Audience', badge: true, badgeMap: AUDIENCE_MAP },
  { key: 'priority', label: 'Priority', badge: true, badgeMap: PRIORITY_MAP },
  { key: 'channels', label: 'Channels', sortable: false, render: (row) => <ChannelChips value={row.channels} /> },
  { key: 'publishedBy', label: 'Published By', hideOnMobile: true, render: (row) => row.publishedBy || <span className="text-muted-foreground">—</span> },
  { key: 'publishAt', label: 'Publish At', date: true },
  { key: 'status', label: 'Status', badge: true },
]

export default function AnnouncementsTab() {
  const session = useErp(s => s.session)
  const role = session?.role || ''
  const canPublish = COMM_MANAGEMENT.includes(role) || role === 'TEACHER'
  const canDelete = COMM_MANAGEMENT.includes(role)

  const [tick, setTick] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const refresh = React.useCallback(() => setTick(t => t + 1), [])

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (row: any) => { setEditing(row); setDialogOpen(true) }

  return (
    <>
      <DataTable
        endpoint="api/communication/announcements"
        columns={columns}
        // fields kept only to enable the built-in delete action for managers
        fields={canDelete ? [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'body', label: 'Body', type: 'textarea', required: true, colSpan: 2 },
        ] : []}
        allowCreate={false}
        allowEdit={false}
        allowDelete={canDelete}
        deleteLabelField="title"
        defaultSort={{ sortBy: 'publishAt', sortDir: 'desc' }}
        searchPlaceholder="Search announcements…"
        filters={[
          {
            key: 'type', label: 'Types',
            options: Object.keys(TYPE_MAP).map(t => ({ label: titleCase(t), value: t })),
          },
          {
            key: 'priority', label: 'Priorities',
            options: Object.keys(PRIORITY_MAP).map(p => ({ label: titleCase(p), value: p })),
          },
          {
            key: 'status', label: 'Statuses',
            options: [
              { label: 'Published', value: 'PUBLISHED' },
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Archived', value: 'ARCHIVED' },
            ],
          },
        ]}
        refreshKey={tick}
        emptyTitle="No announcements yet"
        emptyDescription="Publish your first announcement or circular to keep the school community informed."
        rowActions={(row) => canPublish ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit announcement" aria-label="Edit announcement" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <StatusBadge value={row.status} />
        )}
        toolbar={() => canPublish ? (
          <Button size="sm" className="h-9" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New Announcement
          </Button>
        ) : null}
      />
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={refresh}
      />
    </>
  )
}
