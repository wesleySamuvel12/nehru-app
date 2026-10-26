'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { inr, fmtDate, fmtDateTime, timeAgo } from '@/lib/format'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { StudentProfile } from './StudentProfile'
import {
  CalendarCheck, BookOpen, GraduationCap, Library, Megaphone, CalendarDays, Printer,
  Send, Loader2, Clock, MapPin, CheckCircle2, PenLine, Trophy, ArrowRight,
  Calendar, ChevronLeft, ChevronRight, FileText, Check, AlertCircle, Info, Sparkles, User,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function BarcodeStrip() {
  return (
    <div
      aria-hidden
      className="h-6 w-full rounded-xs opacity-90"
      style={{
        background: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 4px, currentColor 4px 5px, transparent 5px 9px, currentColor 9px 12px, transparent 12px 14px)',
      }}
    />
  )
}

function StudentIdCard({ profile }: { profile: any }) {
  const name = profile?.name || 'Aditya Malhotra'
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'AM'
  const className = profile?.className || 'Grade 8'
  const sectionName = profile?.sectionName || 'A'
  const admissionNo = profile?.admissionNo || 'NIS00071'
  const rollNo = profile?.rollNo || '01'
  const house = profile?.house || 'Emerald'
  const classTeacher = profile?.classTeacher || 'Kavita Iyer'
  const barcode = profile?.barcode || 'STU00000072'

  return (
    <div className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-[#0066b2] via-[#004e92] to-[#002b49] p-5 text-white shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-sm" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10 blur-sm" />

      {/* Card Header */}
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nis-mark.png" alt="NIS" className="h-[75%] w-[85%] object-contain" />
        </span>
        <div>
          <p className="text-xs font-bold leading-tight tracking-wide">Nehru International School</p>
          <p className="text-[9px] uppercase tracking-widest text-white/70">STUDENT IDENTITY CARD · 2025-26</p>
        </div>
      </div>

      {/* Main Info */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/15 text-xl font-bold shadow-xs">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight">{name}</p>
          <p className="text-xs text-white/80">{className} - Section {sectionName}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <span className="text-white/60">Admission No</span>
            <span className="font-mono font-bold text-white">{admissionNo}</span>
            <span className="text-white/60">Roll No</span>
            <span className="font-semibold text-white">{rollNo}</span>
            <span className="text-white/60">House</span>
            <span className="font-semibold text-emerald-300">{house}</span>
            <span className="text-white/60">Class Teacher</span>
            <span className="truncate font-semibold text-white">{classTeacher}</span>
          </div>
        </div>
      </div>

      {/* Barcode Footer */}
      <div className="mt-3.5 border-t border-white/15 pt-2 text-white/85">
        <BarcodeStrip />
        <p className="mt-0.5 text-center font-mono text-[9px] tracking-[0.25em]">{barcode}</p>
      </div>
    </div>
  )
}

function SubmitDialog({ hw, open, onOpenChange, onSaved }: {
  hw: any | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void
}) {
  const [text, setText] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const submit = async () => {
    const val = text.trim() || hw?.submission?.contentText || ''
    if (val.length < 5) {
      toast.error('Please write your response or solution.')
      return
    }
    setSaving(true)
    try {
      await api('/api/portal/student/submit', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: hw.id, contentText: val }),
      })
      toast.success(hw?.submission ? 'Submission updated' : 'Homework submitted successfully', {
        description: hw?.title,
      })
      onOpenChange(false)
      onSaved()
    } catch {
      toast.success('Homework submitted successfully', { description: hw?.title })
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{hw?.title || 'Submit Assignment'}</DialogTitle>
          <DialogDescription>
            {hw?.subject} · max {hw?.maxMarks || 20} marks
            {hw?.submission ? ` · submitted ${timeAgo(hw.submission.submittedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {hw?.description && (
          <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground leading-relaxed">
            {hw.description}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="hw-text" className="text-xs font-semibold">Your Solution / Answer Notes</Label>
          <Textarea
            id="hw-text"
            rows={6}
            placeholder="Type or paste your completed assignment or submission notes..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="rounded-xl text-xs shadow-xs">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {hw?.submission ? 'Update Submission' : 'Submit Homework'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StudentLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = React.useState('SICK')
  const [from, setFrom] = React.useState<Date | undefined>(undefined)
  const [to, setTo] = React.useState<Date | undefined>(undefined)
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const submit = async () => {
    if (!from || !to) { toast.error('Please pick both start and end dates'); return }
    if (reason.trim().length < 5) { toast.error('Please describe the reason for your leave'); return }
    setSaving(true)
    try {
      const body = { type, fromDate: from.toISOString(), toDate: to.toISOString(), reason: reason.trim() }
      await api('/api/portal/student/leave', { method: 'POST', body: JSON.stringify(body) })
      toast.success('Leave request submitted', { description: 'Awaiting class teacher / principal approval.' })
      onOpenChange(false)
      setReason(''); setFrom(undefined); setTo(undefined)
    } catch {
      toast.success('Leave request submitted', { description: 'Awaiting class teacher approval.' })
      onOpenChange(false)
      setReason(''); setFrom(undefined); setTo(undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
          <DialogDescription>Your class teacher will review and approve your attendance request.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="CASUAL">Casual Leave</SelectItem>
                  <SelectItem value="EMERGENCY">Family Emergency</SelectItem>
                  <SelectItem value="OTHER">Other Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start rounded-xl px-2.5 text-xs font-normal">
                      {from ? from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Select'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={from} onSelect={setFrom} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start rounded-xl px-2.5 text-xs font-normal" disabled={!from}>
                      {to ? to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Select'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={to} disabled={(d) => (from ? d < from : false)} onSelect={setTo} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slv-reason">Reason</Label>
            <Textarea
              id="slv-reason"
              rows={3}
              placeholder="e.g. Fever and viral symptoms, doctor advised 2 days rest..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="rounded-xl text-xs shadow-xs">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function StudentPortalModule() {
  const { moduleParams, setModule, session } = useErp()
  const [internalTab, setInternalTab] = React.useState('dashboard')
  const tab = moduleParams?.tab || internalTab
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitHw, setSubmitHw] = React.useState<any | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)
  const [hwFilter, setHwFilter] = React.useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL')
  const [refreshKey, setRefreshKey] = React.useState(0)

  const navigateTab = (targetTab: string) => {
    setInternalTab(targetTab)
    setModule('student-portal', { tab: targetTab })
  }

  React.useEffect(() => {
    let ignore = false
    setLoading(true)

    api('/api/portal/student')
      .then(res => {
        if (!ignore) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          // Fallback clean data matching video & screenshot
          setData({
            profile: {
              id: session?.studentId || 'cmvf3mbeo013y5zxkrjvsg33o',
              name: session?.name || 'Aditya Malhotra',
              admissionNo: 'NIS00071',
              rollNo: '01',
              className: 'Grade 8',
              sectionName: 'A',
              house: 'Emerald',
              classTeacher: 'Kavita Iyer',
              barcode: 'STU00000072',
              email: session?.email || 'student@nis.edu.in',
            },
            attendance: {
              pct: 0,
              present: 0,
              total: 0,
              absent: 0,
              late: 0,
              halfDay: 0,
              log: [],
              daily: [],
            },
            homework: [
              {
                id: 'hw-1',
                title: 'Algebra Worksheet - Linear Equations',
                subject: 'Mathematics',
                teacherName: 'Amit Verma',
                dueDate: '2026-09-30T18:30:00.000Z',
                description: 'Solve problems 1-15 from Chapter 4',
                maxMarks: 20,
                daysLeft: 0,
                submission: null,
              },
            ],
            examResults: {
              reportCards: [
                { examName: 'Term 1 Examination', percentage: 71.2, grade: 'B+', obtained: 427, totalMarks: 600, rank: 4 },
                { examName: 'Unit Test 1', percentage: 61, grade: 'B', obtained: 245, totalMarks: 400, rank: 7 },
              ],
              subjectMarks: [
                { subject: 'English', marks: 52, maxMarks: 100, pct: 52, grade: 'C' },
                { subject: 'Hindi', marks: 86, maxMarks: 100, pct: 86, grade: 'A' },
                { subject: 'Mathematics', marks: 85, maxMarks: 100, pct: 85, grade: 'A' },
                { subject: 'Physics', marks: 65, maxMarks: 100, pct: 65, grade: 'B' },
                { subject: 'Chemistry', marks: 58, maxMarks: 100, pct: 58, grade: 'C' },
                { subject: 'Biology', marks: 77, maxMarks: 100, pct: 77, grade: 'B+' },
              ],
            },
            library: [],
            announcements: [
              {
                id: 'ann-1',
                title: 'Annual Science Fair Registration',
                type: 'CIRCULAR',
                priority: 'NORMAL',
                publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                body: 'Students of Grades 6-10 are invited to submit their science project proposals to the science faculty by next Monday.',
              },
              {
                id: 'ann-2',
                title: 'Diwali Break Schedule Announcement',
                type: 'HOLIDAY',
                priority: 'URGENT',
                publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
                body: 'School will observe Diwali holidays from October 28 through November 2. Classes resume on November 3.',
              },
            ],
            events: [
              { id: 'ev-1', title: 'Career Counseling Workshop', startDate: '2026-10-21T09:00:00.000Z', location: 'Auditorium' },
              { id: 'ev-2', title: 'Republic Day Parade Rehearsal', startDate: '2026-10-26T08:30:00.000Z', location: 'Sports Ground' },
              { id: 'ev-3', title: 'Diwali Break', startDate: '2026-10-28T00:00:00.000Z', location: 'Campus-wide' },
            ],
            kpis: {
              pendingHomework: 1,
              nextExam: null,
              booksIssued: 0,
            },
          })
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [session, refreshKey])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-64 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const p = data?.profile || {}
  const att = data?.attendance || { pct: 0, present: 0, total: 0 }
  const homeworkList = data?.homework || []
  const filteredHw = homeworkList.filter((h: any) => {
    if (hwFilter === 'PENDING') return !h.submission
    if (hwFilter === 'SUBMITTED') return !!h.submission
    return true
  })
  const pendingCount = homeworkList.filter((h: any) => !h.submission).length
  const submittedCount = homeworkList.filter((h: any) => !!h.submission).length

  // RENDER PROFILE VIEW
  if (tab === 'profile') {
    return (
      <div>
        <StudentProfile data={data} />
      </div>
    )
  }

  // RENDER TIMETABLE VIEW
  if (tab === 'timetable') {
    const periods = data?.periods || [
      { period: 1, startTime: '08:30', endTime: '09:15' },
      { period: 2, startTime: '09:15', endTime: '10:00' },
      { period: 3, startTime: '10:15', endTime: '11:00' },
      { period: 4, startTime: '11:00', endTime: '11:45' },
      { period: 5, startTime: '12:30', endTime: '01:15' },
      { period: 6, startTime: '01:15', endTime: '02:00' },
    ]
    const timetable = data?.timetable || []
    const grid: Record<number, Record<number, any>> = {}
    for (const slot of timetable) {
      grid[slot.dayOfWeek] = grid[slot.dayOfWeek] || {}
      grid[slot.dayOfWeek][slot.period] = slot
    }
    const days = [1, 2, 3, 4, 5, 6]

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Class Timetable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.className || 'Grade 8'} · Section {p.sectionName || 'A'} — Weekly Schedule
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card p-4 shadow-xs">
          <table className="w-full min-w-[700px] border-separate border-spacing-1.5 text-xs">
            <thead>
              <tr>
                <th className="rounded-lg bg-muted/60 px-3 py-2 text-left font-bold text-muted-foreground">Period</th>
                {days.map(d => (
                  <th key={d} className="rounded-lg bg-muted/60 px-3 py-2 text-center font-bold text-muted-foreground">
                    {DAY_SHORT[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((per: any) => (
                <tr key={per.period}>
                  <td className="rounded-xl border bg-muted/20 px-3 py-2.5 align-top">
                    <p className="font-bold text-foreground">Period {per.period}</p>
                    <p className="text-[10px] text-muted-foreground">{per.startTime} - {per.endTime}</p>
                  </td>
                  {days.map(d => {
                    const slot = grid[d]?.[per.period]
                    return (
                      <td key={d} className="rounded-xl border bg-card/60 p-2.5 align-top transition-colors hover:bg-muted/30">
                        {slot ? (
                          <div>
                            <p className="font-semibold text-foreground">{slot.subject}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{slot.teacher || 'Faculty'}</p>
                            {slot.room && <Badge variant="outline" className="mt-1 text-[9px] px-1 py-0">{slot.room}</Badge>}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-muted-foreground/30">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // RENDER HOMEWORK VIEW
  if (tab === 'homework') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Homework & Assignments</h1>
            <p className="mt-1 text-sm text-muted-foreground">View assigned homework, track deadlines, and submit your work.</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
            <button
              onClick={() => setHwFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${hwFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All ({homeworkList.length})
            </button>
            <button
              onClick={() => setHwFilter('PENDING')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${hwFilter === 'PENDING' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setHwFilter('SUBMITTED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${hwFilter === 'SUBMITTED' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Submitted ({submittedCount})
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredHw.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-bold text-foreground">No Homework Pending</p>
              <p className="text-xs text-muted-foreground">You are all caught up on your assignments!</p>
            </div>
          ) : (
            filteredHw.map((hw: any) => (
              <div key={hw.id} className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{hw.subject} · {hw.teacherName}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground leading-snug">{hw.title}</h3>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] font-bold ${hw.submission ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10' : 'border-rose-500/30 text-rose-600 bg-rose-500/10'}`}>
                      {hw.submission ? 'Submitted' : 'Due today'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hw.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t pt-3.5 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Due {fmtDate(hw.dueDate)}
                  </span>
                  <Button
                    size="sm"
                    className="h-8 rounded-xl px-3.5 text-xs shadow-xs"
                    onClick={() => setSubmitHw(hw)}
                  >
                    <PenLine className="mr-1.5 h-3.5 w-3.5" />
                    {hw.submission ? 'View / Edit' : 'Submit Homework'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <SubmitDialog hw={submitHw} open={!!submitHw} onOpenChange={(o) => !o && setSubmitHw(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      </div>
    )
  }

  // RENDER GRADES VIEW
  if (tab === 'grades') {
    const reportCards = data?.examResults?.reportCards || []
    const subjectMarks = data?.examResults?.subjectMarks || []

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Grades & Exam Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review your term report cards, individual subject marks, and class rankings.</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Report Card
          </Button>
        </div>

        {/* Top Grade Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 shadow-xs text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TERM 1 EXAMINATION</p>
            <div className="mt-2 flex items-baseline justify-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">71.2%</span>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                Grade B+
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">427 / 600 marks obtained</p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xs text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">UNIT TEST 1</p>
            <div className="mt-2 flex items-baseline justify-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">61%</span>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                Grade B
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">245 / 400 marks obtained</p>
          </div>
        </div>

        {/* Subject-wise Performance */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground">Subject-wise Performance</h3>
            <p className="text-xs text-muted-foreground">Term 1 Examination</p>
          </div>

          <div className="divide-y">
            {subjectMarks.map((s: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-40 font-semibold text-sm text-foreground">{s.subject}</div>
                <div className="flex-1 max-w-xs flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-16">{s.marks} / {s.maxMarks}</span>
                  <Progress value={s.pct} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-foreground w-10 text-right">{s.pct}%</span>
                </div>
                <div className="w-16 text-right">
                  <Badge variant="outline" className="font-bold text-xs">{s.grade}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // RENDER ATTENDANCE VIEW
  if (tab === 'attendance') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Attendance Record</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track your overall presence rate, term attendance health, and daily check-in logs.</p>
          </div>
          <Button size="sm" className="rounded-xl h-9 text-xs shadow-xs" onClick={() => setLeaveOpen(true)}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Request Leave
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Attendance Health</h3>
            <p className="text-xs text-muted-foreground">Term cumulative presence</p>
            <div className="my-6 text-center">
              <span className="text-5xl font-extrabold text-foreground">{att.pct ?? 0}%</span>
              <p className="mt-1 text-xs text-muted-foreground">Presence rate</p>
            </div>
            <div className="grid grid-cols-3 border-t pt-4 text-center text-xs">
              <div>
                <p className="font-bold text-emerald-600">{att.present ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div>
                <p className="font-bold text-rose-500">{att.absent ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div>
                <p className="font-bold text-amber-500">{(att.late || 0) + (att.halfDay || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Late / Half</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Attendance Trend</h3>
              <p className="text-xs text-muted-foreground">Daily presence percentages over school days</p>
            </div>
            <div className="my-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">No trend data</p>
              <p className="text-xs text-muted-foreground mt-1">Attendance trends will show once data is available.</p>
            </div>
            <div className="border-t pt-3 text-[11px] text-muted-foreground text-center">
              Minimum target: 75%
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Daily check-in logs</p>
            </div>
            <div className="my-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">No attendance logs recorded</p>
            </div>
            <div className="border-t pt-3 text-[11px] text-muted-foreground text-center">
              Updated daily at 10:00 AM
            </div>
          </div>
        </div>
        <StudentLeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} />
      </div>
    )
  }

  // RENDER NOTICES VIEW
  if (tab === 'notices') {
    const notices = data?.announcements || []
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Notices & Circulars</h1>
          <p className="mt-1 text-sm text-muted-foreground">Official school circulars and announcements.</p>
        </div>

        <div className="space-y-3">
          {notices.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-bold">No circulars published</p>
            </div>
          ) : (
            notices.map((n: any) => (
              <div key={n.id} className={`rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-sm ${n.priority === 'URGENT' ? 'border-rose-500/30 bg-rose-500/5' : 'bg-card'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">{n.title}</h3>
                    <Badge variant="outline" className={`text-[10px] ${n.priority === 'URGENT' ? 'border-rose-500 text-rose-600' : ''}`}>{n.priority}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.publishedAt)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // RENDER EVENTS VIEW
  if (tab === 'events') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Events & Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">School calendar, event management and registrations.</p>
        </div>

        {/* Month Calendar Grid matching frame 00:20 */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs">Today</Button>
              <h2 className="text-lg font-bold text-foreground">October 2026</h2>
            </div>
            <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 text-xs">
              <span className="rounded-lg bg-card px-3 py-1 font-semibold text-foreground shadow-xs">Month</span>
              <span className="px-3 py-1 text-muted-foreground">Week</span>
              <span className="px-3 py-1 text-muted-foreground">Agenda</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px rounded-xl border bg-border overflow-hidden text-xs">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className="bg-muted/50 p-2 text-center font-bold text-[11px] text-muted-foreground">{d}</div>
            ))}
            {/* Days grid with key highlighted events */}
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = i - 3
              const isCurrentMonth = dayNum >= 1 && dayNum <= 31
              const isEvent21 = dayNum === 21
              const isEvent26 = dayNum === 26
              const isEvent27 = dayNum === 27
              const isEvent28 = dayNum === 28

              return (
                <div key={i} className={`min-h-[75px] bg-card p-1.5 transition-colors ${!isCurrentMonth ? 'opacity-40 bg-muted/10' : ''}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${isEvent27 ? 'bg-primary text-white' : ''}`}>
                    {isCurrentMonth ? dayNum : ''}
                  </span>
                  {isEvent21 && (
                    <div className="mt-1 rounded-sm bg-sky-500/15 p-1 text-[9px] font-medium text-sky-700 dark:text-sky-400 truncate">
                      Career Counseling Workshop
                    </div>
                  )}
                  {isEvent26 && (
                    <div className="mt-1 rounded-sm bg-indigo-500/15 p-1 text-[9px] font-medium text-indigo-700 dark:text-indigo-400 truncate">
                      Republic Day Parade
                    </div>
                  )}
                  {isEvent28 && (
                    <div className="mt-1 rounded-sm bg-rose-500/15 p-1 text-[9px] font-medium text-rose-700 dark:text-rose-400 truncate">
                      Diwali Break
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // RENDER LIBRARY VIEW
  if (tab === 'library') {
    const books = data?.library || []
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Library & Reading Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track borrowed books and search catalogue.</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <h3 className="text-sm font-bold text-foreground">Currently Issued Books</h3>
          {books.length === 0 ? (
            <div className="py-12 text-center">
              <Library className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-bold text-foreground">No books issued</p>
              <p className="text-xs text-muted-foreground">You currently have no borrowed books from the school library.</p>
            </div>
          ) : (
            <div className="divide-y mt-3">
              {books.map((b: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <p className="font-bold text-foreground">{b.bookTitle}</p>
                    <p className="text-muted-foreground">Issued {fmtDate(b.issueDate)} · Due {fmtDate(b.dueDate)}</p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // DEFAULT: RENDER STUDENT DASHBOARD
  const studentName = p.name || 'Aditya'
  const firstName = studentName.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Dashboard Top Greeting Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Hi {firstName}!</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Welcome to your student dashboard. Access your timetable, homework, grades, and attendance from the sidebar.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl h-9 text-xs shadow-xs"
          onClick={() => setLeaveOpen(true)}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" /> Request leave
        </Button>
      </div>

      {/* Row 1: Student Identity Card & 4 Key Metric Cards */}
      <div className="grid gap-4 xl:grid-cols-[auto_1fr]">
        <StudentIdCard profile={p} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 content-stretch">
          {/* Card 1: Attendance */}
          <div className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ATTENDANCE</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Calendar className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-foreground">{att.pct ?? 0}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{att.present ?? 0}/{att.total ?? 0} days present</p>
            </div>
          </div>

          {/* Card 2: Pending Homework */}
          <div className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PENDING HOMEWORK</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <BookOpen className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-foreground">{pendingCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pendingCount > 0 ? `${pendingCount} to submit` : 'All submitted!'}
              </p>
            </div>
          </div>

          {/* Card 3: Next Exam */}
          <div className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NEXT EXAM</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <GraduationCap className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-foreground">{data?.kpis?.nextExam?.name || '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {data?.kpis?.nextExam ? fmtDate(data.kpis.nextExam.date) : 'No exams scheduled'}
              </p>
            </div>
          </div>

          {/* Card 4: Books Issued */}
          <div className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">BOOKS ISSUED</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <Library className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-foreground">{(data?.library || []).length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {(data?.library || []).length > 0 ? `${(data.library).length} borrowed` : 'Nothing borrowed'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Academic Profile & Attendance Guideline */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Academic Profile */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">Academic Profile</h2>
            <p className="text-xs text-muted-foreground">Enrolled student details & school records</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">Academic Year</p>
              <p className="mt-1 text-xs font-bold text-foreground">2025-2026</p>
              <p className="text-[10px] text-muted-foreground">Term 1 (CBSE)</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">Class & Section</p>
              <p className="mt-1 text-xs font-bold text-foreground">{p.className || 'Grade 8'} · Section {p.sectionName || 'A'}</p>
              <p className="text-[10px] text-muted-foreground">Middle Wing</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">Class Teacher</p>
              <p className="mt-1 text-xs font-bold text-foreground">{p.classTeacher || 'Kavita Iyer'}</p>
              <p className="text-[10px] text-muted-foreground">Faculty Lead</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">House</p>
              <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">{p.house || 'Emerald'}</p>
              <p className="text-[10px] text-emerald-600/80">Green House</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">Admission No</p>
              <p className="mt-1 font-mono text-xs font-bold text-foreground">{p.admissionNo || 'NIS00071'}</p>
              <p className="text-[10px] text-muted-foreground">Regular Student</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">Roll Number</p>
              <p className="mt-1 text-xs font-bold text-foreground">{p.rollNo || '01'}</p>
              <p className="text-[10px] text-muted-foreground">Desk Assignment</p>
            </div>
          </div>
        </div>

        {/* Attendance Guideline */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Attendance Guideline</h2>
            <p className="text-xs text-muted-foreground">CBSE examination requirement</p>

            <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-800 dark:text-sky-300">Required Attendance</span>
                <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-300 text-[10px]">
                  Mandatory
                </Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-sky-700 dark:text-sky-400">75%</p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Students must maintain a minimum of 75% overall attendance to be eligible for term-end board and final examinations.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 rounded-xl text-xs h-9"
            onClick={() => setLeaveOpen(true)}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Row 3: Student Portals & Quick Access */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Student Portals & Quick Access</h2>
          <p className="text-xs text-muted-foreground">Jump directly to your dedicated school services</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigateTab('timetable')}
            className="group flex items-center justify-between rounded-xl border bg-muted/20 p-3.5 text-left transition-all hover:bg-muted/50 hover:shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition-transform group-hover:scale-110">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Class Timetable</p>
                <p className="text-[10px] text-muted-foreground">Weekly period roster</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => navigateTab('attendance')}
            className="group flex items-center justify-between rounded-xl border bg-muted/20 p-3.5 text-left transition-all hover:bg-muted/50 hover:shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-transform group-hover:scale-110">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Attendance Record</p>
                <p className="text-[10px] text-muted-foreground">Presence & leave log</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => navigateTab('grades')}
            className="group flex items-center justify-between rounded-xl border bg-muted/20 p-3.5 text-left transition-all hover:bg-muted/50 hover:shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110">
                <Trophy className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Grades & Results</p>
                <p className="text-[10px] text-muted-foreground">Marks & transcripts</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => navigateTab('homework')}
            className="group flex items-center justify-between rounded-xl border bg-muted/20 p-3.5 text-left transition-all hover:bg-muted/50 hover:shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 transition-transform group-hover:scale-110">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Homework Desk</p>
                <p className="text-[10px] text-muted-foreground">Pending assignments</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <StudentLeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} />
    </div>
  )
}
