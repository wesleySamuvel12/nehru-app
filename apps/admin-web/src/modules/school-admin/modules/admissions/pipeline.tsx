'use client'

import * as React from 'react'
import { KanbanBoard } from '@/components/erp/KanbanBoard'
import { StatCard, StatusBadge } from '@/components/erp/ui'
import { list } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { Users, UserCheck, TrendingUp, PhoneCall, Clock } from 'lucide-react'
import { LEAD_STAGES, STAGE_LABELS, SOURCE_BADGE, isPastDay } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PipelineTab() {
  const [stats, setStats] = React.useState({ total: 0, enrolled: 0, counselling: 0 })
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [statsKey, setStatsKey] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setStatsLoading(true)
    Promise.all([
      list('api/admissions/leads', { all: 1, pageSize: 1 }),
      list('api/admissions/leads', { stage: 'ENROLLED', pageSize: 1 }),
      list('api/admissions/leads', { stage: 'COUNSELLING', pageSize: 1 }),
    ])
      .then(([all, enrolled, counselling]) => {
        if (!alive) return
        setStats({
          total: all.meta?.total || 0,
          enrolled: enrolled.meta?.total || 0,
          counselling: counselling.meta?.total || 0,
        })
      })
      .catch(() => { if (alive) setStats({ total: 0, enrolled: 0, counselling: 0 }) })
      .finally(() => { if (alive) setStatsLoading(false) })
    return () => { alive = false }
  }, [statsKey])

  const conversion = stats.total ? Math.round((stats.enrolled / stats.total) * 1000) / 10 : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={statsLoading ? '…' : stats.total}
          icon={<Users className="h-5 w-5" />}
          hint="All enquiries captured"
        />
        <StatCard
          label="Enrolled"
          value={statsLoading ? '…' : stats.enrolled}
          icon={<UserCheck className="h-5 w-5" />}
          tone="success"
          hint="Converted to students"
        />
        <StatCard
          label="Conversion Rate"
          value={statsLoading ? '…' : `${conversion}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
          hint="Enrolled ÷ total leads"
        />
        <StatCard
          label="In Counselling"
          value={statsLoading ? '…' : stats.counselling}
          icon={<PhoneCall className="h-5 w-5" />}
          tone="warning"
          hint="Leads in counselling stage"
        />
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Drag a lead card between columns to move it through the admission funnel — the stage is saved instantly.
        </p>
        <KanbanBoard
          endpoint="api/admissions/leads"
          columns={LEAD_STAGES.map(s => ({ key: s, label: STAGE_LABELS[s] || s }))}
          titleField="name"
          onChanged={() => setStatsKey(k => k + 1)}
          renderCard={(lead) => (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{lead.name}</p>
                {lead.classAppliedFor && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {lead.classAppliedFor}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge value={lead.source} map={SOURCE_BADGE} />
                {lead.campaignId && (
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-violet-700 dark:text-violet-400">
                    Campaign
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
                <span className="truncate">{lead.assignedToName || 'Unassigned'}</span>
                {lead.nextFollowUp ? (
                  <span className={`inline-flex shrink-0 items-center gap-1 ${isPastDay(lead.nextFollowUp) ? 'font-medium text-amber-600 dark:text-amber-400' : ''}`}>
                    <Clock className="h-3 w-3" />
                    {fmtDate(lead.nextFollowUp)}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
