'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  PageHeader, StatCard, SectionCard, ErrorState, CardGridSkeleton,
} from '@/components/erp/ui'
import { DataTable } from '@/components/erp/DataTable'
import { DonutChart } from '@/components/erp/charts'
import { list } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  ScrollText, CalendarClock, ShieldQuestion, Download, Fingerprint,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ACTION_TONES: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  APPROVE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  PUBLISH: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  UPDATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LOGIN: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  LOGOUT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  DELETE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  REJECT: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  EXPORT: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  VIEW: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

const ROLE_TONES: Record<string, string> = {
  SUPER_ADMIN: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  SCHOOL_ADMIN: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PRINCIPAL: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  ACCOUNTANT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  TEACHER: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  COUNSELLOR: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  NURSE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  WARDEN: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LIBRARIAN: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  SECURITY: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

function downloadCsv(rows: any[]) {
  if (!rows.length) { toast.error('Nothing to export yet'); return }
  const headers = ['createdAt', 'userName', 'userRole', 'action', 'entity', 'entityId', 'details', 'ip']
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(h === 'createdAt' ? r.createdAt : r[h])).join(',')),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${rows.length} audit events`)
}

export default function AuditLogsModule() {
  const [all, setAll] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await list('api/audit-logs', { all: 1, sortBy: 'createdAt', sortDir: 'desc' })
      setAll(r.data || [])
    } catch (e: any) {
      setError(e?.message || 'Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const today = new Date().toDateString()
  const todayCount = all.filter(r => new Date(r.createdAt).toDateString() === today).length
  const byAction = Object.entries(
    all.reduce<Record<string, number>>((acc, r) => {
      const a = r.action || 'OTHER'
      acc[a] = (acc[a] || 0) + 1
      return acc
    }, {}),
  ).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count)

  const actions = [...new Set(all.map(r => r.action).filter(Boolean))].sort()
  const entities = [...new Set(all.map(r => r.entity).filter(Boolean))].sort()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Logs"
        subtitle="Every create, update, delete, approval and export — who did what, when and from where."
        breadcrumbs={['System', 'Audit Logs']}
        actions={
          <Button variant="outline" size="sm" className="h-9" onClick={() => downloadCsv(all)}>
            <Download className="mr-2 h-4 w-4" /> Export view (CSV)
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total Events" value={all.length.toLocaleString('en-IN')} icon={<ScrollText className="h-5 w-5" />} hint="Full audit trail" />
            <StatCard label="Today" value={todayCount} tone="info" icon={<CalendarClock className="h-5 w-5" />} hint="Events since midnight" />
            <StatCard
              label="Most Active Action"
              value={byAction[0] ? `${byAction[0].action}` : '—'}
              tone="warning"
              icon={<Fingerprint className="h-5 w-5" />}
              hint={byAction[0] ? `${byAction[0].count} events` : 'No events yet'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <SectionCard title="Events by Action" className="lg:col-span-1">
              {byAction.length ? (
                <DonutChart data={byAction} nameKey="action" valueKey="count" height={240} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No events recorded yet.</p>
              )}
            </SectionCard>

            <div className="lg:col-span-3">
              <DataTable
                endpoint="api/audit-logs"
                defaultPageSize={20}
                pageSizeOptions={[10, 20, 50]}
                allowCreate={false}
                allowEdit={false}
                allowDelete={false}
                searchPlaceholder="Search user, entity or record id…"
                defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
                filters={[
                  { key: 'action', label: 'Action', options: actions.map(a => ({ label: a, value: a })) },
                  { key: 'entity', label: 'Entity', options: entities.map(e => ({ label: e, value: e })) },
                ]}
                columns={[
                  { key: 'createdAt', label: 'When', date: true, sortable: true },
                  { key: 'userName', label: 'User', render: (row) => <span className="font-medium">{row.userName || 'System'}</span> },
                  { key: 'userRole', label: 'Role', sortable: false, render: (row) => row.userRole ? (
                    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_TONES[row.userRole] || 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20'}`}>
                      {row.userRole.replace(/_/g, ' ')}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span> },
                  { key: 'action', label: 'Action', render: (row) => (
                    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ACTION_TONES[row.action] || 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20'}`}>
                      {row.action}
                    </span>
                  ) },
                  { key: 'entity', label: 'Entity' },
                  { key: 'entityId', label: 'Record', sortable: false, render: (row) => <code className="line-clamp-1 text-[11px] text-muted-foreground">{row.entityId || '—'}</code> },
                  { key: 'details', label: 'Details', sortable: false, render: (row) => <span className="line-clamp-2 text-xs text-muted-foreground">{row.details || '—'}</span> },
                  { key: 'ip', label: 'IP', sortable: false, render: (row) => <code className="text-[11px]">{row.ip || '—'}</code> },
                ]}
                emptyTitle="No audit events found"
                emptyDescription="Actions performed in the ERP are recorded here automatically. Try adjusting filters."
              />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldQuestion className="h-3.5 w-3.5" /> Audit records are append-only and retained for 7 years per board compliance.
          </p>
        </>
      )}
    </div>
  )
}
