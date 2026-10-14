'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { CalendarDays, Loader2, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { CalendarView } from '@/components/erp/CalendarView'
import { StatusBadge } from '@/components/erp/ui'
import { list, createOne, ApiError } from '@/lib/api-client'
import { fmtDate, titleCase } from '@/lib/format'
import { useErp } from '@/lib/store'
import EventFormDialog from './event-form-dialog'
import type { SchoolEvent } from './index'


export default function CalendarTab({ events, loading, canCreate, onChanged }: {
  events: SchoolEvent[]
  loading: boolean
  canCreate: boolean
  onChanged: () => void
}) {
  const session = useErp(s => s.session)
  const [formOpen, setFormOpen] = React.useState(false)
  const [details, setDetails] = React.useState<SchoolEvent | null>(null)
  const [regLoading, setRegLoading] = React.useState(false)
  const [myReg, setMyReg] = React.useState<any | null>(null)
  const [regCount, setRegCount] = React.useState(0)

  // Load registration state whenever the details dialog opens
  React.useEffect(() => {
    if (!details) return
    let alive = true
    setMyReg(null)
    setRegCount(0)
    list('api/events/registrations', { eventId: details.id, all: 1 })
      .then(res => {
        if (!alive) return
        const rows = res.data || []
        setRegCount(rows.filter((r: any) => r.status !== 'CANCELLED').length)
        setMyReg(rows.find((r: any) => r.userId === session?.sub && r.status !== 'CANCELLED') || null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [details, session?.sub])

  const register = async () => {
    if (!details) return
    setRegLoading(true)
    try {
      await createOne('api/events/registrations', { eventId: details.id })
      toast.success(`Registered for ${details.title}. The organizer has been notified.`)
      setMyReg({ status: 'REGISTERED' })
      setRegCount(c => c + 1)
      onChanged()
    } catch (e) {
      toast.error((e as ApiError).message || 'Registration failed.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <>
      <CalendarView
        events={events}
        loading={loading}
        onCreateClick={canCreate ? () => setFormOpen(true) : undefined}
        onEventClick={(e: any) => setDetails(events.find(ev => ev.id === e.id) || e)}
      />
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} initial={null} onSaved={onChanged} />

      {/* Event details */}
      <Dialog open={!!details} onOpenChange={v => { if (!v) setDetails(null) }}>
        <DialogContent className="sm:max-w-lg">
          {details && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg">{details.title}</DialogTitle>
                  <Badge variant="outline">{titleCase(details.type)}</Badge>
                  <StatusBadge value={details.status} />
                </div>
                <DialogDescription>
                  {fmtDate(details.startDate)}{details.endDate ? ` – ${fmtDate(details.endDate)}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {details.description && <p className="text-muted-foreground">{details.description}</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {details.location || 'Location TBA'}</p>
                  <p className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {titleCase(details.audience)}</p>
                  <p className="text-muted-foreground sm:col-span-2">Organized by {details.organizerName || 'School Administration'}</p>
                </div>
                <Separator />
                {details.registrationRequired ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">Registration required</p>
                      <p className="text-xs text-muted-foreground">
                        {details.capacity ? `${regCount} / ${details.capacity} registered` : `${regCount} registered so far`}
                        {myReg ? ' · You are registered' : ''}
                      </p>
                    </div>
                    {myReg ? (
                      <StatusBadge value={myReg.status || 'REGISTERED'} />
                    ) : details.status === 'SCHEDULED' ? (
                      <Button size="sm" onClick={register} disabled={regLoading}>
                        {regLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CalendarDays className="mr-2 h-4 w-4" /> Register
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Registration closed</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No registration needed for this event.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
