'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { BadgeCheck, Loader2, ShieldCheck, Stamp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { api, updateOne, ApiError } from '@/lib/api-client'
import { titleCase } from '@/lib/format'
import { useErp } from '@/lib/store'


const CERT_TYPES = ['TRANSFER', 'BONAFIDE', 'STUDY', 'CONDUCT', 'CHARACTER', 'TRANSCRIPT', 'BIRTH', 'REPORT_CARD']

const TYPE_MAP: Record<string, string> = {
  TRANSFER: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  BONAFIDE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  STUDY: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  CONDUCT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CHARACTER: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  TRANSCRIPT: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  BIRTH: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  REPORT_CARD: 'bg-primary/10 text-primary border-primary/20',
}

const STATUS_MAP: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  VERIFIED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  APPROVED: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  ISSUED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

const columns: Column[] = [
  {
    key: 'studentName', label: 'Student', sortable: false, className: 'min-w-[170px]',
    render: row => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.studentName}</p>
        {row.admissionNo && <p className="truncate text-xs text-muted-foreground">{row.admissionNo}</p>}
      </div>
    ),
  },
  { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
  { key: 'purpose', label: 'Purpose', className: 'min-w-[180px]', render: row => <span className="line-clamp-2">{row.purpose}</span> },
  { key: 'status', label: 'Status', badge: true, badgeMap: STATUS_MAP },
  { key: 'requestedBy', label: 'Requested By', hideOnMobile: true, render: row => row.requestedBy || <span className="text-muted-foreground">—</span> },
  { key: 'createdAt', label: 'Requested On', date: true },
  { key: 'approvedBy', label: 'Approved By', hideOnMobile: true, render: row => row.approvedBy || <span className="text-muted-foreground">—</span> },
  { key: 'remarks', label: 'Remarks', hideOnMobile: true, sortable: false, render: row => row.remarks ? <span className="line-clamp-2 text-muted-foreground">{row.remarks}</span> : <span className="text-muted-foreground">—</span> },
]

export default function RequestsTab() {
  const session = useErp(s => s.session)
  const role = session?.role || ''
  const canManage = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(role)

  const [tick, setTick] = React.useState(0)
  const [acting, setActing] = React.useState<string | null>(null)
  const [rejecting, setRejecting] = React.useState<any | null>(null)
  const [remarks, setRemarks] = React.useState('')
  const [rejectingBusy, setRejectingBusy] = React.useState(false)
  const refresh = React.useCallback(() => setTick(t => t + 1), [])

  const transition = async (row: any, patch: Record<string, any>, successMsg: string) => {
    setActing(row.id)
    try {
      await updateOne('api/certificates', row.id, patch)
      toast.success(successMsg)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not update the request.')
    } finally {
      setActing(null)
    }
  }

  const reject = async () => {
    if (!rejecting) return
    setRejectingBusy(true)
    try {
      await updateOne('api/certificates', rejecting.id, { status: 'REJECTED', remarks: remarks.trim() || 'Rejected after review.' })
      toast.success('Request rejected. The requester has been notified.')
      setRejecting(null)
      setRemarks('')
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not reject the request.')
    } finally {
      setRejectingBusy(false)
    }
  }

  const workflowButtons = (row: any) => {
    if (!canManage) return null
    const busy = acting === row.id
    switch (row.status) {
      case 'PENDING':
        return (
          <>
            <Button variant="outline" size="sm" className="h-8" disabled={busy}
              title="Verify documents" onClick={() => transition(row, { status: 'VERIFIED' }, 'Request verified — ready for approval.')}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />}
              Verify
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 dark:text-rose-400" disabled={busy}
              title="Reject" aria-label="Reject request" onClick={() => { setRejecting(row); setRemarks(row.remarks || '') }}>
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )
      case 'VERIFIED':
        return (
          <>
            <Button variant="outline" size="sm" className="h-8" disabled={busy}
              title="Approve request" onClick={() => transition(row, { status: 'APPROVED' }, 'Request approved — ready for issuance.')}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
              Approve
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 dark:text-rose-400" disabled={busy}
              title="Reject" aria-label="Reject request" onClick={() => { setRejecting(row); setRemarks(row.remarks || '') }}>
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )
      case 'APPROVED':
        return (
          <>
            <Button variant="outline" size="sm" className="h-8" disabled={busy}
              title="Issue certificate" onClick={() => transition(row, { status: 'ISSUED' }, 'Certificate issued with a verification code.')}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Stamp className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
              Issue
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 dark:text-rose-400" disabled={busy}
              title="Reject" aria-label="Reject request" onClick={() => { setRejecting(row); setRemarks(row.remarks || '') }}>
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <>
      <DataTable
        endpoint="api/certificates"
        columns={columns}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        searchPlaceholder="Search purpose, type or requester…"
        filters={[
          { key: 'type', label: 'Types', options: CERT_TYPES.map(t => ({ label: titleCase(t), value: t })) },
          { key: 'status', label: 'Statuses', options: Object.keys(STATUS_MAP).map(s => ({ label: titleCase(s), value: s })) },
        ]}
        refreshKey={tick}
        allowCreate
        allowEdit={false}
        allowDelete={canManage}
        deleteLabelField="type"
        createLabel="Request Certificate"
        fields={[
          {
            name: 'studentId', label: 'Student', type: 'select', required: true,
            optionsLoader: async () => {
              const res = await api<{ data: any[] }>('api/certificates/students')
              return (res.data || []).map((s: any) => ({
                label: `${s.name} (${s.admissionNo}${s.className ? ` · ${s.className}` : ''})`,
                value: s.id,
              }))
            },
          },
          {
            name: 'type', label: 'Certificate Type', type: 'select', required: true,
            options: CERT_TYPES.map(t => ({ label: titleCase(t), value: t })),
          },
          { name: 'purpose', label: 'Purpose', type: 'textarea', required: true, colSpan: 2, placeholder: 'e.g. Passport application, bank account opening…' },
        ]}
        transformSave={(values) => ({ ...values, requestedBy: session?.name })}
        emptyTitle="No certificate requests"
        emptyDescription="Raise a request for bonafide, transfer, study and other student certificates."
        rowActions={workflowButtons}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={v => { if (!v && !rejectingBusy) setRejecting(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject certificate request</DialogTitle>
            <DialogDescription>
              {rejecting ? `${titleCase(rejecting.type)} certificate for ${rejecting.studentName || 'student'} — the requester will be notified with your remarks.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rej-remarks">Remarks</Label>
            <Textarea
              id="rej-remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Reason for rejection, shared with the requester…"
              className="min-h-[90px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={rejectingBusy} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={rejectingBusy}>
              {rejectingBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
