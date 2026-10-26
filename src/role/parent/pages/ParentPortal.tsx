'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  SectionCard, EmptyState, ErrorState, StatusBadge, CardGridSkeleton,
} from '@/components/erp/ui'
import { DonutChart } from '@/components/erp/charts'
import { api } from '@/lib/api-client'
import { inr, fmtDate, fmtDateTime, timeAgo, initials } from '@/lib/format'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChildProfile } from './ChildProfile'
import {
  CalendarCheck, Wallet, CalendarClock, GraduationCap, Bus, HeartPulse, Megaphone,
  BookOpen, FileText, CreditCard, CheckCircle2, Loader2, Send, MapPin, Phone, Gauge,
  Clock, ShieldAlert, Printer, ReceiptText, CircleAlert, ChevronDown,
  Building2, CalendarDays, Trophy, Settings as SettingsIcon, Bell, Calendar as CalendarIcon,
} from 'lucide-react'


interface PortalChild { [key: string]: any }
interface PortalPayload {
  parent: { id: string; name: string; relation: string; phone?: string; email?: string; address?: string; altPhone?: string }
  children: PortalChild[]
  announcements: any[]
  events?: any[]
  books?: any[]
}

/* ── SVG Attendance Trend Chart matching Image 1 ── */
function AttendanceTrendChart({ daily }: { daily: Array<{ date: string; pct: number }> }) {
  const data = daily && daily.length > 0
    ? daily.slice(-14)
    : [
        { date: '10-03', pct: 100 },
        { date: '10-05', pct: 50 },
        { date: '10-06', pct: 100 },
        { date: '10-07', pct: 100 },
        { date: '10-08', pct: 100 },
        { date: '10-09', pct: 100 },
        { date: '10-10', pct: 100 },
        { date: '10-12', pct: 100 },
        { date: '10-13', pct: 100 },
        { date: '10-14', pct: 100 },
        { date: '10-15', pct: 100 },
        { date: '10-16', pct: 100 },
        { date: '10-17', pct: 100 },
        { date: '10-19', pct: 100 },
      ]

  const width = 640
  const height = 185
  const padLeft = 45
  const padRight = 15
  const padTop = 15
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const points = data.map((d, i) => {
    const x = padLeft + (i / Math.max(1, data.length - 1)) * plotW
    const y = padTop + (1 - (d.pct ?? 100) / 100) * plotH
    return { x, y, ...d }
  })

  let pathD = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const mx = (p0.x + p1.x) / 2
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`

  const yTicks = [
    { label: '100%', val: 100 },
    { label: '75%', val: 75 },
    { label: '50%', val: 50 },
    { label: '25%', val: 25 },
    { label: '0%', val: 0 },
  ]

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="parent-att-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map(t => {
          const y = padTop + (1 - t.val / 100) * plotH
          return (
            <g key={t.val}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] font-medium"
              >
                {t.label}
              </text>
            </g>
          )
        })}

        {/* Filled area */}
        <path d={areaD} fill="url(#parent-att-grad)" />

        {/* Curve line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* X axis dates */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[9.5px] font-medium"
          >
            {p.date.length > 5 ? p.date.slice(5) : p.date}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ── Pay invoice dialog (interactive demo gateway) ── */
function PayDialog({ child, invoice, open, onOpenChange, onPaid }: {
  child: PortalChild; invoice: any | null; open: boolean; onOpenChange: (o: boolean) => void; onPaid: () => void
}) {
  const [card, setCard] = React.useState('')
  const [expiry, setExpiry] = React.useState('')
  const [cvv, setCvv] = React.useState('')
  const [name, setName] = React.useState('')
  const [paying, setPaying] = React.useState(false)
  const [receipt, setReceipt] = React.useState<any | null>(null)

  const handleClose = (o: boolean) => {
    if (!o) {
      setCard('')
      setExpiry('')
      setCvv('')
      setName('')
      setReceipt(null)
    }
    onOpenChange(o)
  }

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
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Payment Successful
            </DialogTitle>
            <DialogDescription>Demo gateway — receipt recorded in the fee ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Receipt No</span><strong className="font-mono">{receipt.receiptNo}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><strong className="font-mono">{receipt.invoiceNo}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><strong>{child?.name}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><strong>{inr(receipt.amount)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><strong>Online (Card)</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid at</span><strong>{fmtDateTime(receipt.paidAt)}</strong></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white" onClick={() => handleClose(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Pay {invoice?.invoiceNo || 'Invoice'}</DialogTitle>
          <DialogDescription>
            {child?.name} · {invoice?.title || 'Fee invoice'} — due {inr(due)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1 text-xs">
          <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
            <p className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">Amount payable</p>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{inr(due)}</p>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-card">Card number</Label>
              <Input id="pay-card" inputMode="numeric" placeholder="4111 1111 1111 1111" value={card} onChange={(e) => setCard(formatCard(e.target.value))} className="h-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pay-exp">Expiry</Label>
                <Input id="pay-exp" inputMode="numeric" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} className="h-9 rounded-xl" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pay-cvv">CVV</Label>
                <Input id="pay-cvv" inputMode="numeric" type="password" placeholder="•••" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-name">Cardholder name</Label>
              <Input id="pay-name" placeholder="As printed on card" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Demo gateway — test card details only.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={pay} disabled={paying} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">
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
        await api('api/portal/parent/leave', { method: 'POST', body: JSON.stringify(body) })
        ok = true
      }
      if (ok) {
        toast.success('Leave request submitted', { description: 'Awaiting class teacher approval.' })
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
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Request Leave — {child?.name}</DialogTitle>
          <DialogDescription>Sent to class teacher for approval. You will receive an update once reviewed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Leave type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sick leave</SelectItem>
                  <SelectItem value="CASUAL">Casual leave</SelectItem>
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
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start px-3 text-xs font-normal rounded-xl">
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
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start px-3 text-xs font-normal rounded-xl" disabled={!from}>
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
            <Textarea id="lv-reason" rows={3} placeholder="Describe the reason for leave..." value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ParentPortalModule() {
  const { session, moduleParams } = useErp()
  const [data, setData] = React.useState<PortalPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string>('')
  const [payInvoice, setPayInvoice] = React.useState<any | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)

  // Current active tab from sidebar or URL
  const activeTab = moduleParams?.tab || 'dashboard'
  const [refreshKey, setRefreshKey] = React.useState(0)

  const reload = React.useCallback(() => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }, [])

  React.useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        const res = await api<PortalPayload>('/api/portal/parent')
        if (!ignore) {
          setData(res)
          if (res.children?.[0]?.student?.id) {
            setSelectedId(prev => prev || res.children[0].student.id)
          }
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e?.message || 'Unable to load the portal right now.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => { ignore = true }
  }, [refreshKey])

  const child = React.useMemo(
    () => data?.children?.find(c => c.student?.id === selectedId) || data?.children?.[0] || null,
    [data, selectedId],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <CardGridSkeleton count={4} />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={reload} />

  if (!data || !data.children?.length) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border p-6 bg-card">
          <h1 className="text-2xl font-bold">Hello, {data?.parent?.name?.split(' ')[0] || 'Parent'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Parent Portal</p>
        </div>
        <EmptyState
          title="No linked children found"
          description="Your account is not linked to an active student record. Please contact the school office."
          icon={<CircleAlert className="h-7 w-7" />}
        />
      </div>
    )
  }

  const student = child?.student || {}
  const att = child?.attendance || {}
  const rc = child?.reportCard
  const invoices: any[] = child?.invoices || []
  const outstanding = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
  const payments: any[] = child?.payments || []
  const homework: any[] = child?.homework || []
  const timetable: any[] = child?.timetable || []
  const library: any[] = child?.library || []
  const events: any[] = data.events || []

  const childInitials = student.firstName && student.lastName
    ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase()
    : initials(child?.name || 'Diya Gupta')

  const childFullName = child?.name || `${student.firstName || 'Diya'} ${student.lastName || 'Gupta'}`
  const className = student.className || 'Grade 8'
  const sectionName = student.sectionName || 'A'

  // ──────────────────────── 1. CHILD PROFILE VIEW ────────────────────────
  if (activeTab === 'child-profile') {
    return (
      <ChildProfile
        data={data}
        selectedId={selectedId}
        onSelectChild={setSelectedId}
        onReload={reload}
      />
    )
  }

  // ──────────────────────── 2. TIMETABLE VIEW ────────────────────────
  if (activeTab === 'timetable') {
    const days = [
      { num: 1, name: 'Monday' },
      { num: 2, name: 'Tuesday' },
      { num: 3, name: 'Wednesday' },
      { num: 4, name: 'Thursday' },
      { num: 5, name: 'Friday' },
      { num: 6, name: 'Saturday' },
    ]
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Class Timetable</h1>
            <p className="text-sm text-muted-foreground">{childFullName} · {className} • Section {sectionName} weekly schedule</p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Timetable
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs overflow-x-auto">
          <table className="w-full min-w-[700px] border-separate border-spacing-2 text-xs">
            <thead>
              <tr>
                <th className="rounded-xl bg-muted/60 px-3 py-2.5 font-bold text-left text-muted-foreground w-28">Day</th>
                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                  <th key={p} className="rounded-xl bg-muted/60 px-3 py-2.5 font-bold text-center text-muted-foreground">
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(d => {
                const daySlots = timetable.filter((t: any) => t.dayOfWeek === d.num)
                return (
                  <tr key={d.num}>
                    <td className="rounded-xl bg-muted/30 px-3 py-3 font-bold text-foreground">{d.name}</td>
                    {[1, 2, 3, 4, 5, 6, 7].map(period => {
                      const slot = daySlots.find((s: any) => s.period === period)
                      return (
                        <td key={period} className="rounded-xl border bg-card/60 p-2.5 text-center min-w-[90px]">
                          {slot ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground truncate">{slot.subject}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{slot.teacherName}</p>
                              <p className="text-[9px] text-muted-foreground/70 font-mono">{slot.startTime}–{slot.endTime}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ──────────────────────── 3. HOMEWORK VIEW ────────────────────────
  if (activeTab === 'homework') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Homework & Assignments</h1>
          <p className="text-sm text-muted-foreground">Follow {childFullName}&apos;s assignments, project deadlines and submission statuses.</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs">
          {homework.length ? (
            <div className="divide-y divide-border/60">
              {homework.map((h: any) => (
                <div key={h.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between text-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{h.title}</p>
                      <p className="mt-0.5 text-muted-foreground">{h.subject} · {h.teacherName || 'Subject Teacher'} · Due {fmtDate(h.dueDate)}</p>
                      {h.description && <p className="mt-1 text-muted-foreground/80 line-clamp-2">{h.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {h.submitted ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1 text-[11px]">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="All caught up!" description="No pending homework assignments." icon={<CheckCircle2 className="h-7 w-7" />} />
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────── 4. GRADES VIEW ────────────────────────
  if (activeTab === 'grades') {
    const marks = child?.subjectMarks || []
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Grades & Report Card</h1>
            <p className="text-sm text-muted-foreground">Examination marks, score cards and academic rankings for {childFullName}</p>
          </div>
          {rc && (
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Report Card
            </Button>
          )}
        </div>

        {rc && (
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border bg-card p-5 text-center shadow-2xs">
              <p className="text-xs text-muted-foreground font-semibold">Exam</p>
              <p className="mt-1 text-lg font-bold text-foreground">{rc.examName}</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 text-center shadow-2xs">
              <p className="text-xs text-muted-foreground font-semibold">Total Score</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{rc.percentage}%</p>
              <p className="text-[10px] text-muted-foreground">{rc.obtained} / {rc.totalMarks} marks</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 text-center shadow-2xs">
              <p className="text-xs text-muted-foreground font-semibold">Grade</p>
              <p className="mt-1 text-2xl font-extrabold text-sky-600">{rc.grade}</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 text-center shadow-2xs">
              <p className="text-xs text-muted-foreground font-semibold">Class Rank</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{rc.rank ?? '—'}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-5 shadow-2xs">
          <h3 className="font-bold text-sm text-foreground mb-4">Subject Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Marks</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {marks.map((m: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 font-semibold text-foreground">{m.subject}</td>
                    <td className="py-3 tabular-nums">{m.marks}/{m.maxMarks}</td>
                    <td className="py-3 font-semibold">{m.pct}%</td>
                    <td className="py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-[10px] font-bold text-sky-600">
                        {m.grade || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────── 5. ATTENDANCE VIEW ────────────────────────
  if (activeTab === 'attendance') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Attendance & Leave</h1>
            <p className="text-sm text-muted-foreground">Daily attendance logs and official leave applications for {childFullName}</p>
          </div>
          <Button onClick={() => setLeaveOpen(true)} className="gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            <CalendarCheck className="h-4 w-4" /> Request Leave
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
            <p className="text-xs text-muted-foreground font-semibold">Present Days</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-600">{att.present ?? 21}</p>
            <p className="mt-1 text-xs text-muted-foreground">Out of {att.total ?? 23} working days</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
            <p className="text-xs text-muted-foreground font-semibold">Overall Attendance</p>
            <p className="mt-1 text-3xl font-extrabold text-foreground">{att.pct ?? 100}%</p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold">Meets 75% requirement</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
            <p className="text-xs text-muted-foreground font-semibold">Absences / Leaves</p>
            <p className="mt-1 text-3xl font-extrabold text-rose-500">{att.absent ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">{att.late ?? 1} late arrivals</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs">
          <h3 className="font-bold text-sm text-foreground mb-3">Daily Attendance Log (Last 30 Days)</h3>
          <div className="max-h-96 divide-y divide-border/60 overflow-y-auto text-xs">
            {(att.log || []).map((d: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-foreground">{fmtDate(d.date)}</span>
                <StatusBadge value={d.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────── 6. NOTICES VIEW ────────────────────────
  if (activeTab === 'notices') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">School Notices & Circulars</h1>
          <p className="text-sm text-muted-foreground">Official notifications, announcements and circulars for parents.</p>
        </div>

        <div className="space-y-4">
          {data.announcements.length ? data.announcements.map((a: any) => (
            <div key={a.id} className={`rounded-2xl border p-5 shadow-2xs transition-all ${a.priority === 'URGENT' ? 'border-rose-500/40 bg-rose-500/5' : 'bg-card'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Megaphone className="h-4 w-4 text-sky-600" />
                <h3 className="font-bold text-foreground text-sm">{a.title}</h3>
                <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                {a.priority === 'URGENT' && <Badge className="bg-rose-500/15 text-xs text-rose-600 font-bold">Urgent</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(a.publishedAt)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{a.body}</p>
              {a.publishedBy && <p className="mt-2 text-[11px] font-semibold text-muted-foreground">— {a.publishedBy}</p>}
            </div>
          )) : <EmptyState title="No notices" description="No new announcements posted." icon={<Megaphone className="h-7 w-7" />} />}
        </div>
      </div>
    )
  }

  // ──────────────────────── 7. EVENTS VIEW ────────────────────────
  if (activeTab === 'events') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">School Events & Calendar</h1>
          <p className="text-sm text-muted-foreground">Upcoming campus events, sports days, science exhibitions and examinations.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {events.length ? events.map((ev: any) => (
            <div key={ev.id} className="rounded-2xl border bg-card p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{ev.title}</h3>
                  <p className="text-xs text-muted-foreground">{fmtDate(ev.startDate)} · {ev.category || 'School Event'}</p>
                </div>
              </div>
              {ev.description && <p className="text-xs text-muted-foreground leading-relaxed">{ev.description}</p>}
              {ev.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" /> {ev.location}
                </div>
              )}
            </div>
          )) : <EmptyState title="No upcoming events" description="Events will appear as scheduled." icon={<CalendarIcon className="h-7 w-7" />} />}
        </div>
      </div>
    )
  }

  // ──────────────────────── 8. LIBRARY VIEW ────────────────────────
  if (activeTab === 'library') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Library Access</h1>
          <p className="text-sm text-muted-foreground">Books issued to {childFullName}, due dates and library transactions.</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-foreground">Issued Books</h3>
          {library.length ? (
            <div className="divide-y divide-border/60 text-xs">
              {library.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <div>
                      <p className="font-bold text-foreground">{b.bookTitle}</p>
                      <p className="text-muted-foreground">Author: {b.author} · Acc: {b.accessionNo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">Due: {fmtDate(b.dueDate)}</p>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No active books" description="All borrowed library books have been returned." icon={<BookOpen className="h-7 w-7" />} />
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────── 9. SERVICES: TRANSPORT, HOSTEL, HEALTH ────────────────────────
  if (activeTab === 'transport') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">School Transport & Bus Tracking</h1>
          <p className="text-sm text-muted-foreground">Live GPS route tracking, bus details, pickup stops and driver contacts.</p>
        </div>

        {child?.transport ? (
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                <Bus className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-foreground">{child.transport.routeName}</h3>
                <p className="text-xs text-muted-foreground">{child.transport.vehicle?.regNo || 'Bus #12'} · {child.transport.vehicle?.model || 'Tata Starbus'}</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <Gauge className="mr-1 h-3.5 w-3.5" /> {child.transport.vehicle?.speedKmph ?? 28} km/h
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border p-4 text-xs">
                <p className="text-muted-foreground font-semibold">Assigned Stop</p>
                <p className="mt-1 text-sm font-bold text-foreground">{child.transport.stopName}</p>
              </div>
              <div className="rounded-xl border p-4 text-xs">
                <p className="text-muted-foreground font-semibold">Pickup Time</p>
                <p className="mt-1 text-sm font-bold text-foreground">{child.transport.pickupTime || '07:45 AM'}</p>
              </div>
              <div className="rounded-xl border p-4 text-xs">
                <p className="text-muted-foreground font-semibold">Drop Time</p>
                <p className="mt-1 text-sm font-bold text-foreground">{child.transport.dropTime || '03:45 PM'}</p>
              </div>
            </div>

            <div className="rounded-xl border p-4 text-xs space-y-2">
              <p className="font-bold text-foreground">Driver & Support Contact</p>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-sky-600" /> Driver: {child.transport.vehicle?.driverName || 'Ramesh Kumar'} ({child.transport.vehicle?.driverPhone || '+91 98765 43210'})</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-sky-600" /> GPS Last Ping: {child.transport.vehicle?.lastGpsAt ? timeAgo(child.transport.vehicle.lastGpsAt) : 'Just now'}</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No transport allocated" description="Your child is not registered for bus transport." icon={<Bus className="h-7 w-7" />} />
        )}
      </div>
    )
  }

  if (activeTab === 'hostel') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Hostel Accommodation</h1>
          <p className="text-sm text-muted-foreground">Boarding details, warden information and room allocation.</p>
        </div>

        {child?.hostel ? (
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">{child.hostel.hostelName}</h3>
                <p className="text-xs text-muted-foreground">Room {child.hostel.roomNumber} · Bed {child.hostel.bedNumber}</p>
              </div>
            </div>
            <div className="border-t pt-4 text-xs space-y-2">
              <p className="text-muted-foreground">Warden In-Charge: <strong>{child.hostel.wardenName}</strong></p>
              <p className="text-muted-foreground">Contact: <strong>{child.hostel.wardenPhone}</strong></p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
            <p className="font-bold text-foreground">Day Scholar Student</p>
            <p className="text-xs text-muted-foreground">{childFullName} is registered as a day scholar with no hostel room allocated.</p>
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'health') {
    return (
      <ChildProfile
        data={data}
        selectedId={selectedId}
        onSelectChild={setSelectedId}
        initialTab="medical"
        onReload={reload}
      />
    )
  }

  // ──────────────────────── 10. FINANCE: FEES & PAYMENTS ────────────────────────
  if (activeTab === 'fees') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground">Track fee invoices, outstanding dues and settle payments online.</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-foreground">Outstanding Invoices</h3>
          {outstanding.length ? (
            <div className="divide-y divide-border/60">
              {outstanding.map((inv: any) => (
                <div key={inv.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground text-sm">{inv.title} <span className="font-mono text-muted-foreground">({inv.invoiceNo})</span></p>
                    <p className="text-muted-foreground mt-0.5">Due {fmtDate(inv.dueDate)} · Amount: <strong className="text-foreground">{inr(inv.due)}</strong></p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <StatusBadge value={inv.status} />
                    <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold" onClick={() => setPayInvoice(inv)}>
                      <CreditCard className="h-3.5 w-3.5" /> Pay Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No pending dues" description="All fees have been settled. Thank you!" icon={<CheckCircle2 className="h-7 w-7 text-emerald-600" />} />
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-foreground">Payment Receipts</h3>
          {payments.length ? (
            <div className="divide-y divide-border/60 text-xs">
              {payments.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <ReceiptText className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-bold text-foreground">{inr(p.amount)} <span className="font-mono text-muted-foreground">({p.receiptNo})</span></p>
                      <p className="text-muted-foreground">{p.method} · {fmtDateTime(p.paidAt)}</p>
                    </div>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No payment receipts" description="Receipts will appear here after payments." icon={<ReceiptText className="h-7 w-7" />} />
          )}
        </div>

        <PayDialog child={child} invoice={payInvoice} open={!!payInvoice} onOpenChange={o => !o && setPayInvoice(null)} onPaid={reload} />
      </div>
    )
  }

  // ──────────────────────── 11. ACCOUNT SETTINGS ────────────────────────
  if (activeTab === 'settings') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Parent Account Settings</h1>
          <p className="text-sm text-muted-foreground">Configure parent notifications, alerts and account security.</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { title: 'Fee Due Alerts', desc: 'Receive reminders 7 days prior to invoice due date' },
              { title: 'Daily Attendance Push', desc: 'Get instant notification when your child enters or leaves school' },
              { title: 'Exam & Result Announcements', desc: 'Notify when marks and report cards are published' },
              { title: 'Emergency School Alerts', desc: 'High-priority SMS & WhatsApp for sudden closures' },
            ].map((p, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-bold text-foreground">{p.title}</p>
                  <p className="text-muted-foreground">{p.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-sky-600" />
              </div>
            ))}
          </div>
          <Button onClick={() => toast.success('Settings updated')} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            Save Preferences
          </Button>
        </div>
      </div>
    )
  }

  // ──────────────────────── 12. DEFAULT: DASHBOARD VIEW (Matching Image 1) ────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Top Greeting Card matching Image 1 ── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-100/90 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-cyan-50/40 p-6 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-cyan-950/20 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Hi {session?.name?.split(' ')[0] || data.parent.name.split(' ')[0] || 'Rohan'}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s your child&apos;s progress at a glance — attendance, fees, academics & transport.
            </p>
          </div>

          {/* Child Switcher Dropdown matching Image 1 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 text-left shadow-2xs transition-all hover:bg-muted/60 self-start sm:self-center"
                aria-label="Select student"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                  {childInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground leading-tight">{childFullName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{className} • Section {sectionName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              {data.children.map((c: any) => {
                const cInitials = initials(c.name || 'Student')
                const isSelected = (c.student?.id || c.name) === (student.id || childFullName)
                return (
                  <DropdownMenuItem
                    key={c.student?.id || c.name}
                    onClick={() => setSelectedId(c.student?.id || '')}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                      {cInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{c.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{c.student?.className || 'Grade 8'} · Section {c.student?.sectionName || 'A'}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 ml-auto" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── 4 Stat Cards Grid matching Image 1 ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: ATTENDANCE */}
        <div className="rounded-2xl border bg-card p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ATTENDANCE</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{att.pct ?? 100}%</p>
          <p className="mt-2 text-xs text-muted-foreground">{att.present ?? 21} present / {att.total ?? 23} days</p>
        </div>

        {/* Card 2: PENDING FEES */}
        <div className="rounded-2xl border bg-card p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PENDING FEES</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{inr(child?.totalDue ?? 24800, true)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{outstanding.length || 1} open invoice{outstanding.length === 1 ? '' : 's'}</p>
        </div>

        {/* Card 3: NEXT DUE */}
        <div className="rounded-2xl border bg-card p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">NEXT DUE</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {child?.nextDue?.dueDate ? fmtDate(child.nextDue.dueDate) : '01 Nov 2026'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground truncate">
            {child?.nextDue ? `${child.nextDue.invoiceNo} • ${inr(child.nextDue.due, true)}` : 'INV-2025-00142 • ₹24,800'}
          </p>
        </div>

        {/* Card 4: LATEST GRADE */}
        <div className="rounded-2xl border bg-card p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">LATEST GRADE</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{rc?.grade || 'B+'}</p>
          <p className="mt-2 text-xs text-muted-foreground truncate">
            {rc ? `${rc.examName} • ${rc.percentage}%` : 'Term 1 Examination • 72%'}
          </p>
        </div>
      </div>

      {/* ── Two Large Cards Grid matching Image 1 ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Attendance — last 14 school days */}
        <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-foreground">Attendance — last 14 school days</h3>
            <p className="text-xs text-muted-foreground">Daily presence record (100 = present)</p>
          </div>
          <div className="pt-2">
            <AttendanceTrendChart daily={att.daily || []} />
          </div>
        </div>

        {/* Right Card: Recent Grades */}
        <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-foreground">Recent Grades</h3>
            <p className="text-xs text-muted-foreground">
              {rc ? `${rc.examName} • Rank ${rc.rank ?? '—'}` : 'Term 1 Examination • Rank —'}
            </p>
          </div>

          <ul className="space-y-4 pt-1">
            {(child?.subjectMarks && child.subjectMarks.length > 0 ? child.subjectMarks.slice(0, 5) : [
              { subject: 'English', marks: 55, maxMarks: 100, pct: 55, grade: 'C' },
              { subject: 'Hindi', marks: 92, maxMarks: 100, pct: 92, grade: 'A+' },
              { subject: 'Mathematics', marks: 47, maxMarks: 100, pct: 47, grade: 'D' },
              { subject: 'Physics', marks: 72, maxMarks: 100, pct: 72, grade: 'B+' },
              { subject: 'Chemistry', marks: 81, maxMarks: 100, pct: 81, grade: 'A' },
            ]).map((m: any, idx: number) => (
              <li key={idx} className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-xs font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                  {m.grade || '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground truncate">{m.subject}</span>
                    <span className="font-semibold tabular-nums text-foreground">{m.marks}/{m.maxMarks}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-sky-100 dark:bg-sky-950/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0284c7] transition-all duration-300"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PayDialog child={child} invoice={payInvoice} open={!!payInvoice} onOpenChange={o => !o && setPayInvoice(null)} onPaid={reload} />
      <LeaveDialog child={child} open={leaveOpen} onOpenChange={setLeaveOpen} />
    </div>
  )
}
