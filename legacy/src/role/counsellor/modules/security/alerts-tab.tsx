'use client'

import * as React from 'react'
import { updateOne } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Search } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const SEVERITY_MAP: Record<string, string> = {
  LOW: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  HIGH: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}
const TYPE_MAP: Record<string, string> = {
  INTRUSION: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  FIGHT: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  MEDICAL: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  FIRE: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  THEFT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LOST_ITEM: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
}

export default function AlertsTab() {
  const [resolving, setResolving] = React.useState<any | null>(null)
  const [resolution, setResolution] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const investigate = async (row: any) => {
    try {
      await updateOne('api/security/alerts', row.id, { status: 'INVESTIGATING' })
      toast.success('Alert marked as investigating — admins can see the status change.')
      setRefreshKey(k => k + 1)
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the alert.')
    }
  }

  const confirmResolve = async () => {
    if (!resolving) return
    setBusy(true)
    try {
      await updateOne('api/security/alerts', resolving.id, {
        status: 'RESOLVED',
        resolution: resolution.trim() || 'Resolved by security staff.',
        resolvedAt: new Date().toISOString(),
      })
      toast.success('Alert resolved and closed.')
      setResolving(null)
      setResolution('')
      setRefreshKey(k => k + 1)
    } catch (e: any) {
      toast.error(e?.message || 'Could not resolve the alert.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DataTable
        endpoint="api/security/alerts"
        refreshKey={refreshKey}
        columns={[
          { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
          { key: 'description', label: 'Description', sortable: false, render: r => <span className="line-clamp-2 max-w-[280px] text-sm">{r.description}</span> },
          { key: 'severity', label: 'Severity', badge: true, badgeMap: SEVERITY_MAP },
          { key: 'location', label: 'Location', hideOnMobile: true, render: r => r.location || <span className="text-muted-foreground">—</span> },
          { key: 'status', label: 'Status', badge: true },
          { key: 'raisedBy', label: 'Raised By', hideOnMobile: true },
          { key: 'createdAt', label: 'Created', date: true },
          { key: 'resolution', label: 'Resolution', defaultHidden: true, render: r => r.resolution ? <span className="line-clamp-1 max-w-[220px] text-muted-foreground">{r.resolution}</span> : <span className="text-muted-foreground">—</span> },
        ]}
        fields={[
          {
            name: 'type', label: 'Alert Type', type: 'select', required: true, defaultValue: 'OTHER',
            options: [
              { label: 'Intrusion', value: 'INTRUSION' }, { label: 'Fight', value: 'FIGHT' },
              { label: 'Medical', value: 'MEDICAL' }, { label: 'Fire', value: 'FIRE' },
              { label: 'Theft', value: 'THEFT' }, { label: 'Lost Item', value: 'LOST_ITEM' },
              { label: 'Other', value: 'OTHER' },
            ],
          },
          {
            name: 'severity', label: 'Severity', type: 'select', defaultValue: 'MEDIUM',
            options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }],
            help: 'CRITICAL/HIGH instantly notify admins & principal',
          },
          { name: 'location', label: 'Location', placeholder: 'Back Gate, Assembly Ground…' },
          { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, placeholder: 'What happened, who is involved, immediate action taken…' },
        ]}
        filters={[
          { key: 'severity', label: 'Severities', options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }] },
          { key: 'status', label: 'Statuses', options: [{ label: 'Open', value: 'OPEN' }, { label: 'Investigating', value: 'INVESTIGATING' }, { label: 'Resolved', value: 'RESOLVED' }] },
        ]}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        searchPlaceholder="Search alerts…"
        createLabel="Raise Alert"
        emptyTitle="No security alerts"
        emptyDescription="All clear. Raised alerts notify admins and the principal automatically."
        rowActions={(row) => (
          <div className="flex items-center gap-1">
            {row.status === 'OPEN' && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-sky-700 hover:text-sky-700 dark:text-sky-400"
                onClick={() => investigate(row)}>
                <Search className="h-3.5 w-3.5" /> Investigate
              </Button>
            )}
            {row.status !== 'RESOLVED' && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
                onClick={() => { setResolving(row); setResolution('') }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </Button>
            )}
          </div>
        )}
      />

      <Dialog open={!!resolving} onOpenChange={(open) => { if (!open && !busy) { setResolving(null); setResolution('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve security alert</DialogTitle>
            <DialogDescription>
              {resolving?.type?.replace(/_/g, ' ')} — {resolving?.location || 'no location'}. Record what was done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="alert-resolution">Resolution</Label>
            <Textarea id="alert-resolution" value={resolution} onChange={e => setResolution(e.target.value)}
              placeholder="e.g. Person identified as parent of Grade 2 student; gate protocol reinforced." />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => { setResolving(null); setResolution('') }}>Cancel</Button>
            <Button onClick={confirmResolve} disabled={busy}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
