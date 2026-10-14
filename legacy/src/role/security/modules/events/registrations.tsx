'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { EmptyState } from '@/components/erp/ui'
import { updateOne, ApiError } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import type { SchoolEvent } from './index'


const USER_TYPE_MAP: Record<string, string> = {
  STUDENT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  PARENT: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  STAFF: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const STATUS_MAP: Record<string, string> = {
  REGISTERED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  ATTENDED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

const columns: Column[] = [
  { key: 'userName', label: 'Name', className: 'min-w-[160px]', render: row => row.userName || <span className="text-muted-foreground">—</span> },
  { key: 'userType', label: 'Type', badge: true, badgeMap: USER_TYPE_MAP },
  { key: 'status', label: 'Status', badge: true, badgeMap: STATUS_MAP },
  { key: 'createdAt', label: 'Registered At', dateTime: true },
]

export default function RegistrationsTab({ events, eventsLoading }: { events: SchoolEvent[]; eventsLoading: boolean }) {
  const [eventId, setEventId] = React.useState('')
  const [tick, setTick] = React.useState(0)
  const [acting, setActing] = React.useState<string | null>(null)

  // Default selection: first upcoming scheduled event, else the first event
  React.useEffect(() => {
    if (!eventId && events.length) {
      const upcoming = events.find(e => e.status === 'SCHEDULED' && new Date(e.startDate) >= new Date())
      setEventId((upcoming || events[0]).id)
    }
  }, [events, eventId])

  const selected = events.find(e => e.id === eventId) || null

  const markAttended = async (row: any) => {
    setActing(row.id)
    try {
      await updateOne('api/events/registrations', row.id, { status: 'ATTENDED' })
      toast.success(`${row.userName || 'Attendee'} marked as attended.`)
      setTick(t => t + 1)
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the registration.')
    } finally {
      setActing(null)
    }
  }

  if (!eventsLoading && events.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Create an event with registration enabled to start collecting sign-ups."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full space-y-1.5 sm:max-w-sm">
          <Label htmlFor="reg-event">Event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger id="reg-event" className="w-full">
              <SelectValue placeholder={eventsLoading ? 'Loading events…' : 'Select an event'} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} — {fmtDate(e.startDate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected && (
          <div className="text-sm text-muted-foreground sm:text-right">
            <p className="font-medium text-foreground">{selected.title}</p>
            <p>
              {fmtDate(selected.startDate)} · {selected.location || 'Location TBA'}
              {selected.capacity ? ` · Capacity ${selected.capacity}` : ''}
            </p>
          </div>
        )}
      </div>

      {eventId && (
        <DataTable
          key={eventId}
          endpoint="api/events/registrations"
          columns={columns}
          extraQuery={{ eventId }}
          refreshKey={tick}
          allowCreate={false}
          allowEdit={false}
          allowDelete={false}
          defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
          searchPlaceholder="Search attendees…"
          filters={[{
            key: 'status', label: 'Statuses',
            options: Object.keys(STATUS_MAP).map(s => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })),
          }]}
          emptyTitle="No registrations yet"
          emptyDescription="When people register for this event from the calendar, they will appear here."
          rowActions={(row) => row.status === 'REGISTERED' ? (
            <Button variant="outline" size="sm" className="h-8" disabled={acting === row.id} onClick={() => markAttended(row)}>
              {acting === row.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="mr-1.5 h-3.5 w-3.5" />}
              Mark Attended
            </Button>
          ) : null}
        />
      )}
    </div>
  )
}
