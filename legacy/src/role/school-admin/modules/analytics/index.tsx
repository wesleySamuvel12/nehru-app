'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  PageHeader, StatCard, SectionCard, EmptyState, ErrorState, CardGridSkeleton,
} from '@/components/erp/ui'
import { BarsChart, LineTrend, DonutChart, GaugeChart, CHART_COLORS } from '@/components/erp/charts'
import { list } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3, CalendarRange, Download, Printer, GraduationCap, Wallet, Users, UserCheck,
  TrendingUp, ClipboardCheck, Percent, IndianRupee, AlertCircle, Trophy, Filter, RotateCcw,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

interface AnalyticsPayload {
  academic: {
    classPerformance: { name: string; avgPct: number }[]
    subjectPerformance: { name: string; avgPct: number }[]
    attendanceByClass: { name: string; pct: number }[]
    attendanceTrend: { date: string; pct: number }[]
    gradeDistribution: { grade: string; count: number }[]
    topPerformers: { name: string; className: string; pct: number }[]
    lowPerformers: { name: string; className: string; pct: number }[]
  }
  finance: {
    monthly: { month: string; collection: number; expense: number }[]
    outstandingByStatus: { status: string; amount: number }[]
    totals: { collected: number; expense: number; outstanding: number; pendingInvoices: number }
  }
  hr: {
    staffAttendancePct: number
    payrollTrend: { month: string; netPay: number }[]
    performanceAvg: number
    headcount: number
    reviewsCount: number
  }
  admissions: {
    funnel: { stage: string; count: number }[]
    sourceSplit: { source: string; count: number }[]
    monthlyApplications: { month: string; count: number }[]
    conversionPct: number
    totalLeads: number
  }
  kpis: {
    students: number
    staff: number
    attendancePct: number
    avgScorePct: number
    collected: number
    outstanding: number
  }
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')

/* ── Date range picker (two popover calendars) ── */
function RangePicker({ from, to, onChange }: {
  from: Date | undefined; to: Date | undefined
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void
}) {
  const [openFrom, setOpenFrom] = React.useState(false)
  const [openTo, setOpenTo] = React.useState(false)
  const fmt = (d?: Date) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', yr: 'numeric' } as Intl.DateTimeFormatOptions) : 'Pick date'
  return (
    <div className="flex items-center gap-1.5">
      <Popover open={openFrom} onOpenChange={setOpenFrom}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 justify-start gap-2 px-3 text-xs font-normal">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            {fmt(from)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={from}
            captionLayout="dropdown"
            onSelect={(d) => { onChange({ from: d, to }); setOpenFrom(false) }}
          />
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">→</span>
      <Popover open={openTo} onOpenChange={setOpenTo}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 justify-start gap-2 px-3 text-xs font-normal">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            {fmt(to)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={to}
            disabled={(d) => (from ? d < from : false)}
            captionLayout="dropdown"
            onSelect={(d) => { onChange({ from, to: d }); setOpenTo(false) }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function PerformerList({ title, rows, tone, icon }: {
  title: string
  rows: { name: string; className: string; pct: number }[]
  tone: 'emerald' | 'rose'
  icon: React.ReactNode
}) {
  return (
    <SectionCard title={title} contentClassName="p-0">
      {rows.length === 0 ? (
        <EmptyState title="No marks recorded yet" description="Publish exam results to see performers here." />
      ) : (
        <ul className="divide-y">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.className || '—'}</p>
              </div>
              <div className="w-24 shrink-0">
                <Progress value={r.pct} className="h-1.5" />
                <p className="mt-1 text-right text-xs font-semibold tabular-nums">{r.pct}%</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
        {icon} {tone === 'emerald' ? 'Highest averages across published exams' : 'Students needing academic support'}
      </div>
    </SectionCard>
  )
}

export default function AnalyticsModule() {
  const [data, setData] = React.useState<AnalyticsPayload | null>(null)
  const [classes, setClasses] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [range, setRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [classId, setClassId] = React.useState<string>('ALL')
  const [applied, setApplied] = React.useState<{ from?: string; to?: string; classId: string }>({ classId: 'ALL' })

  const load = React.useCallback(async (params: { from?: string; to?: string; classId: string }) => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (params.from) sp.set('from', params.from)
      if (params.to) sp.set('to', params.to)
      if (params.classId && params.classId !== 'ALL') sp.set('classId', params.classId)
      const res = await fetch(`/api/analytics?${sp.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to load analytics')
      setData(await res.json())
    } catch (e: any) {
      setError(e?.message || 'Unable to load analytics right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load({ classId: 'ALL' })
    list('api/academics/classes', { all: 1 })
      .then((r) => setClasses((r.data || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => setClasses([]))
  }, [load])

  const applyFilters = () => {
    const from = range.from ? range.from.toISOString().slice(0, 10) : undefined
    const to = range.to ? range.to.toISOString().slice(0, 10) : undefined
    setApplied({ from, to, classId })
    load({ from, to, classId })
    toast.success('Filters applied', { description: `Range: ${from && to ? `${from} → ${to}` : 'all time'} · Class: ${classId === 'ALL' ? 'All classes' : classes.find(c => c.id === classId)?.name || classId}` })
  }

  const resetFilters = () => {
    setRange({ from: undefined, to: undefined })
    setClassId('ALL')
    setApplied({ classId: 'ALL' })
    load({ classId: 'ALL' })
  }

  const exportCsv = (entity: string) => {
    window.open(`/api/export?entity=${entity}`, '_blank')
    toast.info(`Preparing ${entity} CSV export…`)
  }

  const k = data?.kpis
  const ac = data?.academic
  const fin = data?.finance
  const hr = data?.hr
  const adm = data?.admissions

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Institution-wide insights across academics, finance, HR and admissions."
        breadcrumbs={['System', 'Analytics']}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print report
            </Button>
            <Button size="sm" className="h-9" onClick={() => exportCsv('students')}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm print:hidden">
        <Filter className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
        <RangePicker from={range.from} to={range.to} onChange={setRange} />
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>
        <Button size="sm" variant="ghost" className="h-9" onClick={resetFilters}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          {applied.from ? `Active: ${applied.from} → ${applied.to || 'today'}` : 'Showing: full academic year'}
        </span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => load(applied)} />
      ) : loading || !data ? (
        <div className="space-y-4">
          <CardGridSkeleton count={4} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="academic" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Academic</TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> Finance</TabsTrigger>
            <TabsTrigger value="hr" className="gap-1.5"><Users className="h-3.5 w-3.5" /> HR</TabsTrigger>
            <TabsTrigger value="admissions" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Admissions</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total Students" value={k?.students ?? 0} icon={<GraduationCap className="h-5 w-5" />} hint="Active enrolment" />
              <StatCard label="Avg Attendance" value={`${k?.attendancePct ?? 0}%`} tone="success" icon={<Percent className="h-5 w-5" />} hint="Student attendance (30d)" />
              <StatCard label="Avg Score" value={`${k?.avgScorePct ?? 0}%`} tone="info" icon={<TrendingUp className="h-5 w-5" />} hint="Published exams" />
              <StatCard label="Fees Collected" value={inr(k?.collected ?? 0, true)} tone="default" icon={<IndianRupee className="h-5 w-5" />} hint={`${inr(k?.outstanding ?? 0, true)} outstanding`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Class-wise Average Performance" description="Mean percentage across all published exams" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('students')}><Download className="h-4 w-4" /></Button>}>
                {ac?.classPerformance?.length ? (
                  <BarsChart data={ac.classPerformance} xKey="name" series={[{ key: 'avgPct', label: 'Avg %', color: CHART_COLORS[0] }]} height={300} yFormatter={(v) => `${v}%`} />
                ) : <EmptyState title="No exam data yet" description="Marks will appear here once exams are published." />}
              </SectionCard>
              <SectionCard title="Attendance Trend" description="Daily attendance % over recent school days" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('attendance')}><Download className="h-4 w-4" /></Button>}>
                {ac?.attendanceTrend?.length ? (
                  <LineTrend data={ac.attendanceTrend.map(t => ({ ...t, date: t.date.slice(5) }))} xKey="date" series={[{ key: 'pct', label: 'Attendance %', color: CHART_COLORS[0] }]} height={300} yFormatter={(v) => `${v}%`} />
                ) : <EmptyState title="No attendance yet" description="Mark attendance to build the trend." />}
              </SectionCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard title="Grade Distribution" description="Students per grade band">
                {ac?.gradeDistribution?.some(g => g.count > 0) ? (
                  <DonutChart data={ac.gradeDistribution.filter(g => g.count > 0)} nameKey="grade" valueKey="count" height={240} centerLabel={`${k?.students ?? 0}`} />
                ) : <EmptyState title="No grades yet" />}
              </SectionCard>
              <SectionCard title="Collection vs Expense" description="Last 6 months (₹)">
                {fin?.monthly?.length ? (
                  <BarsChart data={fin.monthly.map(m => ({ ...m, month: monthLabel(m.month) }))} xKey="month"
                    series={[{ key: 'collection', label: 'Collection', color: CHART_COLORS[0] }, { key: 'expense', label: 'Expense', color: CHART_COLORS[4] }]}
                    height={240} yFormatter={(v) => inr(v, true)} />
                ) : <EmptyState title="No finance data yet" />}
              </SectionCard>
              <SectionCard title="Staff Snapshot">
                <div className="flex flex-col items-center gap-2 pt-2">
                  <GaugeChart value={hr?.staffAttendancePct ?? 0} label="Staff attendance (30d)" height={170} color={CHART_COLORS[5]} />
                  <div className="flex w-full justify-around border-t pt-3 text-center">
                    <div><p className="text-lg font-bold">{hr?.headcount ?? 0}</p><p className="text-xs text-muted-foreground">Employees</p></div>
                    <div><p className="text-lg font-bold">{adm?.totalLeads ?? 0}</p><p className="text-xs text-muted-foreground">Active leads</p></div>
                    <div><p className="text-lg font-bold">{adm?.conversionPct ?? 0}%</p><p className="text-xs text-muted-foreground">Lead → enrol</p></div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ── ACADEMIC ── */}
          <TabsContent value="academic" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Subject Performance" description={classId !== 'ALL' ? `Filtered: ${classes.find(c => c.id === classId)?.name}` : 'Average % by subject across classes'} actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('attendance')}><Download className="h-4 w-4" /></Button>}>
                {ac?.subjectPerformance?.length ? (
                  <BarsChart data={ac.subjectPerformance} xKey="name" series={[{ key: 'avgPct', label: 'Avg %', color: CHART_COLORS[3] }]} height={300} yFormatter={(v) => `${v}%`} />
                ) : <EmptyState title="No marks yet" description="Enter marks in the Examinations module first." />}
              </SectionCard>
              <SectionCard title="Grade Distribution" description="From grade scale + published marks">
                {ac?.gradeDistribution?.some(g => g.count > 0) ? (
                  <DonutChart data={ac.gradeDistribution.filter(g => g.count > 0)} nameKey="grade" valueKey="count" height={300} />
                ) : <EmptyState title="No grades yet" description="Publish exam results to populate this chart." />}
              </SectionCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <PerformerList title="Top Performers" rows={ac?.topPerformers ?? []} tone="emerald" icon={<Trophy className="h-3.5 w-3.5" />} />
              <PerformerList title="Needs Attention" rows={ac?.lowPerformers ?? []} tone="rose" icon={<AlertCircle className="h-3.5 w-3.5" />} />
            </div>
            <SectionCard title="Attendance by Class" description="Present + late days as % of marked days">
              {ac?.attendanceByClass?.length ? (
                <BarsChart data={ac.attendanceByClass} xKey="name" layout="vertical" series={[{ key: 'pct', label: 'Attendance %', color: CHART_COLORS[5] }]} height={Math.max(240, (ac.attendanceByClass.length || 1) * 26)} yFormatter={(v) => `${v}%`} />
              ) : <EmptyState title="No attendance recorded" />}
            </SectionCard>
          </TabsContent>

          {/* ── FINANCE ── */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Collected" value={inr(fin?.totals.collected ?? 0, true)} tone="success" icon={<IndianRupee className="h-5 w-5" />} hint="Successful payments" />
              <StatCard label="Expenses" value={inr(fin?.totals.expense ?? 0, true)} tone="warning" icon={<Wallet className="h-5 w-5" />} hint="Approved + paid" />
              <StatCard label="Outstanding" value={inr(fin?.totals.outstanding ?? 0, true)} tone="danger" icon={<AlertCircle className="h-5 w-5" />} hint="Unpaid invoice balance" />
              <StatCard label="Open Invoices" value={fin?.totals.pendingInvoices ?? 0} tone="info" icon={<ClipboardCheck className="h-5 w-5" />} hint="Pending / partial / overdue" />
            </div>
            <SectionCard title="Collection vs Expense" description="Monthly totals across the selected range" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('payments')}><Download className="h-4 w-4" /></Button>}>
              {fin?.monthly?.length ? (
                <BarsChart data={fin.monthly.map(m => ({ ...m, month: monthLabel(m.month) }))} xKey="month"
                  series={[{ key: 'collection', label: 'Fee collection', color: CHART_COLORS[0] }, { key: 'expense', label: 'Expenses', color: CHART_COLORS[4] }]}
                  height={300} yFormatter={(v) => inr(v, true)} />
              ) : <EmptyState title="No transactions yet" description="Fee payments and expenses will chart here." />}
            </SectionCard>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Outstanding by Status" description="Invoice balance grouped by status">
                {fin?.outstandingByStatus?.length ? (
                  <DonutChart data={fin.outstandingByStatus.map(s => ({ status: titleCase(s.status), amount: s.amount }))} nameKey="status" valueKey="amount" height={280} />
                ) : <EmptyState title="All invoices settled" description="No outstanding balance remains." />}
              </SectionCard>
              <SectionCard title="Balance Health">
                <div className="space-y-4 py-2">
                  {fin?.outstandingByStatus?.map(s => {
                    const total = fin.outstandingByStatus.reduce((a, b) => a + b.amount, 0) || 1
                    return (
                      <div key={s.status}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium">{titleCase(s.status)}</span>
                          <span className="tabular-nums text-muted-foreground">{inr(s.amount, true)}</span>
                        </div>
                        <Progress value={(s.amount / total) * 100} className="h-2" />
                      </div>
                    )
                  })}
                  {!fin?.outstandingByStatus?.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending — great collection discipline!</p>}
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Net position: <strong className="text-foreground">{inr((fin?.totals.collected ?? 0) - (fin?.totals.expense ?? 0), true)}</strong> across the period. Overdue invoices need follow-up via the Fees module.
                  </div>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ── HR ── */}
          <TabsContent value="hr" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Headcount" value={hr?.headcount ?? 0} icon={<Users className="h-5 w-5" />} hint="Active employees" />
              <StatCard label="Staff Attendance" value={`${hr?.staffAttendancePct ?? 0}%`} tone="success" icon={<UserCheck className="h-5 w-5" />} hint="Last 30 days" />
              <StatCard label="Avg Review Score" value={`${(hr?.performanceAvg ?? 0).toFixed(1)}/5`} tone="info" icon={<TrendingUp className="h-5 w-5" />} hint={`${hr?.reviewsCount ?? 0} reviews on record`} />
              <StatCard label="Monthly Payroll" value={inr(hr?.payrollTrend?.[hr.payrollTrend.length - 1]?.netPay ?? 0, true)} tone="warning" icon={<Wallet className="h-5 w-5" />} hint="Latest processed run" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Payroll Trend" description="Net pay disbursed per month" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('payslips')}><Download className="h-4 w-4" /></Button>}>
                {hr?.payrollTrend?.length ? (
                  <BarsChart data={hr.payrollTrend.map(p => ({ ...p, month: monthLabel(p.month) }))} xKey="month" series={[{ key: 'netPay', label: 'Net pay', color: CHART_COLORS[2] }]} height={280} yFormatter={(v) => inr(v, true)} />
                ) : <EmptyState title="No payroll runs yet" description="Process payroll in the HR module to see the trend." />}
              </SectionCard>
              <SectionCard title="Staff Attendance Gauge">
                <div className="flex flex-col items-center gap-4 py-4">
                  <GaugeChart value={hr?.staffAttendancePct ?? 0} label="Attendance (30 days)" height={190} color={CHART_COLORS[0]} />
                  <Badge variant="outline" className="text-xs">
                    {(hr?.staffAttendancePct ?? 0) >= 95 ? 'Excellent discipline' : (hr?.staffAttendancePct ?? 0) >= 90 ? 'Healthy range' : 'Needs monitoring'}
                  </Badge>
                </div>
              </SectionCard>
            </div>
            <SectionCard title="Performance Overview" description={`Average score across ${hr?.reviewsCount ?? 0} recorded reviews`}>
              <div className="flex flex-col items-center gap-3 py-3 sm:flex-row sm:justify-around">
                <GaugeChart value={(hr?.performanceAvg ?? 0) * 20} label="Avg review score" height={170} color={CHART_COLORS[3]} />
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">≥ 4.0</Badge> Exceeds expectations</p>
                  <p className="flex items-center gap-2"><Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">3.0 – 3.9</Badge> Meets expectations</p>
                  <p className="flex items-center gap-2"><Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400">&lt; 3.0</Badge> Improvement plan</p>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── ADMISSIONS ── */}
          <TabsContent value="admissions" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total Leads" value={adm?.totalLeads ?? 0} icon={<Users className="h-5 w-5" />} hint="All pipeline stages" />
              <StatCard label="Enrolled" value={adm?.funnel?.find(f => f.stage === 'ENROLLED')?.count ?? 0} tone="success" icon={<GraduationCap className="h-5 w-5" />} hint="Converted this year" />
              <StatCard label="Applications" value={adm?.monthlyApplications?.reduce((a, b) => a + b.count, 0) ?? 0} tone="info" icon={<ClipboardCheck className="h-5 w-5" />} hint="Forms submitted" />
              <StatCard label="Conversion" value={`${adm?.conversionPct ?? 0}%`} tone="warning" icon={<TrendingUp className="h-5 w-5" />} hint="Lead → enrolled" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Admission Funnel" description="Leads by pipeline stage" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('leads')}><Download className="h-4 w-4" /></Button>}>
                {adm?.funnel?.length ? (
                  <BarsChart data={adm.funnel.map(f => ({ ...f, stage: titleCase(f.stage) }))} xKey="stage" layout="vertical"
                    series={[{ key: 'count', label: 'Leads', color: CHART_COLORS[0] }]} height={Math.max(260, (adm.funnel.length || 1) * 30)} />
                ) : <EmptyState title="No leads yet" description="Capture enquiries in the Admissions module." />}
              </SectionCard>
              <SectionCard title="Lead Sources" description="Where enquiries originate">
                {adm?.sourceSplit?.length ? (
                  <DonutChart data={adm.sourceSplit.map(s => ({ source: titleCase(s.source), count: s.count }))} nameKey="source" valueKey="count" height={300} />
                ) : <EmptyState title="No sources recorded" />}
              </SectionCard>
            </div>
            <SectionCard title="Monthly Applications" description="Application forms received per month" actions={<Button variant="ghost" size="sm" onClick={() => exportCsv('applications')}><Download className="h-4 w-4" /></Button>}>
              {adm?.monthlyApplications?.length ? (
                <LineTrend data={adm.monthlyApplications.map(m => ({ ...m, month: monthLabel(m.month) }))} xKey="month"
                  series={[{ key: 'count', label: 'Applications', color: CHART_COLORS[3] }]} height={260} />
              ) : <EmptyState title="No applications yet" />}
            </SectionCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
