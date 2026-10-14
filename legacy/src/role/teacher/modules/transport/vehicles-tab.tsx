'use client'

import * as React from 'react'
import { DataTable } from '@/components/erp/DataTable'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Date cell that turns red when the expiry is within 60 days (or already past). */
export function ExpiryCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
  const soon = days <= 60
  return (
    <span className={cn('whitespace-nowrap tabular-nums', soon ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
      {fmtDate(value)}
      {soon && <span className="ml-1 text-[10px] font-semibold uppercase">{days < 0 ? 'expired' : `${days}d`}</span>}
    </span>
  )
}

const dateFields = [
  { name: 'licenseExpiry', label: 'License Expiry', type: 'date' as const },
  { name: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' as const },
  { name: 'fitnessExpiry', label: 'Fitness Expiry', type: 'date' as const },
]

export default function VehiclesTab() {
  return (
    <DataTable
      endpoint="api/transport/vehicles"
      columns={[
        { key: 'regNo', label: 'Reg No', render: r => <span className="font-medium">{r.regNo}</span> },
        { key: 'model', label: 'Model' },
        { key: 'capacity', label: 'Seats', className: 'tabular-nums' },
        { key: 'driverName', label: 'Driver', render: r => r.driverName || <span className="text-muted-foreground">—</span> },
        { key: 'driverPhone', label: 'Phone', hideOnMobile: true, render: r => <span className="tabular-nums">{r.driverPhone || '—'}</span> },
        { key: 'status', label: 'Status', badge: true },
        { key: 'insuranceExpiry', label: 'Insurance', render: r => <ExpiryCell value={r.insuranceExpiry} /> },
        { key: 'licenseExpiry', label: 'License', hideOnMobile: true, render: r => <ExpiryCell value={r.licenseExpiry} /> },
        { key: 'fitnessExpiry', label: 'Fitness', defaultHidden: true, render: r => <ExpiryCell value={r.fitnessExpiry} /> },
      ]}
      fields={[
        { name: 'regNo', label: 'Registration No', required: true, placeholder: 'MH02-CV-1234' },
        { name: 'model', label: 'Model', required: true, placeholder: 'Tata Starbus 40-seat' },
        { name: 'capacity', label: 'Seat Capacity', type: 'number', required: true, min: 1, max: 90 },
        { name: 'driverName', label: 'Driver Name' },
        { name: 'driverPhone', label: 'Driver Phone', type: 'tel', placeholder: '+9198xxxxxxxx' },
        { name: 'driverLicense', label: 'License No', placeholder: 'MHxxxxxxxxxx' },
        ...dateFields.slice(0, 1),
        { name: 'attendantName', label: 'Attendant Name' },
        ...dateFields.slice(1),
        {
          name: 'fuelType', label: 'Fuel Type', type: 'select', defaultValue: 'DIESEL',
          options: [{ label: 'Diesel', value: 'DIESEL' }, { label: 'Petrol', value: 'PETROL' }, { label: 'CNG', value: 'CNG' }, { label: 'Electric', value: 'ELECTRIC' }],
        },
        {
          name: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE',
          options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Inactive', value: 'INACTIVE' }],
        },
      ]}
      filters={[{
        key: 'status', label: 'Statuses',
        options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Inactive', value: 'INACTIVE' }],
      }]}
      defaultSort={{ sortBy: 'regNo', sortDir: 'asc' }}
      searchPlaceholder="Search reg no or driver…"
      exportEntity="vehicles"
      createLabel="Add Vehicle"
      emptyTitle="No vehicles yet"
      emptyDescription="Add your first school bus to start tracking routes and live GPS."
    />
  )
}
