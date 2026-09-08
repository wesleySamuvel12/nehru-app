'use client'

import * as React from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader, StatCard, SectionCard, EmptyState } from '@/components/erp/ui'
import { TrendArea, BarsChart, LineTrend, DonutChart, GaugeChart } from '@/components/erp/charts'
import { inr, fmtDate, timeAgo } from '@/lib/format'
import {
  Users, GraduationCap, CalendarCheck, UserPlus, Wallet, AlertTriangle, Bus, Building2,
  ClipboardCheck, Activity, RefreshCw, CalendarDays, ChevronRight,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', COUNSELLING: 'Counselling', APPLICATION: 'Application',
  TEST: 'Test', INTERVIEW: 'Interview', APPROVED: 'Approved', ENROLLED: 'Enrolled',
}

export default function DashboardModule() {
  const { setModule } = useErp()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    let alive = true
    setLoading(true)
    api<{ data: any }>('/api/dashboard')
      .then(res => { if (alive) setData(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading) return <DashboardSkeleton />
  if (error) return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
    </div>
  )
  if (!data) return null

  const k = data.kpis

  return (
    <div className="space-y-5">
      <PageHeader
        title="School Dashboard"
        subtitle="Live overview across students, staff, academics, finance and operations."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>}
      />

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Students" value={k.activeStudents} icon={<GraduationCap className="h-5 w-5" />} tone="info" hint={`${k.totalStudents} on record`} onClick={() => setModule('students')} />
        <StatCard label="Total Staff" value={k.totalStaff} icon={<Users className="h-5 w-5" />} tone="default" hint="Active employees" onClick={() => setModule('teachers')} />
        <StatCard label="Today's Attendance" value={`${k.attendancePercent}%`} icon={<CalendarCheck className="h-5 w-5" />} tone="success" hint={`${k.presentToday} present · ${k.absentToday} absent`} onClick={() => setModule('attendance')} />
        <StatCard label="Pending Admissions" value={k.pendingAdmissions} icon={<UserPlus className="h-5 w-5" />} tone="warning" hint="Applications in review" onClick={() => setModule('admissions')} />
        <StatCard label="Fee Collection" value={inr(k.feeCollected, true)} icon={<Wallet className="h-5 w-5" />} tone="success" hint={`of ${inr(k.feeBilled, true)} billed`} onClick={() => setModule('fees')} />
        <StatCard label="Outstanding Fees" value={inr(k.feeOutstanding, true)} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" hint={`${k.overdueInvoices} overdue invoices`} onClick={() => setModule('fees')} />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Academic Average" value={`${k.avgAcademicScore || 0}%`} icon={<ClipboardCheck className="h-5 w-5" />} tone="default" hint="Across published exams" onClick={() => setModule('examinations')} />
        <StatCard label="Transport Active" value={k.transportActive} icon={<Bus className="h-5 w-5" />} tone="info" hint={`${data.transport?.vehicles?.length || 0} buses in fleet`} onClick={() => setModule('transport')} />
        <StatCard label="Hostel Occupancy" value={k.hostelTotal ? `${Math.round((k.hostelOccupied / k.hostelTotal) * 100)}%` : '—'} icon={<Building2 className="h-5 w-5" />} tone="warning" hint={`${k.hostelOccupied}/${k.hostelTotal} beds occupied`} onClick={() => setModule('hostel')} />
        <StatCard label="Pending Approvals" value={data.pendingApprovals.length} icon={<Activity className="h-5 w-5" />} tone="danger" hint="Awaiting your action" onClick={() => setModule('certificates')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Student Population" description="Active students by grade" className="xl:col-span-2">
          <BarsChart data={data.population} xKey="name" series={[{ key: 'count', label: 'Students', color: '#0ea5e9' }]} height={280} />
        </SectionCard>
        <SectionCard title="Attendance Today" description="Current status split">
          <DonutChart
            data={data.todayStatus.map((t: any) => ({ name: t.status.replace(/_/g, ' '), count: t.count }))}
            nameKey="name" valueKey="count" height={280}
            colorMap={{ PRESENT: '#10b981', ABSENT: '#f43f5e', LATE: '#f59e0b', 'HALF DAY': '#fb923c', EXCUSED: '#0ea5e9', HOLIDAY: '#a1a1aa' }} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Attendance Trend" description="Present rate — last 30 days">
          <TrendArea data={data.attendanceTrend} xKey="date" yKey="percent" color="#10b981" height={250}
            xFormatter={(v) => fmtDate(v).slice(0, 6)} />
        </SectionCard>
        <SectionCard title="Fee Collection Trend" description="Monthly payments received (₹)">
          <TrendArea data={data.feeTrend} xKey="month" yKey="total" color="#f59e0b" height={250}
            yFormatter={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v}`)} />
        </SectionCard>
      </div>

      {/* Pipeline + lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Admission Pipeline" description="Leads by current stage" className="xl:col-span-2"
          actions={<Button variant="ghost" size="sm" onClick={() => setModule('admissions')}>Open CRM <ChevronRight className="h-4 w-4" /></Button>}>
          <BarsChart
            data={data.admissionPipeline.map((p: any) => ({ ...p, label: STAGE_LABELS[p.stage] || p.stage }))}
            xKey="label" series={[{ key: 'count', label: 'Leads', color: '#8b5cf6' }]} height={250} />
        </SectionCard>
        <SectionCard title="Upcoming Events" description="Next on the school calendar"
          actions={<Button variant="ghost" size="sm" onClick={() => setModule('events')}>All <ChevronRight className="h-4 w-4" /></Button>}>
          <div className="space-y-2.5">
            {data.upcomingEvents.length === 0 && <EmptyState title="No upcoming events" icon={<CalendarDays className="h-6 w-6" />} />}
            {data.upcomingEvents.map((e: any) => (
              <button key={e.id} onClick={() => setModule('events')}
                className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/40">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-[9px] font-semibold uppercase">{fmtDate(e.startDate).split(' ')[1]}</span>
                  <span className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.type?.replace(/_/g, ' ')}{e.location ? ` · ${e.location}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Recent Activity" description="System audit trail — latest actions"
          actions={<Button variant="ghost" size="sm" onClick={() => setModule('audit-logs')}>Audit logs <ChevronRight className="h-4 w-4" /></Button>}>
          <div className="space-y-2">
            {data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{a.action}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{a.userName || 'System'} <span className="font-normal text-muted-foreground">· {a.entity}</span></p>
                  {a.details && <p className="truncate text-[11px] text-muted-foreground">{(() => { try { return JSON.stringify(JSON.parse(a.details)) } catch { return a.details } })()}</p>}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Pending Approvals" description="Workflows waiting for a decision">
          <div className="space-y-2">
            {data.pendingApprovals.length === 0 && <EmptyState title="Nothing pending" description="All approval workflows are clear." />}
            {data.pendingApprovals.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">{t.type.replace(/_/g, ' ')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">Requested by {t.requestedBy} · needs {t.approverRole.replace(/_/g, ' ')}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Operations gauges */}
      <SectionCard title="Operations Health" description="Fleet and hostel utilisation at a glance">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GaugeChart value={k.attendancePercent} label="Attendance today" color="#10b981" height={170} />
          <GaugeChart
            value={k.hostelTotal ? (k.hostelOccupied / k.hostelTotal) * 100 : 0}
            label="Hostel occupancy" color="#f59e0b" height={170} />
          <GaugeChart
            value={k.feeBilled ? Math.min(100, (k.feeCollected / k.feeBilled) * 100) : 0}
            label="Fee collection" color="#0ea5e9" height={170} />
        </div>
      </SectionCard>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
