'use client'

import * as React from 'react'
import { SectionCard, EmptyState, ErrorState } from '@/components/erp/ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, ApiError, createOne, list } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { CalendarPlus, Loader2, Trash2 } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
]
const PERIOD_TIMES = ['08:00-08:45', '08:45-09:30', '09:45-10:30', '10:30-11:15', '11:45-12:30', '12:30-13:15', '13:45-14:30']
const CELL_TONES = [
  'border-l-emerald-500', 'border-l-sky-500', 'border-l-amber-500', 'border-l-violet-500',
  'border-l-rose-500', 'border-l-teal-500', 'border-l-orange-500',
]

interface SlotDialogState {
  open: boolean
  day: number
  period: number
  slot: any | null
}

export default function TimetableTab() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [sections, setSections] = React.useState<any[]>([])
  const [sectionId, setSectionId] = React.useState('')
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [slots, setSlots] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dialog, setDialog] = React.useState<SlotDialogState>({ open: false, day: 1, period: 1, slot: null })

  React.useEffect(() => {
    let alive = true
    list('api/academics/classes', { all: 1 })
      .then(res => { if (alive) setClasses(res.data || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  React.useEffect(() => {
    if (!classId) { setSections([]); setSectionId(''); return }
    let alive = true
    setLoading(true)
    list('api/academics/sections', { classId, all: 1 })
      .then(res => {
        if (!alive) return
        setSections(res.data || [])
        setSectionId(res.data?.[0]?.id || '')
      })
      .catch(() => { if (alive) setSections([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [classId])

  const loadSlots = React.useCallback(() => {
    if (!sectionId) { setSlots([]); return }
    let alive = true
    setLoading(true)
    setError(null)
    list('api/academics/timetables', { sectionId, all: 1 })
      .then(res => { if (alive) setSlots(res.data || []) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [sectionId])

  React.useEffect(() => { loadSlots() }, [loadSlots])

  React.useEffect(() => {
    if (!classId) { setSubjects([]); return }
    let alive = true
    list('api/academics/subjects', { classId, all: 1 })
      .then(res => { if (alive) setSubjects(res.data || []) })
      .catch(() => { if (alive) setSubjects([]) })
    return () => { alive = false }
  }, [classId])

  const slotMap = React.useMemo(() => {
    const map = new Map<string, any>()
    slots.forEach(s => map.set(`${s.dayOfWeek}-${s.period}`, s))
    return map
  }, [slots])

  const subjectById = React.useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])

  const filledCount = slots.length
  const totalCount = DAYS.length * PERIOD_TIMES.length

  return (
    <div className="space-y-4">
      <SectionCard
        title="Weekly timetable"
        description="Pick a class and section, then click any period cell to assign a subject"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classId} onValueChange={v => setClassId(v)}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Select class">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sectionId} onValueChange={v => setSectionId(v)} disabled={!sections.length}>
              <SelectTrigger className="h-9 w-[130px]" aria-label="Select section">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {sections.map(s => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9"
              disabled={!classId || !sectionId}
              onClick={() => setDialog({ open: true, day: 1, period: 1, slot: null })}
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" /> Add Slot
            </Button>
          </div>
        }
      >
        {!classId ? (
          <EmptyState
            title="Select a class"
            description="Choose a class and section above to view or edit its weekly timetable."
          />
        ) : loading && !slots.length ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded bg-muted" />
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" style={{ opacity: 1 - i * 0.12 }} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadSlots} />
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              {filledCount} of {totalCount} periods assigned · {subjects.length} subjects available for this class
            </p>
            <div className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <div className="min-w-[780px]">
                {/* Header row */}
                <div className="grid grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-1.5">
                  <div />
                  {DAYS.map(d => (
                    <div key={d.value} className="rounded-md bg-muted/60 px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {d.label}
                    </div>
                  ))}
                </div>
                {/* Period rows */}
                {PERIOD_TIMES.map((time, pi) => (
                  <div key={time} className="mt-1.5 grid grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-1.5">
                    <div className="flex flex-col justify-center rounded-md border bg-muted/30 px-2 py-1.5 text-center">
                      <span className="text-xs font-semibold">P{pi + 1}</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">{time}</span>
                    </div>
                    {DAYS.map(d => {
                      const slot = slotMap.get(`${d.value}-${pi + 1}`)
                      const subject = slot?.subjectId ? subjectById.get(slot.subjectId) : null
                      const tone = slot ? CELL_TONES[(slot.subjectId || slot.id || '').length % CELL_TONES.length] : ''
                      return (
                        <button
                          key={`${d.value}-${pi + 1}`}
                          type="button"
                          onClick={() => setDialog({ open: true, day: d.value, period: pi + 1, slot: slot || null })}
                          className={cn(
                            'group min-h-[52px] rounded-md border px-2 py-1.5 text-left transition-colors',
                            slot ? cn('border-l-4 bg-card hover:bg-muted/50', tone) : 'border-dashed bg-transparent hover:bg-muted/40',
                          )}
                          aria-label={slot ? `${subject?.name || 'Slot'} ${d.label} P${pi + 1} — edit` : `Assign subject ${d.label} P${pi + 1}`}
                        >
                          {slot ? (
                            <>
                              <p className="truncate text-xs font-medium leading-tight">{subject?.name || 'Free period'}</p>
                              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{slot.room ? `Room ${slot.room}` : '—'}</p>
                            </>
                          ) : (
                            <span className="flex h-full items-center justify-center text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground">
                              + assign
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            {!loading && slots.length === 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No slots yet for this section — click any empty cell or use “Add Slot”.
              </p>
            )}
          </>
        )}
      </SectionCard>

      <SlotDialog
        state={dialog}
        onClose={() => setDialog(d => ({ ...d, open: false }))}
        subjects={subjects}
        classId={classId}
        sectionId={sectionId}
        onSaved={loadSlots}
      />
    </div>
  )
}

function SlotDialog({ state, onClose, onSaved, subjects, classId, sectionId }: {
  state: SlotDialogState
  onClose: () => void
  onSaved: () => void
  subjects: any[]
  classId: string
  sectionId: string
}) {
  const [subjectId, setSubjectId] = React.useState('')
  const [room, setRoom] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)

  React.useEffect(() => {
    if (state.open) {
      setSubjectId(state.slot?.subjectId || '')
      setRoom(state.slot?.room || '')
    }
  }, [state.open, state.slot, state.day, state.period])

  const save = async () => {
    setSaving(true)
    const cleanSubject = subjectId && subjectId !== 'free-period' ? subjectId : null
    try {
      if (state.slot) {
        await api(`/api/academics/timetables/${state.slot.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ subjectId: cleanSubject, room: room || null }),
        })
        toast.success('Slot updated.')
      } else {
        const range = (PERIOD_TIMES[state.period - 1] || '08:00-08:45').split('-')
        await createOne('api/academics/timetables', {
          classId,
          sectionId,
          dayOfWeek: state.day,
          period: state.period,
          subjectId: cleanSubject,
          room: room || null,
          startTime: range[0],
          endTime: range[1],
        })
        toast.success('Slot added to the timetable.')
      }
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!state.slot) return
    setRemoving(true)
    try {
      await api(`/api/academics/timetables/${state.slot.id}`, { method: 'DELETE' })
      toast.success('Slot removed.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setRemoving(false)
    }
  }

  const dayLabel = DAYS.find(d => d.value === state.day)?.label || ''
  const dayEditable = !state.slot

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o && !saving && !removing) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.slot ? 'Edit slot' : 'Assign subject'}</DialogTitle>
          <DialogDescription>
            {dayLabel} · Period {state.period} ({PERIOD_TIMES[state.period - 1]})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {dayEditable ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={String(state.day)} onValueChange={v => setDialog(d => ({ ...d, day: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Select value={String(state.period)} onValueChange={v => setDialog(d => ({ ...d, period: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_TIMES.map((t, i) => <SelectItem key={i + 1} value={String(i + 1)}>P{i + 1} · {t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="free-period">Free period</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Choose “Free period” to leave the slot unassigned.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slot-room">Room</Label>
            <Input id="slot-room" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. R-204 / Physics Lab" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {state.slot ? (
            <Button variant="ghost" className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-600" disabled={saving || removing} onClick={remove}>
              {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving || removing} onClick={onClose}>Cancel</Button>
            <Button disabled={saving || removing} onClick={save}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {state.slot ? 'Save changes' : 'Add slot'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
