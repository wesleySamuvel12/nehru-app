'use client'

/**
 * Payslips tab — run selector, payout summary and printable payslips.
 */
import * as React from 'react'
import { DataTable, Column } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer } from 'lucide-react'
import { inr } from '@/lib/format'
import { list, ApiError } from '@/lib/api-client'
import { useEmployees, printPayslip, monthYearLabel, MONTHS } from './helpers'
import { ErrorState } from '@/components/erp/ui'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Run { id: string; month: number; year: number; status: string; totalAmount: number }

export default function PayslipsView({ version = 0 }: { version?: number }) {
  const [runs, setRuns] = React.useState<Run[] | null>(null)
  const [runsError, setRunsError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<string>('ALL')
  const { nameOf, employees } = useEmployees()

  const loadRuns = React.useCallback(() => {
    setRunsError(null)
    list<Run>('api/fees/payroll/runs', { all: 1 })
      .then(res => setRuns(res.data))
      .catch((e: ApiError) => setRunsError(e.message))
  }, [])

  React.useEffect(() => { loadRuns() }, [loadRuns, version])

  const selectedRun = runs?.find(r => r.id === selected)
  const totalPayout = React.useMemo(() => {
    if (!runs || runs.length === 0) return 0
    return selectedRun ? selectedRun.totalAmount : runs.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0)
  }, [runs, selectedRun])

  const employeeOf = React.useCallback((id: string) => employees.find((e: any) => e.id === id), [employees])

  const columns: Column[] = [
    { key: 'employeeName', label: 'Employee', sortable: false, render: row => <span className="block max-w-[170px] truncate font-medium" title={nameOf(row.employeeId)}>{nameOf(row.employeeId)}</span> },
    { key: 'basic', label: 'Basic', money: true },
    { key: 'allowances', label: 'Allowances', money: true },
    { key: 'deductions', label: 'Deductions', money: true },
    { key: 'tax', label: 'Tax (TDS)', money: true },
    { key: 'netPay', label: 'Net Pay', money: true },
    { key: 'daysPresent', label: 'Days Present', render: row => <span className="tabular-nums">{row.daysPresent ?? 0}<span className="text-muted-foreground"> / {row.daysPaid ?? 30}</span></span> },
    { key: 'status', label: 'Status', badge: true },
  ]

  if (runsError) return <ErrorState message={runsError} onRetry={loadRuns} />

  return (
    <div className="space-y-4">
      {/* Run selector + payout summary */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Payroll run:</span>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full sm:w-[310px]" aria-label="Select payroll run">
              <SelectValue placeholder="Select a payroll run" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="ALL">All runs</SelectItem>
              {(runs || []).map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {monthYearLabel(r.month, r.year)} — {r.status.toLowerCase()} · {inr(r.totalAmount, true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border bg-card px-3 py-1.5">
            <span className="text-muted-foreground">Net payout </span>
            <span className="font-semibold tabular-nums">{inr(totalPayout)}</span>
          </span>
          <span className="rounded-lg border bg-card px-3 py-1.5">
            <span className="text-muted-foreground">{selectedRun ? 'Run status ' : 'Runs '}</span>
            <span className="font-semibold">{selectedRun ? selectedRun.status.toLowerCase() : runs?.length ?? 0}</span>
          </span>
        </div>
      </div>

      {selectedRun && (
        <p className="text-xs text-muted-foreground">
          {MONTHS[selectedRun.month - 1]} {selectedRun.year} run {selectedRun.status === 'PAID' ? 'processed and paid out' : 'processed — pending bank transfer'}.
        </p>
      )}

      <DataTable
        key={selected}
        endpoint="api/fees/payroll/payslips"
        columns={columns}
        extraQuery={selected !== 'ALL' ? { payrollRunId: selected } : {}}
        defaultSort={{ sortBy: 'netPay', sortDir: 'desc' }}
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        hideToolbar
        emptyTitle="No payslips for this selection"
        emptyDescription="Run payroll for a month to generate payslips for every active employee."
        rowActions={(row) => {
          const emp = employeeOf(row.employeeId)
          return (
            <Button
              size="icon" variant="outline" className="h-8 w-8" title="Print Payslip" aria-label="Print payslip"
              onClick={() => printPayslip({
                employeeName: nameOf(row.employeeId),
                employeeNo: emp?.employeeNo,
                designation: emp?.designation,
                department: emp?.department,
                period: selectedRun ? monthYearLabel(selectedRun.month, selectedRun.year) : 'Payroll register',
                basic: row.basic, allowances: row.allowances, deductions: row.deductions, tax: row.tax,
                netPay: row.netPay, daysPresent: row.daysPresent, daysPaid: row.daysPaid,
                status: selectedRun?.status || row.status,
                bankAccount: emp?.bankAccount,
              })}
            >
              <Printer className="h-4 w-4" />
            </Button>
          )
        }}
      />
    </div>
  )
}
