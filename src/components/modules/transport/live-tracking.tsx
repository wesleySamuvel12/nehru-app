'use client'

import * as React from 'react'
import { api, ApiError, list } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ErrorState, EmptyState } from '@/components/erp/ui'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/format'
import { Bus, Crosshair, Gauge, Info, MapPin, RefreshCw, RadioTower } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── Mumbai demo bounding box (kept in sync with /api/transport/vehicles/gps-sim) ── */
const BOX = { latMin: 19.0, latMax: 19.15, lngMin: 72.78, lngMax: 72.9 }
const SCHOOL = { lat: 19.082, lng: 72.856 }

const pct = (v: number, min: number, max: number) => Math.min(97, Math.max(3, ((v - min) / (max - min)) * 100))
const latPct = (lat: number) => pct(BOX.latMax - lat, 0, BOX.latMax - BOX.latMin) // north → top
const lngPct = (lng: number) => pct(lng, BOX.lngMin, BOX.lngMax)

function busPos(v: any) {
  const lat = typeof v?.gpsLat === 'number' ? v.gpsLat : 19.07
  const lng = typeof v?.gpsLng === 'number' ? v.gpsLng : 72.84
  return { top: latPct(lat), left: lngPct(lng) }
}

function BusMarker({ v, selected, onSelect }: { v: any; selected: boolean; onSelect: () => void }) {
  const { top, left } = busPos(v)
  const moving = (v.speedKmph ?? 0) > 0
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Bus ${v.regNo}${moving ? ' moving' : ' idle'}`}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus:outline-none"
      style={{ top: `${top}%`, left: `${left}%` }}
    >
      <span className="relative flex h-4 w-4">
        {moving && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
        <span className={cn(
          'relative inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125',
          moving ? 'bg-emerald-500' : 'bg-zinc-400',
          selected && 'ring-2 ring-primary ring-offset-2',
        )} />
      </span>
      <span className={cn(
        'pointer-events-none flex flex-col items-center rounded-md border bg-popover/95 px-1.5 py-0.5 text-[10px] leading-tight shadow-sm backdrop-blur transition-opacity',
        selected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100',
      )}>
        <span className="font-semibold tracking-tight">{v.regNo}</span>
        <span className="text-muted-foreground">{v.driverName || 'Driver TBA'}</span>
        <span className={cn('font-medium tabular-nums', moving ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
          {Math.round(v.speedKmph ?? 0)} km/h
        </span>
      </span>
    </button>
  )
}

export default function LiveTracking() {
  const [vehicles, setVehicles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [simming, setSimming] = React.useState(false)
  const [auto, setAuto] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [lastTick, setLastTick] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list<any>('api/transport/vehicles', { all: 1 })
      .then(res => { if (alive) setVehicles(res.data || []) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { load() }, [load])

  const simulate = React.useCallback(async (silent = false) => {
    if (simming) return
    setSimming(true)
    try {
      const res = await api<{ data: { at: string } }>('/api/transport/vehicles/gps-sim', { method: 'POST' })
      setLastTick(res.data?.at || new Date().toISOString())
      const fresh = await list<any>('api/transport/vehicles', { all: 1 })
      setVehicles(fresh.data || [])
    } catch {
      if (!silent) toast.error('Could not refresh GPS — please try again.')
    } finally {
      setSimming(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simming])

  /* Auto GPS tick every 15s while enabled */
  React.useEffect(() => {
    if (!auto) return
    const id = window.setInterval(() => { simulate(true) }, 15000)
    return () => window.clearInterval(id)
  }, [auto, simulate])

  const movingCount = vehicles.filter(v => (v.speedKmph ?? 0) > 0).length
  const selected = vehicles.find(v => v.id === selectedId) || null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />
  if (vehicles.length === 0) {
    return <EmptyState title="No vehicles in the fleet" description="Add buses in the Vehicles tab to see them on the live map." icon={<Bus className="h-7 w-7" />} />
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-800 dark:text-sky-300">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>GPS simulation for demo — positions jitter inside a Mumbai bounding box. Press <b>Refresh GPS</b> to move the fleet{lastTick ? ` · last tick ${timeAgo(lastTick)}` : ''}.</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {movingCount} moving
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> {vehicles.length - movingCount} idle
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={auto} onCheckedChange={setAuto} aria-label="Auto refresh GPS every 15 seconds" />
            Auto (15s)
          </label>
          <Button size="sm" onClick={() => simulate(false)} disabled={simming}>
            {simming ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <RadioTower className="mr-1.5 h-4 w-4" />}
            Refresh GPS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stylized map */}
        <div className="lg:col-span-2">
          <div
            className="relative h-[380px] overflow-hidden rounded-xl border bg-muted/20 sm:h-[460px]"
            role="img"
            aria-label="Stylized live map of bus positions in Mumbai"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          >
            {/* Sea on the west edge */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-sky-500/15 to-transparent" />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium uppercase tracking-[0.3em] text-sky-700/50 dark:text-sky-300/40">Arabian Sea</span>
            {/* A couple of stylized roads */}
            <div className="pointer-events-none absolute left-[8%] top-[62%] h-[3px] w-[84%] -rotate-6 rounded bg-amber-500/25" />
            <div className="pointer-events-none absolute left-[30%] top-[8%] h-[86%] w-[3px] rotate-6 rounded bg-amber-500/20" />
            <div className="pointer-events-none absolute left-[55%] top-[20%] h-[3px] w-[40%] rotate-12 rounded bg-amber-500/15" />

            {/* School pin */}
            <div className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ top: `${latPct(SCHOOL.lat)}%`, left: `${lngPct(SCHOOL.lng)}%` }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <span className="mt-1 whitespace-nowrap rounded-md border bg-popover/95 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm">Greenwood Intl. School</span>
            </div>

            {vehicles.map(v => (
              <BusMarker key={v.id} v={v} selected={v.id === selectedId} onSelect={() => setSelectedId(v.id === selectedId ? null : v.id)} />
            ))}

            {/* Legend */}
            <div className="absolute bottom-2 right-2 flex items-center gap-3 rounded-md border bg-popover/95 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Moving</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> Idle</span>
              <span className="flex items-center gap-1"><Crosshair className="h-3 w-3" /> Tap a bus</span>
            </div>
          </div>
        </div>

        {/* Fleet side list */}
        <Card className="h-fit">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Fleet Status</h3>
              <span className="text-xs text-muted-foreground">{vehicles.length} buses</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2 [scrollbar-width:thin]">
              {vehicles.map(v => {
                const moving = (v.speedKmph ?? 0) > 0
                const active = v.status !== 'ACTIVE'
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                    className={cn(
                      'mb-1.5 flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                      v.id === selectedId ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/40',
                    )}
                  >
                    <span className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      active ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : moving ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500',
                    )}>
                      <Bus className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.regNo} <span className="font-normal text-muted-foreground">· {v.model}</span></p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.driverName || 'Driver TBA'} · GPS {v.lastGpsAt ? timeAgo(v.lastGpsAt) : '—'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('text-sm font-semibold tabular-nums', moving ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                        {Math.round(v.speedKmph ?? 0)} <span className="text-[10px] font-normal">km/h</span>
                      </p>
                      <p className={cn('text-[10px] font-medium', moving ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                        {active ? v.status : moving ? 'MOVING' : 'IDLE'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            {selected && (
              <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selected.regNo}</span> · {selected.capacity} seats · fuel {selected.fuelType}
                {selected.attendantName ? ` · attendant ${selected.attendantName}` : ''}
                <span className="mt-0.5 flex items-center gap-1"><Gauge className="h-3 w-3" /> {selected.driverPhone || 'No contact on record'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
