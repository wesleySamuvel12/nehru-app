'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtTime } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CalendarViewMode = 'month' | 'week' | 'agenda'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }

/** Simple event calendar with month / week / agenda views. Events: {id,title,startDate,endDate,type,color} */
export function CalendarView({ events, initialMode = 'month', onEventClick, onCreateClick, loading }: {
  events: any[]
  initialMode?: CalendarViewMode
  onEventClick?: (e: any) => void
  onCreateClick?: () => void
  loading?: boolean
}) {
  const [mode, setMode] = React.useState<CalendarViewMode>(initialMode)
  const [cursor, setCursor] = React.useState(() => startOfDay(new Date()))

  const monthGrid = React.useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const weekDays = React.useMemo(() => {
    const start = new Date(cursor)
    start.setDate(cursor.getDate() - cursor.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const eventsFor = (d: Date) => events.filter(e => sameDay(new Date(e.startDate), d))

  const agenda = React.useMemo(() => {
    const now = startOfDay(new Date())
    return [...events]
      .filter(e => new Date(e.startDate) >= now)
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
  }, [events])

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftCursor(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftCursor(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-semibold">
            {mode === 'week' ? `${MONTHS[weekDays[0].getMonth()].slice(0, 3)} ${weekDays[0].getDate()} – ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}` : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCreateClick && <Button size="sm" className="h-8" onClick={onCreateClick}>+ Event</Button>}
          <div className="flex rounded-lg border p-0.5">
            {(['month', 'week', 'agenda'] as CalendarViewMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {mode === 'month' && (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_LABELS.map(d => <div key={d} className="py-1 text-center text-[11px] font-medium uppercase text-muted-foreground">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((d, i) => {
                const evts = eventsFor(d)
                const isToday = sameDay(d, new Date())
                const otherMonth = d.getMonth() !== cursor.getMonth()
                return (
                  <div key={i} className={cn('min-h-[72px] rounded-md border p-1 transition-colors sm:min-h-[92px]',
                    otherMonth ? 'bg-muted/30 text-muted-foreground/50' : 'bg-card hover:bg-muted/40')}>
                    <div className={cn('mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium',
                      isToday && 'bg-primary text-primary-foreground')}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {evts.slice(0, 2).map(e => (
                        <button key={e.id} onClick={() => onEventClick?.(e)}
                          className={cn('block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium sm:text-[11px]',
                            `bg-${e.color || 'emerald'}-500/10 text-${e.color || 'emerald'}-700 dark:text-${e.color || 'emerald'}-400`)}>
                          {e.title}
                        </button>
                      ))}
                      {evts.length > 2 && <p className="px-1 text-[10px] text-muted-foreground">+{evts.length - 2} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {mode === 'week' && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => {
              const evts = eventsFor(d)
              const isToday = sameDay(d, new Date())
              return (
                <div key={d.toISOString()} className={cn('min-h-[280px] rounded-md border p-2', isToday && 'border-primary/50 bg-primary/5')}>
                  <p className={cn('mb-2 text-xs font-semibold', isToday && 'text-primary')}>{DAY_LABELS[d.getDay()]} {d.getDate()}</p>
                  <div className="space-y-1.5">
                    {evts.map(e => (
                      <button key={e.id} onClick={() => onEventClick?.(e)}
                        className="block w-full rounded-md bg-emerald-500/10 px-2 py-1.5 text-left text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                        <span className="block truncate">{e.title}</span>
                        <span className="text-[10px] opacity-70">{e.location || fmtTime(e.startDate)}</span>
                      </button>
                    ))}
                    {evts.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {mode === 'agenda' && (
          <div className="space-y-2">
            {agenda.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No upcoming events scheduled.</p>}
            {agenda.map(e => (
              <button key={e.id} onClick={() => onEventClick?.(e)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-[10px] font-medium uppercase">{MONTHS[new Date(e.startDate).getMonth()].slice(0, 3)}</span>
                  <span className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.type?.replace(/_/g, ' ')}{e.location ? ` · ${e.location}` : ''}{e.registrationRequired ? ' · Registration required' : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{fmtTime(e.startDate)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  function shiftCursor(dir: number) {
    const d = new Date(cursor)
    if (mode === 'week') d.setDate(d.getDate() + dir * 7)
    else if (mode === 'agenda') d.setDate(d.getDate() + dir * 30)
    else d.setMonth(d.getMonth() + dir)
    setCursor(startOfDay(d))
  }
}
