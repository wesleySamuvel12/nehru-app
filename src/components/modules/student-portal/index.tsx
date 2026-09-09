'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  PageHeader, StatCard, SectionCard, EmptyState, ErrorState, StatusBadge, CardGridSkeleton,
} from '@/components/erp/ui'
import { GaugeChart, TrendArea } from '@/components/erp/charts'
import { api } from '@/lib/api-client'
import { inr, fmtDate, fmtDateTime, timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import {
  CalendarCheck, BookOpen, GraduationCap, Library, Megaphone, CalendarDays, Printer,
  Send, Loader2, Clock, MapPin, CheckCircle2, PenLine, Trophy,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function BarcodeStrip() {
  return (
    <div
      aria-hidden
      className="h-7 w-full rounded-sm"
      style={{
        background: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 4px, currentColor 4px 5px, transparent 5px 9px, currentColor 9px 12px, transparent 12px 14px)',
      }}
    />
  )
}

function StudentIdCard({ profile }: { profile: any }) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-500 via-sky-700 to-[oklch(0.35_0.08_250)] p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-white/10" />
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nis-mark.png" alt="NIS" className="h-[80%] w-[88%] object-contain" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">Nehru International School</p>
          <p className="text-[10px] uppercase tracking-widest text-white/70">Student Identity Card · 2025-26</p>
        </div>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/30 bg-white/10 text-2xl font-bold">
          {profile.photoUrl
            ? <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
            : profile.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-tight">{profile.name}</p>
          <p className="text-xs text-white/80">{profile.className || '—'} {profile.sectionName ? `· Section ${profile.sectionName}` : ''}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="text-white/60">Admission No</span><span className="font-mono font-semibold">{profile.admissionNo || '—'}</span>
            <span className="text-white/60">Roll No</span><span className="font-semibold">{profile.rollNo || '—'}</span>
            <span className="text-white/60">House</span><span className="font-semibold">{profile.house || '—'}</span>
            <span className="text-white/60">Class Teacher</span><span className="truncate font-semibold">{profile.classTeacher || '—'}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 text-white/85">
        <BarcodeStrip />
        <p className="mt-1 text-center font-mono text-[10px] tracking-[0.3em]">{profile.barcode || profile.admissionNo || 'GRW-STU'}</p>
      </div>
    </div>
  )
}

function SubmitDialog({ hw, open, onOpenChange, onSaved }: {
  hw: any | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void
}) {
  const [text, setText] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) setText(hw?.submission?.contentText || '')
  }, [open, hw])

  const submit = async () => {
    if (text.trim().length < 10) { toast.error('Please write at least a couple of lines'); return }
    setSaving(true)
    try {
      await api('api/portal/student/submit', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: hw.id, contentText: text.trim() }),
      })
      toast.success(hw?.submission ? 'Submission updated' : 'Homework submitted', { description: hw?.title })
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit homework')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{hw?.title}</DialogTitle>
          <DialogDescription>
            {hw?.subject} · due {fmtDate(hw?.dueDate)} · max {hw?.maxMarks} marks
            {hw?.submission ? ` · submitted ${timeAgo(hw.submission.submittedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {hw?.description && <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{hw.description}</p>}
        {hw?.submission?.marks != null && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            Graded: <strong>{hw.submission.marks}/{hw.maxMarks}</strong> {hw.submission.grade && <Badge variant="outline" className="ml-1">{hw.submission.grade}</Badge>}
            {hw.submission.feedback && <p className="mt-1 text-xs text-muted-foreground">“{hw.submission.feedback}”</p>}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="hw-text">Your answer / notes</Label>
          <Textarea id="hw-text" rows={6} placeholder="Type or paste your homework response…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {hw?.submission ? 'Update submission' : 'Submit homework'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Leave request dialog (student self-service) ── */
function StudentLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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
      const body = { type, fromDate: from.toISOString(), toDate: to.toISOString(), reason: reason.trim() }
      try {
        await api('api/attendance/leave', { method: 'POST', body: JSON.stringify({ ...body, requesterType: 'STUDENT' }) })
      } catch {
        // Fallback to the portal route if the Attendance module endpoint is not live yet
        await api('api/portal/student/leave', { method: 'POST', body: JSON.stringify(body) })
      }
      toast.success('Leave request submitted', { description: 'Awaiting class teacher / principal approval.' })
      onOpenChange(false)
      setReason(''); setFrom(undefined); setTo(undefined)
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
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>Your class teacher will review and approve your request.</DialogDescription>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-start px-3 text-xs font-normal">
                      {from ? from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Pick'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={from} onSelect={(d) => setFrom(d)} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-start px-3 text-xs font-normal" disabled={!from}>
                      {to ? to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Pick'}
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
            <Label htmlFor="slv-reason">Reason</Label>
            <Textarea id="slv-reason" rows={3} placeholder="e.g. Not feeling well, will rest at home…" value={reason} onChange={(e) => setReason(e.target.value)} />
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

export default function StudentPortalModule() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [submitHw, setSubmitHw] = React.useState<any | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api('api/portal/student')
      setData(res)
    } catch (e: any) {
      setError(e?.message || 'Unable to load your space right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40 w-full max-w-md rounded-2xl" />
        <CardGridSkeleton count={4} />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data?.profile) {
    return <EmptyState title="Student profile not found" description="Your login is not linked to a student record. Please contact the school office." />
  }

  const p = data.profile
  const att = data.attendance || {}
  const pendingHw: any[] = (data.homework || []).filter((h: any) => !h.submission)
  const books: any[] = data.library || []

  const periods = data.periods || []
  const grid: Record<number, Record<number, any>> = {}
  for (const slot of data.timetable || []) {
    grid[slot.dayOfWeek] = grid[slot.dayOfWeek] || {}
    grid[slot.dayOfWeek][slot.period] = slot
  }
  const daysWithSlots = [1, 2, 3, 4, 5, 6].filter(d => Object.keys(grid[d] || {}).length > 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hi ${p.name?.split(' ')[0] || 'there'}!`}
        subtitle="Your timetable, homework, grades and library — all in one place."
        actions={
          <Button size="sm" className="h-9" onClick={() => setLeaveOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Request leave
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <StudentIdCard profile={p} />
        <div className="grid content-start grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Attendance" value={`${att.pct ?? 0}%`} tone={(att.pct ?? 0) >= 90 ? 'success' : 'warning'} icon={<CalendarCheck className="h-5 w-5" />} hint={`${att.present ?? 0}/${att.total ?? 0} days present`} />
          <StatCard label="Pending Homework" value={pendingHw.length} tone={pendingHw.length ? 'warning' : 'success'} icon={<BookOpen className="h-5 w-5" />} hint={pendingHw.length ? 'Submit before the due date' : 'All submitted!'} />
          <StatCard label="Next Exam" value={data.kpis?.nextExam ? data.kpis.nextExam.name : '—'} tone="info" icon={<GraduationCap className="h-5 w-5" />} hint={data.kpis?.nextExam ? fmtDate(data.kpis.nextExam.date) : 'No exams scheduled'} />
          <StatCard label="Books Issued" value={books.length} icon={<Library className="h-5 w-5" />} hint={books.length ? `${books.filter((b: any) => b.status === 'OVERDUE').length} overdue` : 'Nothing borrowed'} />
        </div>
      </div>

      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="timetable">My Timetable</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="notices">Notices & Events</TabsTrigger>
        </TabsList>

        {/* ── TIMETABLE ── */}
        <TabsContent value="timetable">
          <SectionCard
            title="Weekly timetable"
            description={`${p.className || ''} ${p.sectionName ? `· Section ${p.sectionName}` : ''}`}
            contentClassName="p-0 sm:p-5"
          >
            {daysWithSlots.length ? (
              <div className="overflow-x-auto pb-1">
                <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-semibold text-muted-foreground">Period</th>
                      {daysWithSlots.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-muted-foreground">{DAY_SHORT[d]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((per: any) => (
                      <tr key={per.period}>
                        <td className="sticky left-0 z-10 rounded-md bg-muted/60 px-2 py-2 align-top">
                          <p className="font-semibold">{per.period}</p>
                          <p className="text-[10px] text-muted-foreground">{per.startTime}</p>
                        </td>
                        {daysWithSlots.map(d => {
                          const slot = grid[d]?.[per.period]
                          return (
                            <td key={d} className="rounded-md border px-2 py-2 align-top">
                              {slot ? (
                                <div>
                                  <p className="font-medium leading-tight">{slot.subject}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">{slot.teacher || ''}</p>
                                  {slot.room && <Badge variant="outline" className="mt-1 px-1 py-0 text-[9px]">{slot.room}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="Timetable not published" description="Your class timetable will appear here once the school publishes it." icon={<CalendarDays className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── HOMEWORK ── */}
        <TabsContent value="homework" className="grid gap-3 md:grid-cols-2">
          {(data.homework || []).length === 0 && (
            <div className="md:col-span-2"><EmptyState title="No homework" description="Nothing assigned for your class right now. Enjoy the break!" icon={<CheckCircle2 className="h-7 w-7" />} /></div>
          )}
          {(data.homework || []).map((h: any) => (
            <div key={h.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.subject} · {h.teacherName || 'Teacher'}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] ${h.submitted ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : h.daysLeft <= 1 ? 'border-rose-500/30 text-rose-600' : 'border-amber-500/30 text-amber-600'}`}>
                  {h.submitted ? (h.submission.marks != null ? `Graded ${h.submission.marks}/${h.maxMarks}` : 'Submitted') : h.daysLeft <= 0 ? 'Due today' : `${h.daysLeft}d left`}
                </Badge>
              </div>
              {h.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Due {fmtDate(h.dueDate)}</span>
                <Button size="sm" variant={h.submitted ? 'outline' : 'default'} className="h-8" onClick={() => setSubmitHw(h)}>
                  <PenLine className="mr-1.5 h-3.5 w-3.5" /> {h.submitted ? 'View / Edit' : 'Submit'}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── GRADES ── */}
        <TabsContent value="grades" className="space-y-4">
          {(data.examResults?.reportCards || []).length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.examResults.reportCards.map((rc: any, i: number) => (
                <div key={i} className="rounded-xl border bg-card p-4 text-center shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rc.examName}</p>
                  <p className="mt-1 text-3xl font-bold">{rc.percentage}%</p>
                  <div className="mt-1 flex justify-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Grade {rc.grade}</Badge>
                    {rc.rank && <Badge variant="outline"><Trophy className="mr-1 h-3 w-3" /> Rank {rc.rank}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{rc.obtained} / {rc.totalMarks} marks</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No results yet" description="Your report card appears after the school publishes exam results." icon={<GraduationCap className="h-7 w-7" />} />}
          {data.examResults?.subjectMarks?.length ? (
            <SectionCard
              title="Subject-wise performance" description={data.examResults.reportCards[0]?.examName || 'Latest published exam'}
              actions={<Button variant="outline" size="sm" className="h-8" onClick={() => window.print()}><Printer className="mr-1.5 h-3.5 w-3.5" /> Print</Button>}
              contentClassName="p-0"
            >
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
                    {data.examResults.subjectMarks.map((m: any, i: number) => (
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
            </SectionCard>
          ) : null}
        </TabsContent>

        {/* ── ATTENDANCE ── */}
        <TabsContent value="attendance" className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Attendance health">
            <div className="py-2">
              <GaugeChart value={att.pct ?? 0} label="This term" height={180} color={(att.pct ?? 0) >= 90 ? '#10b981' : '#f59e0b'} />
              <div className="grid grid-cols-3 border-t pt-3 text-center text-sm">
                <div><p className="font-bold text-emerald-600 dark:text-emerald-400">{att.present ?? 0}</p><p className="text-xs text-muted-foreground">Present</p></div>
                <div><p className="font-bold text-rose-600 dark:text-rose-400">{att.absent ?? 0}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                <div><p className="font-bold text-amber-600 dark:text-amber-400">{(att.late || 0) + (att.halfDay || 0)}</p><p className="text-xs text-muted-foreground">Late/Half</p></div>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Trend" description="Daily presence score (last 14 school days)">
            {att.daily?.length ? (
              <TrendArea data={att.daily.slice(-14).map((d: any) => ({ date: d.date.slice(5), pct: d.pct }))} xKey="date" yKey="pct" height={240} color="#10b981" yFormatter={(v) => `${v}%`} />
            ) : <EmptyState title="No data" />}
          </SectionCard>
          <SectionCard title="Recent days" contentClassName="p-0">
            {att.log?.length ? (
              <ul className="max-h-80 divide-y overflow-y-auto">
                {att.log.slice(0, 15).map((d: any, i: number) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{fmtDate(d.date)}</span>
                    <StatusBadge value={d.status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No attendance yet" />}
          </SectionCard>
        </TabsContent>

        {/* ── LIBRARY ── */}
        <TabsContent value="library">
          <SectionCard title="My borrowed books" description="Return or renew before the due date to avoid fines" contentClassName="p-0">
            {books.length ? (
              <ul className="divide-y">
                {books.map((b: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Library className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {fmtDate(b.issueDate)} · Due <span className={b.status === 'OVERDUE' ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{fmtDate(b.dueDate)}</span>
                        {b.fine > 0 ? ` · Fine ${inr(b.fine)}` : ''}
                      </p>
                    </div>
                    <StatusBadge value={b.status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No books issued" description="Visit the library and start your next read!" icon={<Library className="h-7 w-7" />} />}
          </SectionCard>
        </TabsContent>

        {/* ── NOTICES & EVENTS ── */}
        <TabsContent value="notices" className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Megaphone className="h-4 w-4" /> Notices</h3>
            {data.announcements?.length ? data.announcements.map((a: any) => (
              <div key={a.id} className={`rounded-xl border p-4 shadow-sm ${a.priority === 'URGENT' ? 'border-rose-500/40 bg-rose-500/5' : 'bg-card'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(a.publishedAt)}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{a.body}</p>
              </div>
            )) : <EmptyState title="No notices" icon={<Megaphone className="h-7 w-7" />} />}
          </div>
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" /> Upcoming events</h3>
            {data.events?.length ? data.events.map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-lg font-bold leading-none">{new Date(ev.startDate).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(ev.startDate).toLocaleString('en-IN', { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ev.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {ev.location || 'School campus'} · {fmtDateTime(ev.startDate)}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{ev.type}</Badge>
              </div>
            )) : <EmptyState title="No upcoming events" icon={<CalendarDays className="h-7 w-7" />} />}
          </div>
        </TabsContent>
      </Tabs>

      <SubmitDialog hw={submitHw} open={!!submitHw} onOpenChange={(o) => !o && setSubmitHw(null)} onSaved={load} />
      <StudentLeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} />
    </div>
  )
}
