'use client'

import * as React from 'react'
import { SectionCard, StatCard, ErrorState } from '@/components/erp/ui'
import { BarsChart, DonutChart, CHART_COLORS } from '@/components/erp/charts'
import { list } from '@/lib/api-client'
import { Users, UserCheck, TrendingUp, Megaphone } from 'lucide-react'
import { LEAD_STAGES, STAGE_LABELS, SOURCE_LABELS } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AnalyticsTab() {
  const [leads, setLeads] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list('api/admissions/leads', { all: 1 })
      .then(res => { if (alive) setLeads(res.data || []) })
      .catch((e: any) => { if (alive) setError(e?.message || 'Unable to load analytics.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reloadKey])

  const funnel = React.useMemo(
    () => LEAD_STAGES.map(stage => ({
      stage: STAGE_LABELS[stage] || stage,
      count: leads.filter(l => l.stage === stage).length,
    })),
    [leads],
  )

  const bySource = React.useMemo(() => {
    const counts = new Map<string, number>()
    leads.forEach(l => counts.set(l.source, (counts.get(l.source) || 0) + 1))
    return Array.from(counts.entries())
      .map(([source, count]) => ({ source: SOURCE_LABELS[source] || source, count }))
      .sort((a, b) => b.count - a.count)
  }, [leads])

  const counsellors = React.useMemo(() => {
    const counts = new Map<string, number>()
    leads.forEach(l => counts.set(l.assignedToName || 'Unassigned', (counts.get(l.assignedToName || 'Unassigned') || 0) + 1))
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [leads])

  const total = leads.length
  const enrolled = leads.filter(l => l.stage === 'ENROLLED').length
  const conversion = total ? Math.round((enrolled / total) * 1000) / 10 : 0
  const campaignsTouched = new Set(leads.map(l => l.campaignId).filter(Boolean)).size

  if (error) return <ErrorState message={error} onRetry={() => setReloadKey(k => k + 1)} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Leads" value={loading ? '…' : total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Enrolled" value={loading ? '…' : enrolled} tone="success" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Conversion" value={loading ? '…' : `${conversion}%`} tone="info" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Linked Campaigns" value={loading ? '…' : campaignsTouched} tone="warning" icon={<Megaphone className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Conversion funnel"
          description="Leads by pipeline stage — from enquiry to enrolment"
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
          ) : funnel.every(f => f.count === 0) ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No leads captured yet — add leads to see the funnel.</p>
          ) : (
            <BarsChart
              data={funnel}
              xKey="stage"
              yKey="count"
              layout="vertical"
              height={340}
              series={[{ key: 'count', label: 'Leads', color: CHART_COLORS[0] }]}
            />
          )}
        </SectionCard>

        <SectionCard title="Leads by source" description="Where enquiries come from">
          {loading ? (
            <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
          ) : bySource.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <DonutChart data={bySource} nameKey="source" valueKey="count" height={260} />
          )}
        </SectionCard>

        <SectionCard title="Counsellor performance" description="Leads handled per counsellor">
          {loading ? (
            <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
          ) : counsellors.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <BarsChart
              data={counsellors}
              xKey="name"
              yKey="count"
              height={260}
              series={[{ key: 'count', label: 'Leads', color: CHART_COLORS[3] }]}
            />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
