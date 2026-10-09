'use client'

import { DataTable } from '@/components/erp/DataTable'

/* eslint-disable @typescript-eslint/no-explicit-any */

const PURPOSE_MAP: Record<string, string> = {
  MEETING: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  DELIVERY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PARENT_PICKUP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  VENDOR: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  MAINTENANCE: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
}

export default function VisitorLog() {
  return (
    <DataTable
      endpoint="api/security/visitors"
      columns={[
        { key: 'name', label: 'Visitor', render: r => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{r.phone}</p>
          </div>
        ) },
        { key: 'purpose', label: 'Purpose', badge: true, badgeMap: PURPOSE_MAP },
        { key: 'personToMeet', label: 'Person to Meet' },
        { key: 'passNo', label: 'Pass No', render: r => r.passNo ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.passNo}</span> : <span className="text-muted-foreground">—</span> },
        { key: 'vehicleNo', label: 'Vehicle', hideOnMobile: true, render: r => r.vehicleNo || <span className="text-muted-foreground">—</span> },
        { key: 'checkInAt', label: 'Check-in', dateTime: true },
        { key: 'checkOutAt', label: 'Check-out', dateTime: true, hideOnMobile: true },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { name: 'name', label: 'Visitor Name', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+9198xxxxxxxx' },
        { name: 'idProof', label: 'ID Proof', placeholder: 'Aadhaar / DL last 4 digits' },
        {
          name: 'purpose', label: 'Purpose', type: 'select', defaultValue: 'MEETING',
          options: [
            { label: 'Meeting', value: 'MEETING' }, { label: 'Delivery', value: 'DELIVERY' },
            { label: 'Parent Pickup', value: 'PARENT_PICKUP' }, { label: 'Vendor', value: 'VENDOR' },
            { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Other', value: 'OTHER' },
          ],
        },
        { name: 'personToMeet', label: 'Person to Meet', required: true, placeholder: 'Front Office' },
        { name: 'vehicleNo', label: 'Vehicle No', placeholder: 'MH02-AB-123' },
        { name: 'passNo', label: 'Pass No', help: 'Auto-generated (PASS-xxx) if left blank' },
        { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, placeholder: 'Amazon delivery — front office' },
      ]}
      filters={[
        {
          key: 'purpose', label: 'Purposes',
          options: [
            { label: 'Meeting', value: 'MEETING' }, { label: 'Delivery', value: 'DELIVERY' },
            { label: 'Parent Pickup', value: 'PARENT_PICKUP' }, { label: 'Vendor', value: 'VENDOR' },
            { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Other', value: 'OTHER' },
          ],
        },
        { key: 'status', label: 'Statuses', options: [{ label: 'Inside', value: 'INSIDE' }, { label: 'Exited', value: 'EXITED' }, { label: 'Denied', value: 'DENIED' }] },
      ]}
      defaultSort={{ sortBy: 'checkInAt', sortDir: 'desc' }}
      searchPlaceholder="Search name, phone or pass…"
      exportEntity="visitors"
      createLabel="Log Visitor"
      emptyTitle="No visitors logged"
      emptyDescription="Gate entries appear here — use Check In/Out for the fast daily flow."
    />
  )
}
