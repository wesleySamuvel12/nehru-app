'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard, StatusBadge } from '@/components/erp/ui'
import { Badge } from '@/components/ui/badge'
import { MousePointerClick, Route as RouteIcon } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RoutesStopsTab() {
  const [selectedRoute, setSelectedRoute] = React.useState<any>(null)
  const [vehicles, setVehicles] = React.useState<any[] | null>(null)
  const [vehiclesError, setVehiclesError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    list<any>('api/transport/vehicles', { all: 1 })
      .then(res => { if (alive) setVehicles(res.data || []) })
      .catch((e: any) => { if (alive) setVehiclesError(e?.message || 'Unable to load vehicles') })
    return () => { alive = false }
  }, [])

  const vehicleOptions = React.useMemo(
    () => (vehicles || []).map(v => ({ label: `${v.regNo} — ${v.model}`, value: v.id })),
    [vehicles],
  )

  return (
    <div className="space-y-4">
      <SectionCard
        title="Bus Routes"
        description="Click a route to view and manage its stops below."
      >
        <DataTable
          endpoint="api/transport/routes"
          columns={[
            { key: 'name', label: 'Route', render: r => <span className="font-medium">{r.name}</span> },
            { key: 'vehicle', label: 'Vehicle', sortable: false, render: r => r.vehicle ? <Badge variant="outline">{r.vehicle.regNo}</Badge> : <span className="text-muted-foreground">Unassigned</span> },
            { key: 'distanceKm', label: 'Distance', render: r => <span className="tabular-nums">{r.distanceKm} km</span> },
            { key: 'monthlyFee', label: 'Monthly Fee', money: true },
            { key: '_count', label: '# Stops', sortable: false, render: r => <span className="tabular-nums">{r._count?.stops ?? '—'}</span> },
            { key: 'status', label: 'Status', badge: true },
          ]}
          fields={[
            { name: 'name', label: 'Route Name', required: true, placeholder: 'Route 6 — Andheri West' },
            { name: 'vehicleId', label: 'Assigned Vehicle', type: 'select', options: vehicleOptions, help: vehiclesError ? 'Vehicles could not be loaded' : undefined },
            { name: 'distanceKm', label: 'Distance (km)', type: 'number', min: 0 },
            { name: 'monthlyFee', label: 'Monthly Fee (₹)', type: 'number', min: 0 },
            { name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }] },
          ]}
          filters={[{ key: 'status', label: 'Statuses', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }] }]}
          defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
          searchPlaceholder="Search routes…"
          createLabel="Add Route"
          emptyTitle="No routes yet"
          emptyDescription="Create a route, assign a vehicle, then add stops."
          onRowClick={(row) => setSelectedRoute(row)}
        />
      </SectionCard>

      {selectedRoute ? (
        <SectionCard
          title={`Stops — ${selectedRoute.name}`}
          description={selectedRoute.vehicle ? `Operated by ${selectedRoute.vehicle.regNo} · ${selectedRoute.vehicle.driverName || 'driver TBA'}` : 'No vehicle assigned'}
          actions={<StatusBadge value={selectedRoute.status} />}
        >
          <DataTable
            key={selectedRoute.id}
            endpoint="api/transport/stops"
            extraQuery={{ routeId: selectedRoute.id }}
            columns={[
              { key: 'sequence', label: '#', className: 'w-12 tabular-nums font-medium' },
              { key: 'name', label: 'Stop Name', render: r => <span className="font-medium">{r.name}</span> },
              { key: 'pickupTime', label: 'Pickup', render: r => r.pickupTime || <span className="text-muted-foreground">—</span> },
              { key: 'dropTime', label: 'Drop', render: r => r.dropTime || <span className="text-muted-foreground">—</span> },
            ]}
            fields={[
              { name: 'name', label: 'Stop Name', required: true, placeholder: 'Bandra Station (West)' },
              { name: 'sequence', label: 'Sequence', type: 'number', required: true, min: 1, help: 'Order of the stop along the route' },
              { name: 'pickupTime', label: 'Pickup Time', type: 'time' },
              { name: 'dropTime', label: 'Drop Time', type: 'time' },
            ]}
            transformSave={(values) => ({ ...values, routeId: selectedRoute.id })}
            defaultSort={{ sortBy: 'sequence', sortDir: 'asc' }}
            searchPlaceholder="Search stops…"
            createLabel="Add Stop"
            emptyTitle="No stops on this route"
            emptyDescription="Add pickup/drop points in sequence order (1 = first)."
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MousePointerClick className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">Select a route to manage its stops</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Click any route row above to view, add and reorder its pickup/drop points.
              </p>
            </div>
            <RouteIcon className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </SectionCard>
      )}
    </div>
  )
}
