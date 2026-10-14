'use client'

/**
 * Payroll Runs tab — run history table + "Run Payroll" dialog that generates
 * payslips for all active employees server-side.
 */
import * as React from 'react'
import { DataTable, Column } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BadgeIndianRupee, CheckCircle2, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, updateOne } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { MONTHS } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PayrollRunsTable({ onChanged }: { onChanged?: () => void }) {
  const [runOpen, setRunOpen] = React.useState(false)
  const [version, setVersion] = React.useState(0)

  const columns: Column[] = [
    {
      key: 'period', label: 'Period', sortable: false,
      render: row => (
        <span className="font-medium">{MONTHS[(Number(row.month) - 1 + 12) % 12] || '—'} {row.year}</span>
      ),
    },
    { key: 'status', label: 'Status', badge: true },
    { key: 'totalAmount', label: 'Net Payout', money: true },
    { key: 'processedBy', label: 'Processed By', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.processedBy || '—'}</span> },
    { key: 'processedAt', label: 'Processed At', dateTime: true },
  ]

  return (
    <>
      <DataTable
        endpoint="api/fees/payroll/runs"
        columns={columns}
        searchPlaceholder={undefined}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        refreshKey={version}
        emptyTitle="No payroll runs yet"
        emptyDescription="Run payroll for a month to generate payslips for every active employee."
        toolbar={() => (
          <Button size="sm" className="h-9" onClick={() => setRunOpen(true)}>
            <Play className="mr-1.5 h-4 w-4" /> Run Payroll
          </Button>
        )}
        rowActions={(row, { refresh }) => row.status === 'PROCESSED' ? (
          <Button
            size="sm" variant="outline" className="h-8"
            disabled={false}
            onClick={async () => {
              try {
                await updateOne('api/fees/payroll/runs', row.id, { status: 'PAID' })
                toast.success(`Payroll for ${MONTHS[row.month - 1]} ${row.year} marked as paid — payslips updated.`)
                refresh()
                onChanged?.()
              } catch (e) {
                toast.error((e as ApiError).message || 'Could not mark payroll as paid.')
              }
            }}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Mark Paid
          </Button>
        ) : null}
      />
      <RunPayrollDialog
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onDone={() => { setVersion(v => v + 1); onChanged?.() }}
      />
    </>
  )
}

function RunPayrollDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [month, setMonth] = React.useState(String(prev.getMonth() + 1))
  const [year, setYear] = React.useState(String(prev.getFullYear()))
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setMonth(String(prev.getMonth() + 1))
      setYear(String(prev.getFullYear()))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    setRunning(true)
    try {
      const res = await api<{ data: any; meta: { employees: number; total: number } }>('/api/fees/payroll/runs', {
        method: 'POST',
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      })
      toast.success(
        `Payroll processed for ${MONTHS[Number(month) - 1]} ${year} — ${res.meta?.employees ?? ''} employees, net ${inr(res.meta?.total ?? res.data?.totalAmount ?? 0)}.`,
      )
      onClose()
      onDone()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not run payroll.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !running) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BadgeIndianRupee className="h-5 w-5 text-primary" /> Run Payroll</DialogTitle>
          <DialogDescription>
            Generates payslips for every active employee — basic + 18% allowances, less 6% deductions and 10% tax. Days present are pulled from staff attendance.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pr-month" className="text-sm">Month <span className="text-rose-500">*</span></Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="pr-month" className="w-full"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-year" className="text-sm">Year <span className="text-rose-500">*</span></Label>
            <Input id="pr-year" type="number" min={2000} max={2100} value={year} onChange={e => setYear(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={running} onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {running ? 'Processing…' : 'Process Payroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
