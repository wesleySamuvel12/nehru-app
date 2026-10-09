'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, EmptyState, ErrorState } from '@/components/erp/ui'
import { BedDouble, Building2, DoorOpen, UserCheck, Wrench } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const BED_TONE: Record<string, string> = {
  FREE: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20',
  OCCUPIED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const shortBed = (bedNo: string) => {
  const parts = String(bedNo || '').split('-')
  return parts.length > 1 ? parts[parts.length - 1] : bedNo
}

export default function OccupancyBoard() {
  const [hostels, setHostels] = React.useState<any[]>([])
  const [hostelId, setHostelId] = React.useState<string>('')
  const [rooms, setRooms] = React.useState<any[] | null>(null)
  const [bedsByRoom, setBedsByRoom] = React.useState<Record<string, any[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadHostels = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list<any>('api/hostel/hostels', { all: 1 })
      .then(res => {
        if (!alive) return
        setHostels(res.data || [])
        if (res.data?.length) setHostelId(prev => prev || res.data[0].id)
      })
      .catch((e: any) => { if (alive) setError(e?.message || 'Unable to load hostels') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { loadHostels() }, [loadHostels])

  React.useEffect(() => {
    if (!hostelId) return
    let alive = true
    setRooms(null)
    Promise.all([
      list<any>('api/hostel/rooms', { all: 1, hostelId }),
      list<any>('api/hostel/beds', { all: 1 }),
    ])
      .then(([roomsRes, bedsRes]) => {
        if (!alive) return
        setRooms(roomsRes.data || [])
        const byRoom: Record<string, any[]> = {}
        ;(bedsRes.data || []).forEach((b: any) => {
          ;(byRoom[b.roomId] = byRoom[b.roomId] || []).push(b)
        })
        Object.values(byRoom).forEach(list => list.sort((a, b) => String(a.bedNo).localeCompare(String(b.bedNo))))
        setBedsByRoom(byRoom)
      })
      .catch((e: any) => { if (alive) setError(e?.message || 'Unable to load rooms and beds') })
    return () => { alive = false }
  }, [hostelId])

  if (error) return <ErrorState message={error} onRetry={loadHostels} />
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      </div>
    )
  }
  if (hostels.length === 0) {
    return <EmptyState title="No hostels yet" description="Create a hostel block first — rooms and beds hang off it." icon={<Building2 className="h-7 w-7" />} />
  }

  const hostel = hostels.find(h => h.id === hostelId) || hostels[0]
  const allBeds = Object.values(bedsByRoom).flat()
  const total = allBeds.length
  const occupied = allBeds.filter(b => b.status === 'OCCUPIED').length
  const free = allBeds.filter(b => b.status === 'FREE').length
  const maint = allBeds.filter(b => b.status === 'MAINTENANCE').length
  const pct = total ? Math.round((occupied / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Hostel selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={hostel.id} onValueChange={setHostelId}>
          <SelectTrigger className="w-full sm:w-[280px]" aria-label="Select hostel">
            <SelectValue placeholder="Select hostel" />
          </SelectTrigger>
          <SelectContent>
            {hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{hostel.type}</Badge>
        {hostel.wardenName && <span className="text-sm text-muted-foreground">Warden · {hostel.wardenName}</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Beds" value={total} icon={<BedDouble className="h-5 w-5" />} tone="info" hint={`${(rooms || []).length} rooms`} />
        <StatCard label="Occupied" value={occupied} icon={<UserCheck className="h-5 w-5" />} tone="success" hint={`${pct}% occupancy`} />
        <StatCard label="Free" value={free} icon={<DoorOpen className="h-5 w-5" />} tone="default" hint="Available for allocation" />
        <StatCard label="Maintenance" value={maint} icon={<Wrench className="h-5 w-5" />} tone="warning" hint="Blocked beds" />
      </div>

      {/* Room grid */}
      {rooms === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : rooms.length === 0 ? (
        <EmptyState title="No rooms in this hostel" description="Add rooms in the Rooms & Beds tab, then generate beds for them." icon={<DoorOpen className="h-7 w-7" />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map(room => {
            const beds = bedsByRoom[room.id] || []
            const occ = beds.filter(b => b.status === 'OCCUPIED').length
            const full = beds.length > 0 && occ === beds.length
            return (
              <Card key={room.id} className={cn(
                'overflow-hidden border-l-4',
                room.status === 'MAINTENANCE' ? 'border-l-rose-500' : full ? 'border-l-emerald-500' : occ > 0 ? 'border-l-amber-500' : 'border-l-zinc-300 dark:border-l-zinc-600',
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold leading-tight">Room {room.roomNo}</p>
                      <p className="text-xs text-muted-foreground">Floor {room.floor} · {room.type}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 tabular-nums">{occ}/{beds.length || room.capacity}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {beds.length === 0 && <span className="text-xs text-muted-foreground">No beds yet</span>}
                    {beds.map(b => (
                      <span
                        key={b.id}
                        title={`Bed ${b.bedNo} — ${b.status}`}
                        className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium', BED_TONE[b.status] || BED_TONE.FREE)}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', b.status === 'OCCUPIED' ? 'bg-emerald-500' : b.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-zinc-400')} />
                        {shortBed(b.bedNo)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {room.status === 'MAINTENANCE' ? 'Room under maintenance' : full ? 'Fully occupied' : occ > 0 ? 'Partially occupied' : 'Empty room'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-400" /> Free</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Occupied</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Maintenance</span>
      </div>
    </div>
  )
}
