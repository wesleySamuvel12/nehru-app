'use client'

import * as React from 'react'
import { list, updateOne } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { Button } from '@/components/ui/button'
import { useStudents } from './use-students'
import { BusFront, Footprints } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_MAP: Record<string, string> = { BOTH: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', PICKUP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', DROP: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' }
const PICKUP_MAP: Record<string, string> = { 'Picked up': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', 'Dropped': 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', 'Waiting': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' }

export default function AllocationsTab() {
  const { map: studentMap, options: studentOptions, loading: studentsLoading } = useStudents()
  const [routeOptions, setRouteOptions] = React.useState<{ label: string; value: string }[]>([])
  const [stopOptions, setStopOptions] = React.useState<{ label: string; value: string }[]>([])
  const [lookupsReady, setLookupsReady] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    Promise.all([
      list<any>('api/transport/routes', { all: 1 }),
      list<any>('api/transport/stops', { all: 1 }),
    ])
      .then(([routes, stops]) => {
        if (!alive) return
        const routeName: Record<string, string> = {}
        ;(routes.data || []).forEach((r: any) => { routeName[r.id] = r.name })
        setRouteOptions((routes.data || []).map((r: any) => ({ label: r.name, value: r.id })))
        setStopOptions((stops.data || []).map((s: any) => ({ label: `${s.name} — ${routeName[s.routeId] || 'route?'}`, value: s.id })))
        setLookupsReady(true)
      })
      .catch(() => { if (alive) setLookupsReady(true) })
    return () => { alive = false }
  }, [])

  const markStatus = async (row: any, status: string, refresh: () => void) => {
    try {
      await updateOne('api/transport/allocations', row.id, { pickupStatus: status })
      toast.success(`${studentMap[row.studentId]?.name || 'Student'} marked ${status.toLowerCase()}.`)
      refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Could not update pickup status.')
    }
  }

  return (
    <DataTable
      endpoint="api/transport/allocations"
      columns={[
        {
          key: 'studentId', label: 'Student',
          render: r => <span className="font-medium">{studentMap[r.studentId]?.name || <span className="text-muted-foreground">Student #{String(r.studentId).slice(-4)}</span>}</span>,
        },
        { key: 'route', label: 'Route', sortable: false, render: r => r.route?.name || <span className="text-muted-foreground">—</span> },
        { key: 'stop', label: 'Stop', sortable: false, hideOnMobile: true, render: r => r.stop?.name || <span className="text-muted-foreground">—</span> },
        { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
        { key: 'monthlyFee', label: 'Monthly Fee', money: true },
        { key: 'pickupStatus', label: 'Today', badge: true, badgeMap: PICKUP_MAP },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { name: 'studentId', label: 'Student', type: 'select', required: true, options: studentOptions, help: studentsLoading ? 'Loading students…' : undefined },
        { name: 'routeId', label: 'Route', type: 'select', required: true, options: routeOptions },
        { name: 'stopId', label: 'Stop', type: 'select', required: true, options: stopOptions, help: lookupsReady ? 'Stops from all routes — labelled with the route name' : 'Loading stops…' },
        { name: 'monthlyFee', label: 'Monthly Fee (₹)', type: 'number', min: 0 },
        {
          name: 'type', label: 'Service Type', type: 'select', defaultValue: 'BOTH',
          options: [{ label: 'Pickup & Drop', value: 'BOTH' }, { label: 'Pickup only', value: 'PICKUP' }, { label: 'Drop only', value: 'DROP' }],
        },
        {
          name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE',
          options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Ended', value: 'ENDED' }],
        },
      ]}
      filters={[
        { key: 'routeId', label: 'Routes', options: routeOptions },
        { key: 'status', label: 'Statuses', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Ended', value: 'ENDED' }] },
      ]}
      defaultSort={{ sortBy: 'id', sortDir: 'desc' }}
      searchPlaceholder="Search allocations…"
      createLabel="Allocate Transport"
      emptyTitle="No transport allocations"
      emptyDescription="Assign students to a route and stop to start tracking pickups."
      rowActions={(row, { refresh }) => (
        <div className="flex items-center gap-1">
          {row.pickupStatus !== 'Picked up' && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
              onClick={() => markStatus(row, 'Picked up', refresh)}>
              <BusFront className="h-3.5 w-3.5" /> Picked
            </Button>
          )}
          {row.pickupStatus !== 'Dropped' && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-sky-700 hover:text-sky-700 dark:text-sky-400"
              onClick={() => markStatus(row, 'Dropped', refresh)}>
              <Footprints className="h-3.5 w-3.5" /> Dropped
            </Button>
          )}
          <StatusBadge value={row.pickupStatus} map={PICKUP_MAP} className="hidden xl:inline-flex" />
        </div>
      )}
    />
  )
}
