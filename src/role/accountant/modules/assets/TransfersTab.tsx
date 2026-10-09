'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { useErp } from '@/lib/store'
import { toast } from 'sonner'
import { createOne, ApiError } from '@/lib/api-client'
import { Loader2, PackageOpen, Plus, Undo2 } from 'lucide-react'
import { useAssets, TRANSFER_TO_TYPES } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const titleize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function TransfersTab() {
  const session = useErp((s) => s.session)
  const dir = useAssets()

  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [assetId, setAssetId] = React.useState('')
  const [toType, setToType] = React.useState('CLASS')
  const [toName, setToName] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [returningId, setReturningId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refresh = () => { setRefreshKey((k) => k + 1); dir.reload() }

  const openDialog = () => { setAssetId(''); setToType('CLASS'); setToName(''); setReason(''); setOpen(true) }

  const handleTransfer = async () => {
    if (!assetId) { toast.error('Select the asset to transfer.'); return }
    if (!toName.trim()) { toast.error('Enter who or where the asset goes to.'); return }
    const asset = dir.assetOf(assetId)
    setSaving(true)
    try {
      await createOne('api/assets/transfers', {
        assetId,
        fromType: 'STORE',
        fromName: asset?.location || 'Main Store',
        toType,
        toName: toName.trim(),
        reason: reason.trim() || null,
      })
      toast.success(`“${asset?.name || 'Asset'}” transferred to ${toName.trim()} and marked in use.`)
      setOpen(false)
      refresh()
    } catch (e) { toast.error((e as ApiError).message) } finally { setSaving(false) }
  }

  const handleReturn = async (row: any) => {
    setReturningId(row.id)
    try {
      await createOne('api/assets/transfers', {
        assetId: row.assetId,
        fromType: row.toType,
        fromName: row.toName,
        toType: 'STORE',
        toName: 'Main Store',
        reason: 'Returned to store',
      })
      toast.success(`“${dir.nameOf(row.assetId)}” returned to the Main Store.`)
      refresh()
    } catch (e) { toast.error((e as ApiError).message) } finally { setReturningId(null) }
  }

  const availableAssets = dir.assets.filter((a) => a.status === 'AVAILABLE' || a.status === 'MAINTENANCE')

  return (
    <>
      <DataTable
        endpoint="api/assets/transfers"
        searchPlaceholder="Search asset or holder…"
        exportEntity={undefined}
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        refreshKey={refreshKey}
        defaultSort={{ sortBy: 'date', sortDir: 'desc' }}
        emptyTitle="No transfers recorded"
        emptyDescription="Transfer an available asset to a class, room, employee or student — every movement is logged here."
        toolbar={() => (
          <Button size="sm" className="h-9" onClick={openDialog}><Plus className="mr-1.5 h-4 w-4" /> Transfer Asset</Button>
        )}
        columns={[
          { key: 'assetId', label: 'Asset', render: (row) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{dir.loading ? '…' : dir.nameOf(row.assetId)}</p>
              {(() => { const a = dir.assetOf(row.assetId); return a?.location ? <p className="truncate text-xs text-muted-foreground">{a.location}</p> : null })()}
            </div>
          ) },
          { key: 'fromName', label: 'From', render: (row) => row.fromName || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
          { key: 'toType', label: 'To (type)', badge: true, badgeMap: {
            CLASS: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
            ROOM: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
            EMPLOYEE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
            STUDENT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
            STORE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
          } },
          { key: 'toName', label: 'To' },
          { key: 'reason', label: 'Reason', render: (row) => row.reason || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
          { key: 'date', label: 'Date', date: true },
          { key: 'byName', label: 'By', hideOnMobile: true, render: (row) => row.byName || <span className="text-muted-foreground">—</span> },
        ]}
        rowActions={(row) => {
          const asset = dir.assetOf(row.assetId)
          const canReturn = row.toType !== 'STORE' && asset && asset.status === 'IN_USE'
          if (!canReturn) return null
          return (
            <Button size="sm" variant="outline" className="h-8" disabled={returningId === row.id}
              title="Return this asset to the Main Store" onClick={() => handleReturn(row)}>
              {returningId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              <span className="ml-1.5 hidden sm:inline">Return</span>
            </Button>
          )
        }}
      />

      {/* Transfer dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) setOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5 text-primary" /> Transfer Asset
            </DialogTitle>
            <DialogDescription>Hand over an available asset. The register status updates to “In use” automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tr-asset">Asset *</Label>
              <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger id="tr-asset" className="w-full">
                  <SelectValue placeholder={dir.loading ? 'Loading assets…' : 'Select an available asset'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableAssets.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {dir.loading ? 'Loading…' : 'No assets are currently available in the store.'}
                    </div>
                  )}
                  {availableAssets.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.assetTag}) · {a.location || 'Main Store'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assetId && (() => {
                const a = dir.assetOf(assetId)
                return a ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge value={a.status} />
                    <StatusBadge value={a.condition} map={{
                      NEW: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
                      GOOD: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
                      WORN: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                      NEEDS_REPAIR: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
                    }} />
                  </div>
                ) : null
              })()}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tr-type">Transfer to</Label>
                <Select value={toType} onValueChange={setToType}>
                  <SelectTrigger id="tr-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSFER_TO_TYPES.map((t) => <SelectItem key={t} value={t}>{titleize(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-name">{titleize(toType)} name *</Label>
                <Input id="tr-name" value={toName} onChange={(e) => setToName(e.target.value)}
                  placeholder={toType === 'CLASS' ? 'e.g. Grade 8-A' : toType === 'ROOM' ? 'e.g. Principal Office' : 'e.g. Sunita Desai'} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-reason">Reason</Label>
              <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New smart board installation" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
