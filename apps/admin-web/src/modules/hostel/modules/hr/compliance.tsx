'use client'

/**
 * Compliance tab — document expiries (license / visa / certification) and
 * contracts ending soon. Amber < 90 days, red when expired.
 */
import * as React from 'react'
import { StatCard, SectionCard, EmptyState } from '@/components/erp/ui'
import { AlertTriangle, CalendarX2, FileWarning, ShieldCheck } from 'lucide-react'
import { fmtDate, initials } from '@/lib/format'
import { useEmployees } from './helpers'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY = 86400000
const WINDOW = 90

type DocKind = 'License' | 'Visa' | 'Certification' | 'Contract'

interface ExpiryRow {
  id: string
  employee: any
  kind: DocKind
  date: string
  daysLeft: number
}

const KIND_META: Record<DocKind, { tone: string; label: string }> = {
  License: { tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', label: 'License' },
  Visa: { tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', label: 'Visa' },
  Certification: { tone: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20', label: 'Certification' },
  Contract: { tone: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20', label: 'Contract' },
}

export default function ComplianceView() {
  const { employees, loading } = useEmployees()

  const rows = React.useMemo<ExpiryRow[]>(() => {
    const kinds: { kind: DocKind; field: string }[] = [
      { kind: 'License', field: 'licenseExpiry' },
      { kind: 'Visa', field: 'visaExpiry' },
      { kind: 'Certification', field: 'certExpiry' },
      { kind: 'Contract', field: 'contractEnd' },
    ]
    const out: ExpiryRow[] = []
    employees.forEach((e: any) => {
      kinds.forEach(({ kind, field }) => {
        const raw = e[field]
        if (!raw) return
        const d = new Date(raw)
        if (isNaN(d.getTime())) return
        out.push({ id: `${e.id}-${field}`, employee: e, kind, date: raw, daysLeft: Math.ceil((d.getTime() - Date.now()) / DAY) })
      })
    })
    return out.sort((a, b) => a.daysLeft - b.daysLeft)
  }, [employees])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const expired = rows.filter(r => r.daysLeft < 0)
  const expiring = rows.filter(r => r.daysLeft >= 0 && r.daysLeft <= WINDOW)
  const contractsEnding = rows.filter(r => r.kind === 'Contract' && r.daysLeft >= 0 && r.daysLeft <= WINDOW)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Expired Documents" value={expired.length} icon={<CalendarX2 className="h-5 w-5" />} tone="danger" hint="Immediate action required" />
        <StatCard label="Expiring ≤ 90 Days" value={expiring.length} icon={<FileWarning className="h-5 w-5" />} tone="warning" hint="Start renewal paperwork" />
        <StatCard label="Contracts Ending Soon" value={contractsEnding.length} icon={<AlertTriangle className="h-5 w-5" />} tone="info" hint="Within the next 90 days" />
        <StatCard label="Healthy Documents" value={Math.max(0, rows.length - expired.length - expiring.length)} icon={<ShieldCheck className="h-5 w-5" />} tone="success" hint="Valid beyond 90 days" />
      </div>

      <SectionCard title="Document Expiries & Contract Renewals" description="Sorted by urgency — expired first">
        {rows.length === 0 ? (
          <EmptyState
            title="No dated documents on file"
            description="Add license, visa, certification or contract end dates to employee profiles to track renewals here."
            icon={<ShieldCheck className="h-6 w-6" />}
          />
        ) : (
          <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {rows.map(r => {
              const state = r.daysLeft < 0 ? 'expired' : r.daysLeft <= WINDOW ? 'soon' : 'ok'
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                    state === 'expired' && 'border-rose-500/30 bg-rose-500/5',
                    state === 'soon' && 'border-amber-500/30 bg-amber-500/5',
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">{initials(empName(r.employee))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {empName(r.employee)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{r.employee.designation}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDate(r.date)}</p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', KIND_META[r.kind].tone)}>{KIND_META[r.kind].label}</Badge>
                  <span
                    className={cn(
                      'w-24 shrink-0 text-right text-xs font-semibold',
                      state === 'expired' ? 'text-rose-600 dark:text-rose-400' : state === 'soon' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                    )}
                  >
                    {state === 'expired' ? `Expired ${Math.abs(r.daysLeft)}d ago` : `in ${r.daysLeft} days`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function empName(e: any): string {
  return e ? `${e.firstName} ${e.lastName}` : '—'
}
