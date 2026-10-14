'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard } from '@/components/erp/ui'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MousePointerClick } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_MAP: Record<string, string> = {
  SHARED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  SINGLE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  DORMITORY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

export default function RoomsBedsTab() {
  const [hostels, setHostels] = React.useState<any[]>([])
  const [hostelId, setHostelId] = React.useState('')
  const [selectedRoom, setSelectedRoom] = React.useState<any>(null)
  const [hostelOptions, setHostelOptions] = React.useState<{ label: string; value: string }[]>([])

  React.useEffect(() => {
    let alive = true
    list<any>('api/hostel/hostels', { all: 1 })
      .then(res => {
        if (!alive) return
        setHostels(res.data || [])
        setHostelOptions((res.data || []).map((h: any) => ({ label: h.name, value: h.id })))
        if (res.data?.length) setHostelId(prev => prev || res.data[0].id)
      })
      .catch(() => { /* the DataTable still surfaces API errors */ })
    return () => { alive = false }
  }, [])

  const hostel = hostels.find(h => h.id === hostelId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={hostelId} onValueChange={(v) => { setHostelId(v); setSelectedRoom(null) }}>
          <SelectTrigger className="w-full sm:w-[280px]" aria-label="Select hostel">
            <SelectValue placeholder="Select hostel" />
          </SelectTrigger>
          <SelectContent>
            {hostelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {hostel && <Badge variant="outline">{hostel.type}</Badge>}
      </div>

      {hostelId ? (
        <SectionCard title={`Rooms — ${hostel?.name || ''}`} description="Click a room to manage its beds below.">
          <DataTable
            key={hostelId}
            endpoint="api/hostel/rooms"
            extraQuery={{ hostelId }}
            columns={[
              { key: 'roomNo', label: 'Room No', render: r => <span className="font-medium">{r.roomNo}</span> },
              { key: 'floor', label: 'Floor', render: r => <span className="tabular-nums">{r.floor}</span> },
              { key: 'capacity', label: 'Capacity', className: 'tabular-nums' },
              { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
              { key: '_count', label: 'Beds', sortable: false, render: r => <span className="tabular-nums">{r._count?.beds ?? '—'}</span> },
              { key: 'status', label: 'Status', badge: true },
            ]}
            fields={[
              { name: 'roomNo', label: 'Room No', required: true, placeholder: '101' },
              { name: 'floor', label: 'Floor', type: 'number', min: 0, defaultValue: 1 },
              { name: 'capacity', label: 'Capacity', type: 'number', min: 1, defaultValue: 4 },
              {
                name: 'type', label: 'Room Type', type: 'select', defaultValue: 'SHARED',
                options: [{ label: 'Shared', value: 'SHARED' }, { label: 'Single', value: 'SINGLE' }, { label: 'Dormitory', value: 'DORMITORY' }],
              },
              {
                name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE',
                options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Maintenance', value: 'MAINTENANCE' }],
              },
            ]}
            transformSave={(values) => ({ ...values, hostelId })}
            defaultSort={{ sortBy: 'roomNo', sortDir: 'asc' }}
            searchPlaceholder="Search room no…"
            createLabel="Add Room"
            emptyTitle="No rooms in this hostel"
            emptyDescription="Add rooms floor by floor, then select one to create its beds."
            onRowClick={(row) => setSelectedRoom(row)}
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyStateInCard />
        </SectionCard>
      )}

      {selectedRoom ? (
        <SectionCard
          title={`Beds — Room ${selectedRoom.roomNo}`}
          description="Mark beds FREE / OCCUPIED / MAINTENANCE. Occupancy updates the board instantly."
        >
          <DataTable
            key={selectedRoom.id}
            endpoint="api/hostel/beds"
            extraQuery={{ roomId: selectedRoom.id }}
            columns={[
              { key: 'bedNo', label: 'Bed No', render: r => <span className="font-medium">{r.bedNo}</span> },
              { key: 'status', label: 'Status', badge: true },
            ]}
            fields={[
              { name: 'bedNo', label: 'Bed No', required: true, placeholder: `${selectedRoom.roomNo}-B1` },
              {
                name: 'status', label: 'Status', type: 'select', defaultValue: 'FREE',
                options: [{ label: 'Free', value: 'FREE' }, { label: 'Occupied', value: 'OCCUPIED' }, { label: 'Maintenance', value: 'MAINTENANCE' }],
              },
            ]}
            transformSave={(values) => ({ ...values, roomId: selectedRoom.id })}
            defaultSort={{ sortBy: 'bedNo', sortDir: 'asc' }}
            searchPlaceholder="Search beds…"
            createLabel="Add Bed"
            emptyTitle="No beds in this room"
            emptyDescription="Add beds (e.g. 101-B1 … 101-B4) so students can be allocated."
          />
        </SectionCard>
      ) : hostelId ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MousePointerClick className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">Select a room to manage its beds</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Click any room row above to add beds or flip their status.</p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}

function EmptyStateInCard() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <MousePointerClick className="h-7 w-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Create a hostel first (or wait for the list to load).</p>
    </div>
  )
}
