'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard, EmptyState, ErrorState, StatusBadge } from '@/components/erp/ui'
import { toast } from 'sonner'
import { updateOne, ApiError } from '@/lib/api-client'
import { fmtDate, inr } from '@/lib/format'
import { Loader2, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'
import { CONDITION_BADGE_MAP, CATEGORY_BADGE_MAP, warrantyState, type AssetDirectory } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MaintenanceTab({ dir }: { dir: AssetDirectory }) {
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const assets = React.useMemo(
    () => dir.assets.filter((a) => a.condition === 'NEEDS_REPAIR' || a.status === 'MAINTENANCE'),
    [dir.assets],
  )

  const warrantyAlerts = React.useMemo(() => {
    return dir.assets
      .filter((a) => warrantyState(a.warrantyExpiry) !== 'ok')
      .sort((a, b) => new Date(a.warrantyExpiry).getTime() - new Date(b.warrantyExpiry).getTime())
  }, [dir.assets])

  const patchAsset = async (row: any, data: Record<string, unknown>, msg: string) => {
    setBusyId(row.id)
    try {
      await updateOne('api/assets/items', row.id, data)
      toast.success(msg)
      dir.reload()
    } catch (e) { toast.error((e as ApiError).message) } finally { setBusyId(null) }
  }

  const completeMaintenance = (row: any) =>
    patchAsset(
      row,
      { lastMaintenance: new Date().toISOString(), status: 'AVAILABLE', condition: 'GOOD' },
      `“${row.name}” serviced — back in the store and available.`,
    )

  const sendToMaintenance = (row: any) =>
    patchAsset(row, { status: 'MAINTENANCE' }, `“${row.name}” moved to maintenance.`)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Needs Attention"
        description="Assets flagged as needing repair or currently under maintenance"
        actions={
          <Button variant="outline" size="sm" className="h-8" onClick={dir.reload} aria-label="Refresh maintenance list">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
        contentClassName="p-0"
      >
        {dir.loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" style={{ opacity: 1 - i * 0.2 }} />)}</div>
        ) : dir.error ? (
          <ErrorState message="Could not load the asset register." onRetry={dir.reload} />
        ) : assets.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-7 w-7" />}
            title="Nothing needs repair"
            description="All assets are healthy. Flag an asset as NEEDS_REPAIR from the register when required."
          />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Asset</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Value</TableHead>
                  <TableHead className="text-right">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => {
                  const busy = busyId === a.id
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium">{a.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{a.assetTag}{a.location ? ` · ${a.location}` : ''}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge value={a.category} map={CATEGORY_BADGE_MAP} />
                      </TableCell>
                      <TableCell><StatusBadge value={a.condition} map={CONDITION_BADGE_MAP} /></TableCell>
                      <TableCell><StatusBadge value={a.status} /></TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">{inr(a.currentValue ?? a.purchaseCost)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {a.condition === 'NEEDS_REPAIR' && a.status !== 'MAINTENANCE' && (
                            <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => sendToMaintenance(a)}>
                              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wrench className="mr-1.5 h-3.5 w-3.5" />}
                              To Maintenance
                            </Button>
                          )}
                          {a.status === 'MAINTENANCE' ? (
                            <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => completeMaintenance(a)}>
                              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                              Complete
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-8" disabled={busy}
                              title="Log servicing and mark available"
                              onClick={() => completeMaintenance(a)}>
                              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                              Mark Serviced
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Warranty Alerts"
        description="Expired or expiring within 90 days"
        actions={<Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> {warrantyAlerts.length} alert{warrantyAlerts.length === 1 ? '' : 's'}</Badge>}
        contentClassName="p-0"
      >
        {warrantyAlerts.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">All warranties are in good standing.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {warrantyAlerts.map((a) => {
              const state = warrantyState(a.warrantyExpiry)
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.assetTag}{a.location ? ` · ${a.location}` : ''}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      state === 'expired'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }
                  >
                    {state === 'expired' ? 'Expired' : 'Expiring'} · {fmtDate(a.warrantyExpiry)}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
