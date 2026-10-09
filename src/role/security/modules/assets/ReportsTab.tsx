'use client'

import * as React from 'react'
import { StatCard, SectionCard, ErrorState, CardGridSkeleton } from '@/components/erp/ui'
import { BarsChart, DonutChart } from '@/components/erp/charts'
import { BadgeIndianRupee, Boxes, Wrench } from 'lucide-react'
import { list, ApiError } from '@/lib/api-client'
import { inr } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

const titleize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function ReportsTab() {
  const [assets, setAssets] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list<any>('api/assets/items', { all: 1 })
      .then((res) => { if (alive) setAssets(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tick])

  const totalValue = React.useMemo(
    () => assets.reduce((sum, a) => sum + (a.currentValue ?? a.purchaseCost ?? 0), 0),
    [assets],
  )
  const inMaintenance = assets.filter((a) => a.status === 'MAINTENANCE' || a.condition === 'NEEDS_REPAIR').length

  const valueByCategory = React.useMemo(() => {
    const sums = new Map<string, number>()
    assets.forEach((a) => {
      const key = a.category || 'OTHER'
      sums.set(key, (sums.get(key) || 0) + (a.currentValue ?? a.purchaseCost ?? 0))
    })
    return Array.from(sums.entries())
      .map(([category, value]) => ({ category: titleize(category), value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  const statusMix = React.useMemo(() => {
    const counts = new Map<string, number>()
    assets.forEach((a) => counts.set(a.status || 'AVAILABLE', (counts.get(a.status || 'AVAILABLE') || 0) + 1))
    return Array.from(counts.entries()).map(([name, value]) => ({ name: titleize(name), value }))
  }, [assets])

  if (loading) {
    return (
      <div className="space-y-4">
        <CardGridSkeleton count={3} />
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={() => setTick((t) => t + 1)} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Book Value" value={inr(totalValue, true)} icon={<BadgeIndianRupee className="h-5 w-5" />} tone="success" hint="Current value across all assets" />
        <StatCard label="Registered Assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} hint="Unique asset tags" />
        <StatCard label="Needs Attention" value={inMaintenance} icon={<Wrench className="h-5 w-5" />} tone="warning" hint="Under maintenance or needing repair" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Value by Category" description="Current book value grouped by asset category">
          {valueByCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Register assets to see value distribution.</p>
          ) : (
            <BarsChart
              data={valueByCategory}
              xKey="category"
              series={[{ key: 'value', label: 'Value (₹)', color: '#10b981' }]}
              height={280}
              yFormatter={(v) => inr(v, true).replace('₹', '')}
            />
          )}
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Status Mix" description="Where assets currently sit">
          {statusMix.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Register assets to see the status mix.</p>
          ) : (
            <DonutChart data={statusMix} nameKey="name" valueKey="value" centerLabel={`${assets.length} assets`} />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
