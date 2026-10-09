'use client'

import * as React from 'react'
import { PageHeader, ErrorState } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, List, ClipboardList } from 'lucide-react'
import { list, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import CalendarTab from './calendar-tab'
import EventsListTab from './events-list'
import RegistrationsTab from './registrations'


export interface SchoolEvent {
  id: string
  title: string
  type: string
  description?: string | null
  startDate: string
  endDate?: string | null
  location?: string | null
  audience: string
  organizerName?: string | null
  registrationRequired: boolean
  capacity?: number | null
  status: string
  color: string
}

export default function EventsModule() {
  const session = useErp(s => s.session)
  const role = session?.role || ''
  const canCreate = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(role)

  const [events, setEvents] = React.useState<SchoolEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  const reload = React.useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const res = await list<SchoolEvent>('api/events', { all: 1, sortBy: 'startDate', sortDir: 'asc' })
      setEvents(res.data || [])
    } catch (e) {
      if (!silent) setError((e as ApiError).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => { reload() }, [reload, tick])
  const refresh = React.useCallback(() => setTick(t => t + 1), [])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events & Calendar"
        subtitle="School calendar, event management and registrations"
        breadcrumbs={['Engagement', 'Events']}
      />
      <Tabs defaultValue="calendar">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Calendar</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5"><List className="h-4 w-4" /> Events List</TabsTrigger>
          <TabsTrigger value="registrations" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Registrations</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          {error
            ? <ErrorState message={error} onRetry={() => reload()} />
            : <CalendarTab events={events} loading={loading} canCreate={canCreate} onChanged={refresh} />}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <EventsListTab canCreate={canCreate} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="registrations" className="mt-4">
          <RegistrationsTab events={events} eventsLoading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
