'use client'

import * as React from 'react'
import { AlertCircle, CalendarCheck2, Percent, TrendingDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard, SectionCard, ErrorState } from '@/components/erp/ui'
import { LineTrend, DonutChart, CHART_COLORS } from '@/components/erp/charts'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api, ApiError } from '@/lib/api-client'
import { fmtDate, initials } from '@/lib/format'
import { STATUS_LABELS } from './helpers'


interface StatsData {
  days: number
  trend: { date: string; percent: number; present: number; absent: number; total: number }[]
  byStatus: { name: string; value: number }[]
  topAbsentees: { studentId: string; name: string; className: string; absents: number; totalDays: number }[]
  avgPercent: number
  latestDay: string
  latestPercent: number
  totalAbsents: number
  trackedStudents: number
}

const DONUT_COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#fb923c', '#0ea5e9', '#a1a1aa']

export default function Analytics() {
  const [data, setData] = React.useState<StatsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [range, setRange] = React.useState(30)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ data: StatsData }>(`/api/attendance/stats?days=${range}`)
      setData(res.data)
    } catch (e) {
      setError((e as ApiError).message || 'Unable to load attendance analytics.')
    } finally {
      setLoading(false)
    }
  }, [range])
  React.useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={error || undefined} onRetry={load} />
  }

  const trendData = data.trend.map(t => ({ ...t, label: fmtDate(t.date).slice(0, 6) }))
  const donutData = data.byStatus.map(s => ({ name: STATUS_LABELS[s.name] || s.name, value: s.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {[30, 60, 90].map(d => (
          <Button key={d} size="sm" variant={range === d ? 'default' : 'outline'} onClick={() => setRange(d)}>
            Last {d} days
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Average attendance" value={`${data.avgPercent}%`} icon={<Percent className="h-5 w-5" />} tone="success" hint={`over last ${data.days} days`} />
        <StatCard
          label="Latest day"
          value={`${data.latestPercent}%`}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          tone={data.latestPercent >= data.avgPercent ? 'info' : 'warning'}
          hint={data.latestDay ? fmtDate(data.latestDay) : 'No data yet'}
        />
        <StatCard label="Total absences" value={data.totalAbsents} icon={<AlertCircle className="h-5 w-5" />} tone="danger" hint="across all students" />
        <StatCard label="Students tracked" value={data.trackedStudents} icon={<Users className="h-5 w-5" />} tone="default" hint="with attendance records" />
      </div>

      <SectionCard title="Attendance trend" description="Daily attendance % (present, late, half-day and excused count as attended; holidays excluded).">
        {trendData.length ? (
          <LineTrend
            data={trendData}
            xKey="label"
            series={[{ key: 'percent', label: 'Attendance %', color: CHART_COLORS[0] }]}
            height={280}
            yFormatter={(v) => `${v}%`}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No attendance recorded in this period yet.</p>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Status distribution" description={`All marked statuses in the last ${data.days} days.`}>
          {donutData.length ? (
            <DonutChart data={donutData} nameKey="name" valueKey="value" height={280} colors={DONUT_COLORS} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No data available.</p>
          )}
        </SectionCard>

        <SectionCard title="Top absentees" description="Students with the most absences in this period.">
          {data.topAbsentees.length ? (
            <div className="space-y-2.5">
              {data.topAbsentees.map((s, i) => {
                const pct = s.totalDays ? Math.round((s.absents / s.totalDays) * 100) : 0
                return (
                  <div key={s.studentId} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-rose-500/10 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {initials(s.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <span className="shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-400">{s.absents} absents</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, pct * 4)}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{s.className}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <TrendingDown className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">No absences recorded</p>
              <p className="text-xs text-muted-foreground">Everyone has been attending — great news!</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
