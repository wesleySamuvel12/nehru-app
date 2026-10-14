'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { updateOne, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { fmtDate } from '@/lib/format'
import { safeList, personName } from './helpers'


const TYPE_OPTIONS = ['SICK', 'CASUAL', 'PRIVILEGE', 'MATERNITY', 'EMERGENCY', 'OTHER'].map(t => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), value: t }))

export default function LeaveRequests() {
  const session = useErp(s => s.session)
  const [deciding, setDeciding] = React.useState<string | null>(null)
  const [studentMap, setStudentMap] = React.useState<Map<string, any>>(new Map())
  const [employeeMap, setEmployeeMap] = React.useState<Map<string, any>>(new Map())

  React.useEffect(() => {
    let alive = true
    safeList('api/students', { all: 1 }).then(rows => { if (alive) setStudentMap(new Map(rows.map((s: any) => [s.id, s]))) })
    Promise.all([safeList('api/employees', { all: 1 }), safeList('api/hr/employees', { all: 1 })]).then(([a, b]) => {
      if (alive) setEmployeeMap(new Map((a.length ? a : b).map((e: any) => [e.id, e])))
    })
    return () => { alive = false }
  }, [])

  const decide = async (row: any, status: 'APPROVED' | 'REJECTED', refresh: () => void) => {
    setDeciding(row.id)
    try {
      await updateOne('api/attendance/leave', row.id, {
        status,
        approverName: session?.name || 'School Admin',
        approverId: session?.sub || undefined,
        decidedAt: new Date().toISOString(),
      })
      toast.success(`Leave request ${status === 'APPROVED' ? 'approved' : 'rejected'} — requester has been notified.`)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the leave request.')
    } finally {
      setDeciding(null)
    }
  }

  const columns: Column[] = [
    {
      key: 'requesterName', label: 'Requester', sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.requesterName}</p>
          <p className="text-xs text-muted-foreground">{row.requesterType === 'EMPLOYEE' ? 'Staff' : 'Student'}</p>
        </div>
      ),
    },
    { key: 'type', label: 'Type', badge: true },
    { key: 'fromDate', label: 'From', date: true },
    { key: 'toDate', label: 'To', date: true, hideOnMobile: true },
    {
      key: 'reason', label: 'Reason', sortable: false,
      render: (row) => <span className="line-clamp-2 block max-w-64 text-muted-foreground">{row.reason}</span>,
    },
    { key: 'status', label: 'Status', badge: true },
    {
      key: 'approverName', label: 'Decided By', sortable: false, hideOnMobile: true,
      render: (row) => (
        <div className="text-xs">
          <p>{row.approverName || '—'}</p>
          {row.decidedAt && <p className="text-muted-foreground">{fmtDate(row.decidedAt)}</p>}
        </div>
      ),
    },
  ]

  const fields: FormField[] = [
    { name: 'requesterType', label: 'Requester Type', type: 'select', required: true, options: [
      { label: 'Student', value: 'STUDENT' }, { label: 'Employee', value: 'EMPLOYEE' },
    ], defaultValue: 'STUDENT' },
    {
      name: 'studentId', label: 'Student (for student requests)', type: 'select',
      optionsLoader: async () => (await safeList('api/students', { all: 1 }))
        .map((s: any) => ({ label: personName(s), value: s.id })),
      help: 'Used when requester type is Student.',
    },
    {
      name: 'employeeId', label: 'Employee (for staff requests)', type: 'select',
      optionsLoader: async () => {
        const [a, b] = await Promise.all([safeList('api/employees', { all: 1 }), safeList('api/hr/employees', { all: 1 })])
        return (a.length ? a : b).map((e: any) => ({ label: personName(e), value: e.id }))
      },
      help: 'Used when requester type is Employee.',
    },
    { name: 'type', label: 'Leave Type', type: 'select', required: true, options: TYPE_OPTIONS, defaultValue: 'SICK' },
    { name: 'fromDate', label: 'From Date', type: 'date', required: true },
    { name: 'toDate', label: 'To Date', type: 'date', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea', required: true, colSpan: 2, placeholder: 'Why is leave needed?' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
  ]

  const filters: FilterDef[] = [
    { key: 'status', label: 'statuses', options: [
      { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' },
    ] },
    { key: 'type', label: 'types', options: TYPE_OPTIONS },
    { key: 'requesterType', label: 'requester types', options: [
      { label: 'Student', value: 'STUDENT' }, { label: 'Employee', value: 'EMPLOYEE' },
    ] },
  ]

  return (
    <DataTable
      endpoint="api/attendance/leave"
      columns={columns}
      fields={fields}
      filters={filters}
      defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
      searchPlaceholder="Search requester or reason…"
      createLabel="Add Leave Request"
      rowToForm={(row) => ({
        requesterType: row.requesterType || 'STUDENT',
        studentId: row.requesterType === 'STUDENT' ? row.requesterId : '',
        employeeId: row.requesterType === 'EMPLOYEE' ? row.requesterId : '',
        type: row.type || 'SICK',
        fromDate: row.fromDate ? String(row.fromDate).slice(0, 10) : '',
        toDate: row.toDate ? String(row.toDate).slice(0, 10) : '',
        reason: row.reason || '',
        remarks: row.remarks || '',
      })}
      transformSave={(values) => {
        const isStudent = values.requesterType === 'STUDENT'
        const id: string = (isStudent ? values.studentId : values.employeeId) || ''
        const resolved = personName(isStudent ? studentMap.get(id) : employeeMap.get(id))
        return {
          requesterType: values.requesterType,
          requesterId: id || undefined,
          requesterName: resolved !== 'Unknown' ? resolved : (values.requesterName || undefined),
          type: values.type,
          fromDate: values.fromDate,
          toDate: values.toDate,
          reason: values.reason,
          remarks: values.remarks || null,
        }
      }}
      rowActions={(row, { refresh }) =>
        row.status === 'PENDING' ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              disabled={deciding === row.id} onClick={() => decide(row, 'APPROVED', refresh)}>
              {deciding === row.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button variant="outline" size="sm" className="h-8 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
              disabled={deciding === row.id} onClick={() => decide(row, 'REJECTED', refresh)}>
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        ) : <StatusBadge value={row.status} />
      }
      emptyTitle="No leave requests"
      emptyDescription="Student and staff leave requests will appear here for approval."
    />
  )
}
