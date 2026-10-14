'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { safeList, personName, STATUS_LABELS } from './helpers'


const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'].map(s => ({ label: STATUS_LABELS[s], value: s }))

export default function StaffAttendance() {
  const [employeeMap, setEmployeeMap] = React.useState<Map<string, any>>(new Map())

  React.useEffect(() => {
    let alive = true
    // Primary endpoint per conventions; fall back to the HR module path if unavailable.
    Promise.all([safeList('api/employees', { all: 1 }), safeList('api/hr/employees', { all: 1 })]).then(([a, b]) => {
      if (!alive) return
      const rows = a.length ? a : b
      setEmployeeMap(new Map<string, any>(rows.map((e: any) => [e.id, e])))
    })
    return () => { alive = false }
  }, [])

  const columns: Column[] = [
    { key: 'date', label: 'Date', date: true, sortable: true },
    {
      key: 'employeeId', label: 'Employee', sortable: false,
      render: (row) => {
        const e = employeeMap.get(row.employeeId)
        return e ? `${personName(e)}${e.employeeNo ? ` · ${e.employeeNo}` : ''}` : '—'
      },
    },
    { key: 'status', label: 'Status', badge: true },
    { key: 'checkInTime', label: 'Check In', hideOnMobile: true },
    { key: 'checkOutTime', label: 'Check Out', hideOnMobile: true },
    {
      key: 'remarks', label: 'Remarks', sortable: false,
      render: (row) => <span className="block max-w-56 truncate text-muted-foreground">{row.remarks || '—'}</span>,
    },
  ]

  const fields: FormField[] = [
    {
      name: 'employeeId', label: 'Employee', type: 'select', required: true, colSpan: 2,
      optionsLoader: async () => {
        const [a, b] = await Promise.all([safeList('api/employees', { all: 1 }), safeList('api/hr/employees', { all: 1 })])
        const rows = a.length ? a : b
        return rows.map((e: any) => ({
          label: `${personName(e)} — ${e.designation || e.employeeNo || 'Staff'}`,
          value: e.id,
        }))
      },
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS, defaultValue: 'PRESENT' },
    { name: 'checkInTime', label: 'Check In Time', type: 'time' },
    { name: 'checkOutTime', label: 'Check Out Time', type: 'time' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
  ]

  const filters: FilterDef[] = [{ key: 'status', label: 'statuses', options: STATUS_OPTIONS }]

  return (
    <DataTable
      endpoint="api/attendance/employee"
      columns={columns}
      fields={fields}
      filters={filters}
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      searchPlaceholder="Search remarks…"
      createLabel="Add Staff Attendance"
      transformSave={(values) => ({
        ...values,
        checkInTime: values.checkInTime || null,
        checkOutTime: values.checkOutTime || null,
        remarks: values.remarks || null,
      })}
      emptyTitle="No staff attendance records"
      emptyDescription="Staff check-in/out records will appear here."
    />
  )
}
