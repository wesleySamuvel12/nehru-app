'use client'

import * as React from 'react'
import { list } from '@/lib/api-client'
import { ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionCard, StatCard, EmptyState, TableSkeleton, ErrorState } from '@/components/erp/ui'
import { ExpiryCell } from './vehicles-tab'
import { cn } from '@/lib/utils'
import { AlertTriangle, BadgeCheck, FileCheck2, ShieldAlert, Bus, ShieldPlus } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const WINDOW_DAYS = 60

interface DocRow { vehicle: any; kind: string; date: string; days: number }

export default function ExpiryDocsTab() {
  const { setModule } = useErp()
  const [vehicles, setVehicles] = React.useState<any[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    let alive = true
    setError(null)
    list<any>('api/transport/vehicles', { all: 1 })
      .then(res => { if (alive) setVehicles(res.data || []) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState message={error} onRetry={load} />
  if (vehicles === null) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl border bg-card" />)}</div>
        <TableSkeleton rows={4} />
      </div>
    )
  }

  const DOCS: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'insuranceExpiry', label: 'Insurance', icon: <ShieldAlert className="h-5 w-5" /> },
    { key: 'fitnessExpiry', label: 'Fitness', icon: <FileCheck2 className="h-5 w-5" /> },
    { key: 'licenseExpiry', label: 'Driver License', icon: <BadgeCheck className="h-5 w-5" /> },
  ]

  const rows: DocRow[] = []
  for (const v of vehicles) {
    for (const d of DOCS) {
      if (!v[d.key]) continue
      const days = Math.ceil((new Date(v[d.key]).getTime() - Date.now()) / 86400000)
      if (days <= WINDOW_DAYS) rows.push({ vehicle: v, kind: d.label, date: v[d.key], days })
    }
  }
  rows.sort((a, b) => a.days - b.days)

  const counts = DOCS.map(d => ({
    ...d,
    n: vehicles.filter(v => v[d.key] && (new Date(v[d.key]).getTime() - Date.now()) / 86400000 <= WINDOW_DAYS).length,
  }))
  const expired = rows.filter(r => r.days < 0).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Fleet Size" value={vehicles.length} icon={<Bus className="h-5 w-5" />} tone="info" hint="Registered vehicles" />
        {counts.map(c => (
          <StatCard
            key={c.key}
            label={`${c.label} ≤ ${WINDOW_DAYS}d`}
            value={c.n}
            icon={c.icon}
            tone={c.n === 0 ? 'success' : c.n > 2 ? 'danger' : 'warning'}
            hint={c.n === 0 ? 'All documents current' : `${c.n} vehicle(s) need renewal`}
          />
        ))}
      </div>

      {expired > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span><b>{expired}</b> document(s) have already expired — take the affected buses off duty until renewed.</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Renewal Watchlist"
          description={`Documents expiring within ${WINDOW_DAYS} days, most urgent first`}
        >
          {rows.length === 0 ? (
            <EmptyState
              title="All documents are current"
              description={`No vehicle insurance, fitness or license expires in the next ${WINDOW_DAYS} days.`}
              icon={<BadgeCheck className="h-7 w-7" />}
            />
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={`${r.vehicle.id}-${r.kind}-${i}`} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{r.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.vehicle.regNo} <span className="font-normal text-muted-foreground">· {r.vehicle.model}</span></span>
                  <ExpiryCell value={r.date} />
                  <Badge variant="outline" className={cn(r.days < 0 ? 'border-rose-500/30 text-rose-600 dark:text-rose-400' : r.days <= 15 ? 'border-orange-500/30 text-orange-600 dark:text-orange-400' : 'border-amber-500/30 text-amber-600 dark:text-amber-400')}>
                    {r.days < 0 ? 'Expired' : r.days === 0 ? 'Today' : `${r.days} days`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Incident Escalation" description="Raise a security alert linked to transport">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldPlus className="h-7 w-7" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Breakdown, accident or safety incident on a route? Log it as a Security Alert so admins and the principal are notified instantly.
            </p>
            <Button onClick={() => setModule('security')}>
              <ShieldPlus className="mr-1.5 h-4 w-4" /> Create Security Alert
            </Button>
            <p className="text-xs text-muted-foreground">Opens the Security &amp; Visitors module</p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
