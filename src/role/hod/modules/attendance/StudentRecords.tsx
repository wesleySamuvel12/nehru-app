'use client'

import * as React from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { fmtDate } from '@/lib/format'
import { safeList, personName, STATUS_LABELS, loadSectionOptions } from './helpers'


const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'].map(s => ({ label: STATUS_LABELS[s], value: s }))

export default function StudentRecords() {
  const [studentMap, setStudentMap] = React.useState<Map<string, any>>(new Map())
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [rangeOpen, setRangeOpen] = React.useState(false)
  const [sectionOpts, setSectionOpts] = React.useState<{ label: string; value: string }[]>([])

  React.useEffect(() => {
    let alive = true
    safeList('api/students', { all: 1 }).then(rows => {
      if (!alive) return
      const m = new Map<string, any>(rows.map((s: any) => [s.id, s]))
      setStudentMap(m)
    })
    loadSectionOptions().then(opts => { if (alive) setSectionOpts(opts) })
    return () => { alive = false }
  }, [])

  const columns: Column[] = [
    { key: 'date', label: 'Date', date: true, sortable: true },
    {
      key: 'studentId', label: 'Student', sortable: false,
      render: (row) => {
        const s = studentMap.get(row.studentId)
        return s ? `${personName(s)}${s.admissionNo ? ` · ${s.admissionNo}` : ''}` : '—'
      },
    },
    { key: 'status', label: 'Status', badge: true },
    { key: 'checkInTime', label: 'Check In', hideOnMobile: true },
    { key: 'checkOutTime', label: 'Check Out', hideOnMobile: true },
    {
      key: 'remarks', label: 'Remarks', sortable: false,
      render: (row) => <span className="block max-w-56 truncate text-muted-foreground">{row.remarks || '—'}</span>,
    },
    {
      key: 'notified', label: 'Parent Notified', sortable: false,
      render: (row) => row.notified
        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Yes</span>
        : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /> No</span>,
    },
  ]

  const fields: FormField[] = [
    {
      name: 'studentId', label: 'Student', type: 'select', required: true, colSpan: 2,
      optionsLoader: async () => (await safeList('api/students', { all: 1 }))
        .map((s: any) => ({ label: `${personName(s)}${s.admissionNo ? ` (${s.admissionNo})` : ''}`, value: s.id })),
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS, defaultValue: 'PRESENT' },
    { name: 'checkInTime', label: 'Check In Time', type: 'time' },
    { name: 'checkOutTime', label: 'Check Out Time', type: 'time' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2, placeholder: 'Reason, informed-by, etc.' },
  ]

  const filters: FilterDef[] = [
    { key: 'status', label: 'statuses', options: STATUS_OPTIONS },
    { key: 'sectionId', label: 'sections', options: sectionOpts },
  ]

  const rangeLabel = dateFrom || dateTo
    ? `${dateFrom ? fmtDate(dateFrom) : 'Start'} → ${dateTo ? fmtDate(dateTo) : 'Now'}`
    : 'Date range'

  return (
    <DataTable
      endpoint="api/attendance"
      columns={columns}
      fields={fields}
      filters={filters}
      defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
      searchPlaceholder="Search remarks…"
      exportEntity="attendance"
      createLabel="Add Record"
      transformSave={(values) => ({
        ...values,
        checkInTime: values.checkInTime || null,
        checkOutTime: values.checkOutTime || null,
        remarks: values.remarks || null,
      })}
      extraQuery={{ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }}
      emptyTitle="No attendance records"
      emptyDescription="Attendance marked in the Mark Attendance tab appears here."
      toolbar={({ refresh }) => (
        <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={rangeLabel !== 'Date range' ? 'border-primary/50' : ''}>
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); refresh() }}>Clear</Button>
              <Button size="sm" onClick={() => { setRangeOpen(false); refresh() }}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    />
  )
}
