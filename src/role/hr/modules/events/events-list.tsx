'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Pencil, Plus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { updateOne, ApiError } from '@/lib/api-client'
import { titleCase } from '@/lib/format'
import { useErp } from '@/lib/store'
import EventFormDialog from './event-form-dialog'
import type { SchoolEvent } from './index'


const TYPE_MAP: Record<string, string> = {
  EVENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  HOLIDAY: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  EXAM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  MEETING: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SPORTS: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  TRIP: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  ANNUAL_DAY: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'bg-primary/10 text-primary border-primary/20',
  STUDENTS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PARENTS: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  TEACHERS: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  STAFF: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

export default function EventsListTab({ canCreate, onChanged }: { canCreate: boolean; onChanged: () => void }) {
  const session = useErp(s => s.session)
  const role = session?.role || ''
  const canManage = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(role)

  const [tick, setTick] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SchoolEvent | null>(null)
  const [acting, setActing] = React.useState<string | null>(null)
  const refresh = React.useCallback(() => { setTick(t => t + 1); onChanged() }, [onChanged])

  const setStatus = async (row: SchoolEvent, status: string) => {
    setActing(row.id)
    try {
      await updateOne('api/events', row.id, { status })
      toast.success(`${row.title} marked ${status.toLowerCase()}.`)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the event.')
    } finally {
      setActing(null)
    }
  }

  const columns: Column[] = [
    { key: 'title', label: 'Title', className: 'min-w-[200px]' },
    { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
    { key: 'startDate', label: 'Start Date', date: true },
    { key: 'endDate', label: 'End Date', date: true, hideOnMobile: true },
    { key: 'location', label: 'Location', hideOnMobile: true },
    { key: 'audience', label: 'Audience', badge: true, badgeMap: AUDIENCE_MAP, hideOnMobile: true },
    { key: 'organizerName', label: 'Organizer', hideOnMobile: true, render: row => row.organizerName || <span className="text-muted-foreground">—</span> },
    {
      key: 'registrationRequired', label: 'Registration', sortable: false,
      render: row => (
        <span className={row.registrationRequired
          ? 'inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-sky-700 dark:text-sky-400'
          : 'inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-zinc-700 dark:text-zinc-400'}>
          {row.registrationRequired ? 'Required' : 'Open to all'}
        </span>
      ),
    },
    { key: 'status', label: 'Status', badge: true },
  ]

  return (
    <>
      <DataTable
        endpoint="api/events"
        columns={columns}
        fields={canManage ? [{ name: 'title', label: 'Title', type: 'text', required: true }] : []}
        allowCreate={false}
        allowEdit={false}
        allowDelete={canManage}
        deleteLabelField="title"
        defaultSort={{ sortBy: 'startDate', sortDir: 'asc' }}
        searchPlaceholder="Search events or locations…"
        filters={[
          { key: 'type', label: 'Types', options: Object.keys(TYPE_MAP).map(t => ({ label: titleCase(t), value: t })) },
          {
            key: 'status', label: 'Statuses',
            options: [
              { label: 'Scheduled', value: 'SCHEDULED' },
              { label: 'Ongoing', value: 'ONGOING' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ],
          },
          { key: 'audience', label: 'Audiences', options: Object.keys(AUDIENCE_MAP).map(a => ({ label: titleCase(a), value: a })) },
        ]}
        refreshKey={tick}
        emptyTitle="No events scheduled"
        emptyDescription="Create your first event and it will show up on the school calendar."
        rowActions={(row) => (
          <>
            {canCreate && (
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit event" aria-label="Edit event"
                onClick={() => { setEditing(row); setDialogOpen(true) }}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canCreate && row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" disabled={acting === row.id}
                  title="Mark Completed" aria-label="Mark completed" onClick={() => setStatus(row, 'COMPLETED')}>
                  {acting === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 dark:text-rose-400" disabled={acting === row.id}
                  title="Cancel Event" aria-label="Cancel event" onClick={() => setStatus(row, 'CANCELLED')}>
                  {acting === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                </Button>
              </>
            )}
          </>
        )}
        toolbar={() => canCreate ? (
          <Button size="sm" className="h-9" onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" /> New Event
          </Button>
        ) : null}
      />
      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={refresh} />
    </>
  )
}
