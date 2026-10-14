'use client'

import * as React from 'react'
import { createOne, updateOne, list, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable, FormFields, validateForm, type FormField } from '@/components/erp/DataTable'
import { SectionCard, StatCard } from '@/components/erp/ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogIn, LogOut, Loader2, Users } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const PURPOSE_MAP: Record<string, string> = {
  MEETING: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  DELIVERY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PARENT_PICKUP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  VENDOR: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  MAINTENANCE: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
}

const CHECKIN_FIELDS: FormField[] = [
  { name: 'name', label: 'Visitor Name', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+9198xxxxxxxx' },
  {
    name: 'purpose', label: 'Purpose', type: 'select', defaultValue: 'MEETING',
    options: [
      { label: 'Meeting', value: 'MEETING' }, { label: 'Delivery', value: 'DELIVERY' },
      { label: 'Parent Pickup', value: 'PARENT_PICKUP' }, { label: 'Vendor', value: 'VENDOR' },
      { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Other', value: 'OTHER' },
    ],
  },
  { name: 'personToMeet', label: 'Person to Meet', required: true, placeholder: 'Front Office' },
  { name: 'idProof', label: 'ID Proof', placeholder: 'Aadhaar / DL last 4 digits' },
  { name: 'vehicleNo', label: 'Vehicle No', placeholder: 'MH02-AB-123' },
]

export default function CheckInOut() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [checkingOut, setCheckingOut] = React.useState<any | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [counts, setCounts] = React.useState<{ inside: number; exited: number } | null>(null)

  /* Quick counts for the summary cards (re-run after every gate action) */
  React.useEffect(() => {
    let alive = true
    Promise.all([
      list<any>('api/security/visitors', { status: 'INSIDE', all: 1 }),
      list<any>('api/security/visitors', { status: 'EXITED', all: 1 }),
    ])
      .then(([a, b]) => { if (alive) setCounts({ inside: a.meta?.total ?? 0, exited: b.meta?.total ?? 0 }) })
      .catch(() => { if (alive) setCounts(null) })
    return () => { alive = false }
  }, [refreshKey])

  const openCheckIn = () => {
    const init: Record<string, any> = {}
    CHECKIN_FIELDS.forEach(f => { init[f.name] = f.defaultValue ?? '' })
    setValues(init)
    setErrors({})
    setDialogOpen(true)
  }

  const submitCheckIn = async () => {
    const errs = validateForm(CHECKIN_FIELDS, values)
    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    try {
      const res = await createOne('api/security/visitors', { ...values, status: 'INSIDE' })
      toast.success(`${(res as any)?.data?.passNo ? `Pass ${(res as any).data.passNo} issued` : 'Visitor'} — ${values.name} checked in.`)
      setDialogOpen(false)
      setRefreshKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Could not check in the visitor.')
    } finally {
      setSaving(false)
    }
  }

  const confirmCheckOut = async () => {
    if (!checkingOut) return
    setBusy(true)
    try {
      await updateOne('api/security/visitors', checkingOut.id, {
        status: 'EXITED',
        checkOutAt: new Date().toISOString(),
      })
      toast.success(`${checkingOut.name} checked out. Pass returned.`)
      setCheckingOut(null)
      setRefreshKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Could not check out the visitor.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Gate summary + action cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Currently Inside"
          value={counts ? counts.inside : '—'}
          icon={<Users className="h-5 w-5" />}
          tone="info"
          hint="Visitors on campus now"
        />
        <StatCard
          label="Checked Out"
          value={counts ? counts.exited : '—'}
          icon={<LogOut className="h-5 w-5" />}
          tone="default"
          hint="In the recent register"
        />
        <button
          type="button"
          onClick={openCheckIn}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-left transition-colors hover:bg-primary/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LogIn className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Check In Visitor</span>
            <span className="block text-xs text-muted-foreground">Issue a gate pass and log entry</span>
          </span>
        </button>
      </div>

      <SectionCard title="Gate Register" description="Every visitor entry — check out anyone still on campus from their row.">
        <DataTable
          endpoint="api/security/visitors"
          refreshKey={refreshKey}
          allowCreate={false}
          allowEdit={false}
          columns={[
            { key: 'name', label: 'Visitor', render: r => (
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{r.phone}</p>
              </div>
            ) },
            { key: 'passNo', label: 'Pass', render: r => r.passNo ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.passNo}</span> : '—' },
            { key: 'purpose', label: 'Purpose', badge: true, badgeMap: PURPOSE_MAP },
            { key: 'personToMeet', label: 'To Meet', hideOnMobile: true },
            { key: 'checkInAt', label: 'Check-in', dateTime: true },
            { key: 'status', label: 'Status', badge: true },
          ]}
          filters={[{ key: 'status', label: 'Statuses', options: [{ label: 'Inside', value: 'INSIDE' }, { label: 'Exited', value: 'EXITED' }] }]}
          defaultSort={{ sortBy: 'checkInAt', sortDir: 'desc' }}
          rowActions={(row) => row.status === 'INSIDE' ? (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-rose-600 hover:text-rose-600 dark:text-rose-400"
              onClick={() => setCheckingOut(row)}>
              <LogOut className="h-3.5 w-3.5" /> Check Out
            </Button>
          ) : null}
          emptyTitle="Gate register is empty"
          emptyDescription="Use “Check In Visitor” above to log the first entry."
        />
      </SectionCard>

      {/* Check-in dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false) }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Check In Visitor</DialogTitle>
            <DialogDescription>Log the entry and issue a pass. Pass number is auto-generated if left blank.</DialogDescription>
          </DialogHeader>
          <FormFields fields={CHECKIN_FIELDS} values={values} setValues={setValues} errors={errors} mode="create" />
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitCheckIn} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out confirm */}
      <Dialog open={!!checkingOut} onOpenChange={(open) => { if (!open && !busy) setCheckingOut(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Check out {checkingOut?.name}?</DialogTitle>
            <DialogDescription>Exit time is recorded as now and the pass is closed.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setCheckingOut(null)}>Cancel</Button>
            <Button onClick={confirmCheckOut} disabled={busy} className="bg-rose-600 hover:bg-rose-700">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Confirm Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
