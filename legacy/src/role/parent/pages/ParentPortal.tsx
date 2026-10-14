'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  PageHeader, StatCard, SectionCard, EmptyState, ErrorState, StatusBadge, CardGridSkeleton,
} from '@/components/erp/ui'
import { TrendArea, DonutChart } from '@/components/erp/charts'
import { api } from '@/lib/api-client'
import { inr, fmtDate, fmtDateTime, timeAgo, initials } from '@/lib/format'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import {
  CalendarCheck, Wallet, CalendarClock, GraduationCap, Bus, HeartPulse, Megaphone,
  BookOpen, FileText, CreditCard, CheckCircle2, Loader2, Send, MapPin, Phone, Gauge,
  Clock, ShieldAlert, Printer, PlaneTakeoff, ReceiptText, CircleAlert,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PortalChild { [key: string]: any }
interface PortalPayload {
  parent: { id: string; name: string; relation: string; phone?: string; email?: string }
  children: PortalChild[]
  announcements: any[]
}

/* ── Pay invoice dialog (demo gateway) ── */
function PayDialog({ child, invoice, open, onOpenChange, onPaid }: {
  child: PortalChild; invoice: any | null; open: boolean; onOpenChange: (o: boolean) => void; onPaid: () => void
}) {
  const [card, setCard] = React.useState('')
  const [expiry, setExpiry] = React.useState('')
  const [cvv, setCvv] = React.useState('')
  const [name, setName] = React.useState('')
  const [paying, setPaying] = React.useState(false)
  const [receipt, setReceipt] = React.useState<any | null>(null)

  React.useEffect(() => {
    if (open) { setCard(''); setExpiry(''); setCvv(''); setName(''); setReceipt(null) }
  }, [open])

  const due = invoice ? Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0) - (invoice.discount || 0)) : 0

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const pay = async () => {
    const digits = card.replace(/\s/g, '')
    if (digits.length < 12) { toast.error('Enter a valid card number'); return }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { toast.error('Expiry must be MM/YY'); return }
    if (cvv.length < 3) { toast.error('Enter the 3-digit CVV'); return }
    if (!name.trim()) { toast.error('Cardholder name is required'); return }
    setPaying(true)
    try {
      const res = await api('api/portal/parent/pay', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: invoice.id, method: 'ONLINE' }),
      })
      setReceipt(res?.data)
      toast.success('Payment successful', { description: `Receipt ${res?.data?.receiptNo} for ${inr(res?.data?.amount)}` })
      onPaid()
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (receipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Payment successful
            </DialogTitle>
            <DialogDescription>Demo gateway — no real money moved. Receipt recorded in the fee ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Receipt No</span><strong className="font-mono">{receipt.receiptNo}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><strong className="font-mono">{receipt.invoiceNo}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><strong>{child?.name}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><strong>{inr(receipt.amount)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><strong>Online (Card)</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid at</span><strong>{fmtDateTime(receipt.paidAt)}</strong></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {invoice?.invoiceNo || 'invoice'}</DialogTitle>
          <DialogDescription>
            {child?.name} · {invoice?.title || 'Fee invoice'} — due {inr(due)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount payable</p>
            <p className="text-3xl font-bold tracking-tight">{inr(due)}</p>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-card">Card number</Label>
              <Input id="pay-card" inputMode="numeric" placeholder="4111 1111 1111 1111" value={card} onChange={(e) => setCard(formatCard(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pay-exp">Expiry</Label>
                <Input id="pay-exp" inputMode="numeric" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pay-cvv">CVV</Label>
                <Input id="pay-cvv" inputMode="numeric" type="password" placeholder="•••" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-name">Cardholder name</Label>
              <Input id="pay-name" placeholder="As printed on card" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Demo gateway — use any dummy card details. Real charge never occurs.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={pay} disabled={paying}>
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Pay {inr(due)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Leave request dialog ── */
function LeaveDialog({ child, open, onOpenChange }: {
  child: PortalChild | null; open: boolean; onOpenChange: (o: boolean) => void
}) {
  const [type, setType] = React.useState('SICK')
  const [from, setFrom] = React.useState<Date | undefined>(undefined)
  const [to, setTo] = React.useState<Date | undefined>(undefined)
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const submit = async () => {
    if (!from || !to) { toast.error('Pick the from and to dates'); return }
    if (reason.trim().length < 5) { toast.error('Please describe the reason briefly'); return }
    setSaving(true)
    try {
      const body = {
        requesterType: 'STUDENT',
        requesterId: child?.student?.id,
        requesterName: child?.name,
        type,
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        reason: reason.trim(),
      }
      let ok = false
      try {
        await api('api/attendance/leave', { method: 'POST', body: JSON.stringify(body) })
        ok = true
      } catch {
        // Attendance module exposes the canonical endpoint; fall back to portal route if not yet live
        await api('api/portal/parent/leave', { method: 'POST', body: JSON.stringify(body) })
        ok = true
      }
      if (ok) {
        toast.success('Leave request submitted', { description: 'Awaiting class teacher / principal approval.' })
        onOpenChange(false)
        setReason(''); setFrom(undefined); setTo(undefined)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit leave request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request leave — {child?.name}</DialogTitle>
          <DialogDescription>Sent to the class teacher for approval. You will be notified of the decision.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Leave type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sick leave</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Dates</Label>
              <div className="flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start px-3 text-xs font-normal">
                      {from ? from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={from} onSelect={(d) => setFrom(d)} />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start px-3 text-xs font-normal" disabled={!from}>
                      {to ? to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={to} disabled={(d) => (from ? d < from : false)} onSelect={(d) => setTo(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lv-reason">Reason</Label>
            <Textarea id="lv-reason" rows={3} placeholder="e.g. Fever and doctor advised rest…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Small building blocks ── */
function ChildSwitcher({ items, selectedId, onSelect }: {
  items: PortalChild[]; selectedId: string; onSelect: (id: string) => void
}) {
  if (items.length === 0) return null
  if (items.length === 1) {
    const c = items[0]
    return (
      <div className="flex w-fit items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
        <Avatar className="h-9 w-9 border">
          {c.student.photoUrl && <AvatarImage src={c.student.photoUrl} alt={c.name} />}
          <AvatarFallback className="bg-emerald-500/15 text-xs text-emerald-700 dark:text-emerald-400">{initials(c.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold leading-tight">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.student.className || '—'} {c.student.sectionName ? `· Section ${c.student.sectionName}` : ''} · {c.student.admissionNo}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map(c => (
        <button
          key={c.student.id}
          onClick={() => onSelect(c.student.id)}
          className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${selectedId === c.student.id ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm' : 'bg-card hover:bg-accent'}`}
        >
          <Avatar className="h-8 w-8 border">
            {c.student.photoUrl && <AvatarImage src={c.student.photoUrl} alt={c.name} />}
            <AvatarFallback className="bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-400">{initials(c.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold leading-tight">{c.name.split(' ')[0]}</p>
            <p className="text-[10px] text-muted-foreground">{c.student.className || '—'} {c.student.sectionName || ''}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function RecentGrades({ child }: { child: PortalChild }) {
  const marks: any[] = child.subjectMarks || []
  if (!marks.length) return <EmptyState title="No results published yet" description="Grades appear once the school publishes exam results." icon={<GraduationCap className="h-7 w-7" />} />
  return (
    <ul className="space-y-2.5">
      {marks.slice(0, 6).map((m, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{m.grade || '–'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm"><span className="truncate font-medium">{m.subject}</span><span className="tabular-nums text-muted-foreground">{m.marks}/{m.maxMarks}</span></div>
            <Progress value={m.pct} className="mt-1 h-1.5" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ParentPortalModule() {
  const { session, moduleParams } = useErp()
  const [tab, setTab] = React.useState('overview')
  const [data, setData] = React.useState<PortalPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string>('')
  const [payInvoice, setPayInvoice] = React.useState<any | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)

  React.useEffect(() => {
    if (moduleParams?.tab && ['overview', 'attendance', 'fees', 'academics', 'transport', 'health', 'notices'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api<PortalPayload>('api/portal/parent')
      setData(res)
      setSelectedId(prev => prev || res.children?.[0]?.student?.id || '')
    } catch (e: any) {
      setError(e?.message || 'Unable to load the portal right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const child = React.useMemo(
    () => data?.children?.find(c => c.student.id === selectedId) || data?.children?.[0] || null,
    [data, selectedId],
  )

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <CardGridSkeleton count={4} />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data || !data.children?.length) {
    return (
      <div className="space-y-5">
        <PageHeader title={`Hello, ${data?.parent?.name?.split(' ')[0] || 'Parent'}`} subtitle="Parent Portal" />
        <EmptyState
          title="No linked children found"
          description="Your account is not yet linked to a student record. Please contact the school office."
          icon={<CircleAlert className="h-7 w-7" />}
        />
      </div>
    )
  }

  const att = child?.attendance || {}
  const rc = child?.reportCard
  const invoices: any[] = child?.invoices || []
  const outstanding = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
  const payments: any[] = child?.payments || []
  const homework: any[] = child?.homework || []

  return (
    <div className="space-y-5">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={`Hello, ${session?.name?.split(' ')[0] || data.parent.name}`}
          subtitle={`${child?.name ? `${child.name}'s` : 'your child\u2019s'} progress at a glance — attendance, fees, academics & transport.`}
        />
        <Button className="shrink-0 self-start sm:self-center" onClick={() => setLeaveOpen(true)}>
          <PlaneTakeoff className="mr-2 h-4 w-4" /> Request leave
        </Button>
      </div>

      <ChildSwitcher items={data.children} selectedId={selectedId} onSelect={setSelectedId} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${att.pct ?? 0}%`} tone={(att.pct ?? 0) >= 90 ? 'success' : 'warning'} icon={<CalendarCheck className="h-5 w-5" />} hint={`${att.present ?? 0} present / ${att.total ?? 0} days`} />
        <StatCard label="Fee Due" value={inr(child?.totalDue ?? 0, true)} tone={(child?.totalDue ?? 0) > 0 ? 'danger' : 'success'} icon={<Wallet className="h-5 w-5" />} hint={`${outstanding.length} open invoice${outstanding.length === 1 ? '' : 's'}`} />
        <StatCard label="Next Due" value={child?.nextDue ? fmtDate(child.nextDue.dueDate) : '—'} tone="info" icon={<CalendarClock className="h-5 w-5" />} hint={child?.nextDue ? `${child.nextDue.invoiceNo} · ${inr(child.nextDue.due, true)}` : 'Nothing pending'} />
        <StatCard label="Latest Grade" value={rc?.grade ?? '—'} tone="default" icon={<GraduationCap className="h-5 w-5" />} hint={rc ? `${rc.examName} · ${rc.percentage}%` : 'No published results'} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Attendance — last 14 school days" description="Daily presence score (100 = present)">
            {att.daily?.length ? (
              <TrendArea data={att.daily.slice(-14).map((d: any) => ({ date: d.date.slice(5), pct: d.pct }))} xKey="date" yKey="pct" height={180} color="#10b981" yFormatter={(v) => `${v}%`} />
            ) : <EmptyState title="No attendance yet" icon={<CalendarCheck className="h-7 w-7" />} />}
          </SectionCard>
          <SectionCard title="Recent grades" description={rc ? `${rc.examName} · Rank ${rc.rank ?? '—'}` : 'Latest published exam'}>
            <RecentGrades child={child} />
          </SectionCard>
          <SectionCard title="Homework due" description="Next 3 assignments for the class" contentClassName="p-0" className="lg:col-span-2">
            {homework.length ? (
              <ul className="divide-y">
                {homework.map((h: any) => (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${h.dueDaysLeft <= 1 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{h.subject} · {h.teacherName || 'Teacher'} · due {fmtDate(h.dueDate)}{h.dueDaysLeft <= 1 ? ' ⚠' : ''}</p>
                    </div>
                    {h.submitted
                      ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">Submitted</Badge>
                      : <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">Pending</Badge>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="All caught up!" description="No homework due right now." icon={<CheckCircle2 className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── ATTENDANCE ── */}
        <TabsContent value="attendance" className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="This month" className="lg:col-span-1">
            <div className="space-y-4 py-2">
              <DonutChart
                data={[
                  { name: 'Present', value: att.present || 0 },
                  { name: 'Absent', value: att.absent || 0 },
                  { name: 'Late/Half', value: (att.late || 0) + (att.halfDay || 0) },
                ].filter(d => d.value > 0)}
                nameKey="name" valueKey="value" height={190}
                colors={['#10b981', '#f43f5e', '#f59e0b']}
                centerLabel={`${att.pct ?? 0}%`}
              />
              <div className="grid grid-cols-3 border-t pt-3 text-center text-sm">
                <div><p className="font-bold text-emerald-600 dark:text-emerald-400">{att.present ?? 0}</p><p className="text-xs text-muted-foreground">Present</p></div>
                <div><p className="font-bold text-rose-600 dark:text-rose-400">{att.absent ?? 0}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                <div><p className="font-bold text-amber-600 dark:text-amber-400">{(att.late || 0) + (att.halfDay || 0)}</p><p className="text-xs text-muted-foreground">Late/Half</p></div>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Daily log — last 30 days" className="lg:col-span-2" contentClassName="p-0">
            {att.log?.length ? (
              <ul className="max-h-96 divide-y overflow-y-auto">
                {att.log.map((d: any, i: number) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-muted-foreground">{fmtDate(d.date)}</span>
                      <StatusBadge value={d.status} />
                    </div>
                    {d.checkInTime && <span className="text-xs text-muted-foreground">In {d.checkInTime}</span>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No attendance records" description="The school has not marked attendance yet." />}
          </SectionCard>
        </TabsContent>

        {/* ── FEES ── */}
        <TabsContent value="fees" className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Outstanding invoices" description="Tap Pay Now to settle online" contentClassName="p-0">
            {outstanding.length ? (
              <ul className="divide-y">
                {outstanding.map((inv: any) => (
                  <li key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{inv.title} <span className="ml-1 font-mono text-xs text-muted-foreground">{inv.invoiceNo}</span></p>
                      <p className="text-xs text-muted-foreground">
                        Due {fmtDate(inv.dueDate)} · <span className={inv.status === 'OVERDUE' ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{inr(inv.totalAmount - inv.paidAmount - (inv.discount || 0))} payable</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <StatusBadge value={inv.status} />
                      <Button size="sm" className="h-8" onClick={() => setPayInvoice(inv)}>
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Pay Now
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No dues pending" description="All invoices are settled. Thank you!" icon={<CheckCircle2 className="h-7 w-7" />} />}
          </SectionCard>
          <SectionCard title="Receipt history" description="Payments recorded for your children" contentClassName="p-0">
            {payments.length ? (
              <ul className="max-h-96 divide-y overflow-y-auto">
                {payments.map((p: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inr(p.amount)} <span className="ml-1 font-mono text-xs text-muted-foreground">{p.receiptNo}</span></p>
                      <p className="text-xs text-muted-foreground">{p.invoiceNo} · {p.method} · {fmtDateTime(p.paidAt)}</p>
                    </div>
                    <StatusBadge value={p.status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No payments yet" description="Receipts appear here after your first payment." icon={<ReceiptText className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── ACADEMICS ── */}
        <TabsContent value="academics" className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Report card" description={rc ? rc.examName : 'No published exam yet'}
            actions={rc ? <Button variant="outline" size="sm" className="h-8" onClick={() => window.print()}><Printer className="mr-1.5 h-3.5 w-3.5" /> Print</Button> : undefined}
          >
            {rc ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-3xl font-bold">{rc.percentage}%</p>
                    <p className="text-xs text-muted-foreground">Percentage</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{rc.grade}</p>
                    <p className="text-xs text-muted-foreground">Grade</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <p className="text-3xl font-bold">{rc.rank ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Class rank</p>
                  </div>
                </div>
                <p className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
                  {rc.obtained} / {rc.totalMarks} marks · {child?.student.className} {child?.student.sectionName || ''}
                </p>
              </div>
            ) : <EmptyState title="Not published" description="Results appear here once the school publishes them." icon={<GraduationCap className="h-7 w-7" />} />}
          </SectionCard>
          <SectionCard title="Subject-wise marks" className="lg:col-span-2" contentClassName="p-0">
            {child?.subjectMarks?.length ? (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Subject</th>
                      <th className="px-4 py-2.5 font-semibold">Marks</th>
                      <th className="px-4 py-2.5 font-semibold">Score</th>
                      <th className="px-4 py-2.5 font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {child.subjectMarks.map((m: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-medium">{m.subject}</td>
                        <td className="px-4 py-2.5 tabular-nums">{m.marks}/{m.maxMarks}</td>
                        <td className="w-32 px-4 py-2.5"><Progress value={m.pct} className="h-2" /></td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="font-bold">{m.grade || '—'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No marks recorded" icon={<FileText className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── TRANSPORT ── */}
        <TabsContent value="transport">
          {child?.transport ? (
            <SectionCard title="Bus tracking" description={`Route ${child.transport.routeName} · Stop ${child.transport.stopName}`}>
              <div className="grid gap-5 py-1 lg:grid-cols-[1fr_280px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Bus className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{child.transport.vehicle?.regNo || 'School bus'}</p>
                      <p className="truncate text-xs text-muted-foreground">{child.transport.vehicle?.model || ''} · Driver {child.transport.vehicle?.driverName || '—'}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      <Gauge className="mr-1 h-3 w-3" /> {child.transport.vehicle?.speedKmph ?? 0} km/h
                    </Badge>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>Route progress</span>
                      <span>{child.transport.progressPct}% along route</span>
                    </div>
                    <Progress value={child.transport.progressPct || 0} className="h-3" />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" /> Pickup: {child.transport.pickupTime || '—'}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> Drop: {child.transport.dropTime || '—'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Monthly fee</p>
                      <p className="mt-0.5 font-semibold">{inr(child.transport.monthlyFee || 0)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="mt-0.5 font-semibold">{child.transport.pickupStatus || child.transport.vehicle?.status || 'On route'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border p-4">
                  <p className="text-sm font-semibold">Driver contact</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> {child.transport.vehicle?.driverPhone || '—'}</p>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Last GPS ping {child.transport.vehicle?.lastGpsAt ? timeAgo(child.transport.vehicle.lastGpsAt) : '—'} ·
                    live tracking powered by the school GPS integration.
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : (
            <EmptyState
              title="No transport allocated"
              description="Your child is not registered for school transport. Contact the office to add a route."
              icon={<Bus className="h-7 w-7" />}
            />
          )}
        </TabsContent>

        {/* ── HEALTH ── */}
        <TabsContent value="health" className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Health profile" className="lg:col-span-1">
            <div className="space-y-3 py-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Blood group</span><strong>{child?.health?.bloodGroup || '—'}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Allergies</span><strong className="text-right">{child?.health?.allergies || 'None recorded'}</strong></div>
              <Separator />
              <p className="text-xs text-muted-foreground">Emergency contact: {data.parent.phone || '—'}</p>
            </div>
          </SectionCard>
          <SectionCard title="Recent clinic visits" description="Latest two entries from the school clinic" className="lg:col-span-2" contentClassName="p-0">
            {child?.clinicVisits?.length ? (
              <ul className="divide-y">
                {child.clinicVisits.map((v: any, i: number) => (
                  <li key={i} className="px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{v.reason}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${v.severity === 'SERIOUS' ? 'border-rose-500/30 text-rose-600' : v.severity === 'MODERATE' ? 'border-amber-500/30 text-amber-600' : 'border-emerald-500/30 text-emerald-600'}`}>{v.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(v.date)}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.diagnosis || '—'} {v.treatment ? `· ${v.treatment}` : ''} {v.attendedBy ? `· attended by ${v.attendedBy}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No clinic visits" description="A clean bill of health — nothing on record." icon={<HeartPulse className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── NOTICES ── */}
        <TabsContent value="notices" className="space-y-3">
          {data.announcements.length ? data.announcements.map((a: any) => (
            <div key={a.id} className={`rounded-xl border p-4 shadow-sm ${a.priority === 'URGENT' ? 'border-rose-500/40 bg-rose-500/5' : 'bg-card'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-semibold">{a.title}</p>
                <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                {a.priority === 'URGENT' && <Badge className="bg-rose-500/15 text-xs text-rose-700 dark:text-rose-400">Urgent</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(a.publishedAt)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              {a.publishedBy && <p className="mt-1.5 text-xs text-muted-foreground">— {a.publishedBy}</p>}
            </div>
          )) : <EmptyState title="No notices" description="School announcements for parents will appear here." icon={<Megaphone className="h-7 w-7" />} />}
        </TabsContent>
      </Tabs>

      <PayDialog child={child} invoice={payInvoice} open={!!payInvoice} onOpenChange={(o) => !o && setPayInvoice(null)} onPaid={load} />
      <LeaveDialog child={child} open={leaveOpen} onOpenChange={setLeaveOpen} />
    </div>
  )
}
