'use client'

/**
 * Finance Dashboard — live KPIs computed from invoices/payments, monthly collection
 * bars, invoice status donut, top outstanding students and recent receipts.
 */
import * as React from 'react'
import { api, ApiError } from '@/lib/api-client'
import { PageHeader, StatCard, SectionCard, EmptyState, ErrorState, StatusBadge } from '@/components/erp/ui'
import { BarsChart, DonutChart } from '@/components/erp/charts'
import { inr, fmtDate, timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ReceiptText, Wallet, AlertTriangle, BadgeIndianRupee, RefreshCw,
  ArrowRight, Users, Clock,
} from 'lucide-react'
import { useStudents, METHOD_LABELS, MONTHS } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function FinanceDashboard({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const [invoices, setInvoices] = React.useState<any[] | null>(null)
  const [payments, setPayments] = React.useState<any[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const { nameOf } = useStudents()

  const load = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api<{ data: any[] }>('/api/fees/invoices?all=1'),
      api<{ data: any[] }>('/api/fees/payments?all=1'),
    ])
      .then(([inv, pay]) => {
        if (!alive) return
        setInvoices(inv.data || [])
        setPayments(pay.data || [])
      })
      .catch((e: ApiError) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!invoices || !payments) return null

  /* ── KPIs (client-side reduction — fine for ~224 invoices) ── */
  const totalBilled = invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
  const collected = invoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)
  const outstanding = Math.max(0, totalBilled - collected)
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length
  const collectionRate = totalBilled ? Math.round((collected / totalBilled) * 100) : 0

  /* ── Monthly collection — last 8 months from payments ── */
  const monthly = new Map<string, number>()
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthly.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
  }
  payments.forEach(p => {
    if (p.status && p.status !== 'SUCCESS') return
    const d = new Date(p.paidAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthly.has(key)) monthly.set(key, (monthly.get(key) || 0) + (Number(p.amount) || 0))
  })
  const monthlyData = Array.from(monthly.entries()).map(([key, amount]) => ({
    month: MONTHS[Number(key.split('-')[1]) - 1],
    collected: amount,
  }))

  /* ── Invoice status split ── */
  const statusOrder = ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'CANCELLED']
  const statusData = statusOrder
    .map(s => ({ name: s.charAt(0) + s.slice(1).toLowerCase(), count: invoices.filter(i => i.status === s).length }))
    .filter(s => s.count > 0)

  /* ── Top 5 outstanding students ── */
  const byStudent = new Map<string, { balance: number; count: number }>()
  invoices.forEach(i => {
    const bal = (Number(i.totalAmount) || 0) - (Number(i.paidAmount) || 0)
    if (bal <= 0 || i.status === 'CANCELLED') return
    const cur = byStudent.get(i.studentId) || { balance: 0, count: 0 }
    byStudent.set(i.studentId, { balance: cur.balance + bal, count: cur.count + 1 })
  })
  const topOutstanding = Array.from(byStudent.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  /* ── Recent payments ── */
  const recent = [...payments]
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance Dashboard"
        subtitle="Collections, outstanding fees and spend — live from the ledger."
        breadcrumbs={['Finance', 'Fees & Finance', 'Dashboard']}
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Billed" value={inr(totalBilled, true)} icon={<ReceiptText className="h-5 w-5" />} tone="info" hint={`${invoices.length} invoices · ${collectionRate}% collected`} onClick={() => onGoTo('invoices')} />
        <StatCard label="Collected" value={inr(collected, true)} icon={<Wallet className="h-5 w-5" />} tone="success" hint={`${payments.length} receipts issued`} onClick={() => onGoTo('payments')} />
        <StatCard label="Outstanding" value={inr(outstanding, true)} icon={<BadgeIndianRupee className="h-5 w-5" />} tone="warning" hint={`${byStudent.size} students with dues`} onClick={() => onGoTo('invoices')} />
        <StatCard label="Overdue Invoices" value={overdueCount} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" hint="Past due & unpaid — follow up" onClick={() => onGoTo('invoices')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Monthly Collection" description="Successful payments received (₹)" className="xl:col-span-2">
          {monthlyData.every(m => m.collected === 0) ? (
            <EmptyState title="No payments in the last 8 months" description="Recorded receipts will chart here month by month." icon={<Wallet className="h-6 w-6" />} />
          ) : (
            <BarsChart
              data={monthlyData} xKey="month"
              series={[{ key: 'collected', label: 'Collected (₹)', color: '#10b981' }]}
              height={270}
              yFormatter={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v}`)}
            />
          )}
        </SectionCard>
        <SectionCard title="Invoice Status Split" description="All invoices by current state">
          {statusData.length === 0 ? (
            <EmptyState title="No invoices yet" description="Create invoices to see the status split." icon={<ReceiptText className="h-6 w-6" />} />
          ) : (
            <DonutChart data={statusData} nameKey="name" valueKey="count" height={270} centerLabel={`${collectionRate}%`} />
          )}
        </SectionCard>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Top Outstanding Students"
          description="Highest unpaid balances right now"
          actions={<Button variant="ghost" size="sm" onClick={() => onGoTo('invoices')}>All invoices <ArrowRight className="h-4 w-4" /></Button>}
        >
          {topOutstanding.length === 0 ? (
            <EmptyState title="Zero outstanding 🎉" description="Every invoice has been settled in full." icon={<Users className="h-6 w-6" />} />
          ) : (
            <div className="space-y-2">
              {topOutstanding.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-700 dark:text-amber-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nameOf(s.id)}</p>
                    <p className="text-xs text-muted-foreground">{s.count} unpaid invoice{s.count > 1 ? 's' : ''}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">{inr(s.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Payments"
          description="Latest receipts issued"
          actions={<Button variant="ghost" size="sm" onClick={() => onGoTo('payments')}>Ledger <ArrowRight className="h-4 w-4" /></Button>}
        >
          {recent.length === 0 ? (
            <EmptyState title="No payments recorded yet" description="Collect a payment from an invoice to see receipts here." icon={<Clock className="h-6 w-6" />} />
          ) : (
            <div className="space-y-2">
              {recent.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {nameOf(p.studentId)} <span className="font-normal text-muted-foreground">· {p.receiptNo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {METHOD_LABELS[p.method] || p.method} · {timeAgo(p.paidAt)} · {fmtDate(p.paidAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{inr(p.amount)}</span>
                    <StatusBadge value={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Figures computed live from {invoices.length} invoices and {payments.length} receipts · <Badge variant="outline" className="mx-0.5">INR</Badge> Greenwood International School, Mumbai
      </p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
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
