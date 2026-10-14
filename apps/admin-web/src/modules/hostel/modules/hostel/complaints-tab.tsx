'use client'

import * as React from 'react'
import { updateOne } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Timer } from 'lucide-react'
import { useStudents } from './use-students'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORY_MAP: Record<string, string> = {
  HOSTEL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  TRANSPORT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  ACADEMICS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  FOOD: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  GENERAL: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
}
const PRIORITY_MAP: Record<string, string> = {
  LOW: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  HIGH: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

export default function ComplaintsTab() {
  const { options: studentOptions } = useStudents()
  const [resolving, setResolving] = React.useState<any | null>(null)
  const [resolution, setResolution] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const patch = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    try {
      await updateOne('api/hostel/complaints', id, body)
      toast.success(okMsg)
      setRefreshKey(k => k + 1)
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the complaint.')
      return false
    }
  }

  const startProgress = async (row: any) => {
    await patch(row.id, { status: 'IN_PROGRESS' }, 'Complaint moved to in-progress — the raiser has been informed.')
  }

  const confirmResolve = async () => {
    if (!resolving) return
    setBusy(true)
    const ok = await patch(resolving.id, {
      status: 'RESOLVED',
      resolution: resolution.trim() || 'Resolved by hostel staff.',
      resolvedAt: new Date().toISOString(),
    }, 'Complaint resolved — notification sent to the raiser.')
    setBusy(false)
    if (ok) { setResolving(null); setResolution('') }
  }

  return (
    <>
      <DataTable
        endpoint="api/hostel/complaints"
        refreshKey={refreshKey}
        columns={[
          { key: 'category', label: 'Category', badge: true, badgeMap: CATEGORY_MAP },
          { key: 'title', label: 'Title', render: r => (
            <div className="min-w-0">
              <p className="max-w-[260px] truncate font-medium">{r.title}</p>
              <p className="max-w-[260px] truncate text-xs text-muted-foreground">{r.description}</p>
            </div>
          ) },
          { key: 'raisedBy', label: 'Raised By' },
          { key: 'priority', label: 'Priority', badge: true, badgeMap: PRIORITY_MAP },
          { key: 'status', label: 'Status', badge: true },
          { key: 'createdAt', label: 'Created', date: true },
          { key: 'resolution', label: 'Resolution', hideOnMobile: true, render: r => r.resolution ? <span className="line-clamp-1 max-w-[220px] text-muted-foreground">{r.resolution}</span> : <span className="text-muted-foreground">—</span> },
        ]}
        fields={[
          {
            name: 'category', label: 'Category', type: 'select', defaultValue: 'HOSTEL',
            options: [{ label: 'Hostel', value: 'HOSTEL' }, { label: 'Transport', value: 'TRANSPORT' }, { label: 'Academics', value: 'ACADEMICS' }, { label: 'Food', value: 'FOOD' }, { label: 'General', value: 'GENERAL' }],
          },
          { name: 'studentId', label: 'Related Student (optional)', type: 'select', options: studentOptions },
          { name: 'title', label: 'Title', required: true, placeholder: 'Hot water not available on 2nd floor' },
          { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2 },
          {
            name: 'priority', label: 'Priority', type: 'select', defaultValue: 'MEDIUM',
            options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }],
          },
        ]}
        filters={[
          { key: 'category', label: 'Categories', options: Object.keys(CATEGORY_MAP).map(c => ({ label: c.charAt(0) + c.slice(1).toLowerCase(), value: c })) },
          { key: 'priority', label: 'Priorities', options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }] },
          { key: 'status', label: 'Statuses', options: [{ label: 'Open', value: 'OPEN' }, { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Resolved', value: 'RESOLVED' }, { label: 'Closed', value: 'CLOSED' }] },
        ]}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        searchPlaceholder="Search complaints…"
        createLabel="Log Complaint"
        emptyTitle="No complaints"
        emptyDescription="Complaints raised by parents and students appear here for follow-up."
        rowActions={(row) => (
          <div className="flex items-center gap-1">
            {row.status === 'OPEN' && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-sky-700 hover:text-sky-700 dark:text-sky-400"
                onClick={() => startProgress(row)}>
                <Timer className="h-3.5 w-3.5" /> Progress
              </Button>
            )}
            {(row.status === 'OPEN' || row.status === 'IN_PROGRESS') && (
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
            <DialogTitle>Resolve complaint</DialogTitle>
            <DialogDescription>
              {resolving?.title} — describe the resolution. The raiser is notified automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="resolution">Resolution</Label>
            <Textarea id="resolution" value={resolution} onChange={e => setResolution(e.target.value)}
              placeholder="e.g. Geyser repaired on Nov 20; hot water restored." />
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
