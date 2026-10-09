'use client'

import * as React from 'react'
import { StatCard, SectionCard, ErrorState, CardGridSkeleton } from '@/components/erp/ui'
import { BarsChart, DonutChart } from '@/components/erp/charts'
import { Button } from '@/components/ui/button'
import { Activity, Download, HeartPulse, Syringe, Users } from 'lucide-react'
import { toast } from 'sonner'
import { list, ApiError } from '@/lib/api-client'
import { SEVERITY_BADGE_MAP, downloadExport } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const SEVERITY_TONES: Record<string, string> = {
  MINOR: '#10b981', MODERATE: '#f59e0b', SERIOUS: '#f43f5e',
}

export default function ScreeningsTab() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  const [recordTotal, setRecordTotal] = React.useState(0)
  const [studentTotal, setStudentTotal] = React.useState(0)
  const [visitTotal, setVisitTotal] = React.useState(0)
  const [visits, setVisits] = React.useState<any[]>([])
  const [vaxDue, setVaxDue] = React.useState(0)
  const [exporting, setExporting] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const plus30 = new Date(); plus30.setDate(plus30.getDate() + 30)
    Promise.all([
      list<any>('api/health/records', { page: 1, pageSize: 1 }).catch(() => null),
      list<any>('api/students', { page: 1, pageSize: 1 }).catch(() => null),
      list<any>('api/health/visits', { all: 1, dateFrom: monthStart.toISOString() }).catch(() => null),
      list<any>('api/health/visits', { all: 1 }).catch(() => null),
      list<any>('api/health/vaccinations', { all: 1 }).catch(() => null),
    ]).then(([records, students, visitsMonth, allVisits, vax]) => {
      if (!alive) return
      setRecordTotal(records?.meta?.total ?? 0)
      setStudentTotal(students?.meta?.total ?? 0)
      setVisitTotal(visitsMonth?.meta?.total ?? 0)
      setVisits(allVisits?.data ?? [])
      const rows = vax?.data ?? []
      setVaxDue(rows.filter((v: any) => v.status === 'SCHEDULED' || (v.nextDueDate && new Date(v.nextDueDate) <= plus30)).length)
      setLoading(false)
    })
    return () => { alive = false }
  }, [tick])

  const screenedPct = studentTotal > 0 ? Math.round((recordTotal / studentTotal) * 100) : 0

  const severityMix = React.useMemo(() => {
    const counts = new Map<string, number>()
    visits.forEach((v) => counts.set(v.severity || 'MINOR', (counts.get(v.severity || 'MINOR') || 0) + 1))
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [visits])

  const commonReasons = React.useMemo(() => {
    const counts = new Map<string, number>()
    visits.forEach((v) => counts.set(v.reason || 'Other', (counts.get(v.reason || 'Other') || 0) + 1))
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [visits])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadExport('clinicVisits')
      toast.success('Clinic visits exported as CSV.')
    } catch (e) { toast.error((e as ApiError).message) } finally { setExporting(false) }
  }

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
        <StatCard
          label="Students Screened"
          value={`${screenedPct}%`}
          icon={<HeartPulse className="h-5 w-5" />}
          tone="success"
          hint={`${recordTotal} of ${studentTotal} students have health records`}
        />
        <StatCard
          label="Visits This Month"
          value={visitTotal}
          icon={<Activity className="h-5 w-5" />}
          tone="warning"
          hint="Clinic footfall since the 1st"
        />
        <StatCard
          label="Vaccinations Due"
          value={vaxDue}
          icon={<Syringe className="h-5 w-5" />}
          tone="info"
          hint="Scheduled or due within 30 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Visits by Severity" description="Distribution across all recorded clinic visits">
          {severityMix.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No clinic visits recorded yet.</p>
          ) : (
            <DonutChart
              data={severityMix}
              nameKey="name"
              valueKey="value"
              colors={severityMix.map((s) => SEVERITY_TONES[s.name] || '#71717a')}
              centerLabel={`${visits.length} visits`}
            />
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            {Object.entries(SEVERITY_BADGE_MAP).map(([k]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_TONES[k] }} />
                {k.charAt(0) + k.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Common Reasons" description="Top 8 reasons students visited the clinic">
          {commonReasons.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No visit reasons to analyse yet.</p>
          ) : (
            <BarsChart
              data={commonReasons}
              xKey="reason"
              series={[{ key: 'count', label: 'Visits', color: '#0ea5e9' }]}
              layout="vertical"
              height={Math.max(220, commonReasons.length * 38)}
              yFormatter={(v) => String(Math.round(v))}
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Data Exports"
        description="Download CSV reports for record keeping and inspections"
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Download className="mr-2 h-4 w-4 animate-pulse" /> : <Download className="mr-2 h-4 w-4" />}
            Export Clinic Visits
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Exports respect your role — health data is restricted to admins, nurses, principals and teachers.
        </p>
      </SectionCard>
    </div>
  )
}
