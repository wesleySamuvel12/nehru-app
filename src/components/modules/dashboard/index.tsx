'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard, SectionCard, EmptyState } from '@/components/erp/ui'
import { ROLE_LABELS } from '@/lib/rbac'
import { TrendArea, BarsChart, LineTrend, DonutChart, GaugeChart } from '@/components/erp/charts'
import { inr, fmtDate, timeAgo } from '@/lib/format'
import {
  Users, GraduationCap, CalendarCheck, UserPlus, Wallet, AlertTriangle, Bus, Building2,
  ClipboardCheck, Activity, RefreshCw, CalendarDays, ChevronRight, Sparkles,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', COUNSELLING: 'Counselling', APPLICATION: 'Application',
  TEST: 'Test', INTERVIEW: 'Interview', APPROVED: 'Approved', ENROLLED: 'Enrolled',
}

function greetingFor(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function GreetingHeader({ onRefresh }: { onRefresh: () => void }) {
  const { session, setModule } = useErp()
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const name = session?.name || ''
  const role = session?.role || 'SUPER_ADMIN'

  const ROLE_THEMES: Record<string, { bannerBg: string; badge: string; sub: string }> = {
    SUPER_ADMIN: {
      bannerBg: 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20',
      badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      sub: 'System Control Center · Live Monitoring & Multi-Tenant Analytics',
    },
    PRINCIPAL: {
      bannerBg: 'from-yellow-500/10 via-amber-500/5 to-transparent border-yellow-500/20',
      badge: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      sub: 'Executive Management · Academic Quality, Approvals & Operations',
    },
    TEACHER: {
      bannerBg: 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20',
      badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      sub: 'Academic Hub · My Classes, Attendance, Gradebook & Assignments',
    },
    ACCOUNTANT: {
      bannerBg: 'from-teal-500/10 via-cyan-500/5 to-transparent border-teal-500/20',
      badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      sub: 'Finance Portal · Invoicing, Fee Collection, Ledgers & Payroll',
    },
    PARENT: {
      bannerBg: 'from-rose-500/10 via-pink-500/5 to-transparent border-rose-500/20',
      badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      sub: 'Parent Portal · Track Child Academics, Attendance & Fee Payments',
    },
    STUDENT: {
      bannerBg: 'from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20',
      badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      sub: 'Student Learning Space · Timetables, Online Exams & Homework',
    },
  }

  const theme = ROLE_THEMES[role] || ROLE_THEMES.SUPER_ADMIN

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border bg-gradient-to-r p-5 sm:p-6 backdrop-blur-md shadow-sm transition-all duration-300', theme.bannerBg)}>
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{today}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', theme.badge)}>
              <Activity className="h-3 w-3 animate-pulse" /> {ROLE_LABELS[role] || role}
            </span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {greetingFor()}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>

          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {theme.sub}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="press h-9 rounded-xl border-border/80 bg-background/80 shadow-sm" onClick={onRefresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync Data
          </Button>
          <Button size="sm" className="press h-9 rounded-xl shadow-md" onClick={() => setModule('settings')}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Preferences
          </Button>
        </div>
      </div>
    </div>
  )
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
      <GreetingHeader onRefresh={load} />

      {/* KPI row 1 — sequential entrance + count-up */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Students" countTo={k.activeStudents} icon={<GraduationCap className="h-5 w-5" />} tone="info" hint={`${k.totalStudents} on record`} onClick={() => setModule('students')} />
        <StatCard label="Total Staff" countTo={k.totalStaff} icon={<Users className="h-5 w-5" />} tone="default" hint="Active employees" onClick={() => setModule('teachers')} />
        <StatCard label="Today's Attendance" countTo={k.attendancePercent} format={n => `${Math.round(n)}%`} icon={<CalendarCheck className="h-5 w-5" />} tone="success" hint={`${k.presentToday} present · ${k.absentToday} absent`} onClick={() => setModule('attendance')}
          spark={(data.attendanceTrend || []).slice(-14).map((t: any) => t.percent)} sparkColor="#10b981" />
        <StatCard label="Pending Admissions" countTo={k.pendingAdmissions} icon={<UserPlus className="h-5 w-5" />} tone="warning" hint="Applications in review" onClick={() => setModule('admissions')} />
        <StatCard label="Fee Collection" countTo={k.feeCollected} format={n => inr(n, true)} icon={<Wallet className="h-5 w-5" />} tone="success" hint={`of ${inr(k.feeBilled, true)} billed`} onClick={() => setModule('fees')} />
        <StatCard label="Outstanding Fees" countTo={k.feeOutstanding} format={n => inr(n, true)} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" hint={`${k.overdueInvoices} overdue invoices`} onClick={() => setModule('fees')} />
      </div>

      {/* KPI row 2 */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Academic Average" countTo={k.avgAcademicScore || 0} format={n => `${Math.round(n)}%`} icon={<ClipboardCheck className="h-5 w-5" />} tone="default" hint="Across published exams" onClick={() => setModule('examinations')} />
        <StatCard label="Transport Active" countTo={k.transportActive} icon={<Bus className="h-5 w-5" />} tone="info" hint={`${data.transport?.vehicles?.length || 0} buses in fleet`} onClick={() => setModule('transport')} />
        <StatCard label="Hostel Occupancy" value={k.hostelTotal ? `${Math.round((k.hostelOccupied / k.hostelTotal) * 100)}%` : '—'} icon={<Building2 className="h-5 w-5" />} tone="warning" hint={`${k.hostelOccupied}/${k.hostelTotal} beds occupied`} onClick={() => setModule('hostel')} />
        <StatCard label="Pending Approvals" countTo={data.pendingApprovals.length} icon={<Activity className="h-5 w-5" />} tone="danger" hint="Awaiting your action" onClick={() => setModule('certificates')} />
      </div>

      {/* Charts row */}
      <div className="stagger grid grid-cols-1 gap-4 xl:grid-cols-3">
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

      <div className="stagger grid grid-cols-1 gap-4 xl:grid-cols-2">
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
