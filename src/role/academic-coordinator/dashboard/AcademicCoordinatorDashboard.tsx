'use client'

import * as React from 'react'
import { useErp } from '@/lib/store'
import { api, list, updateOne, ApiError } from '@/lib/api-client'
import { inr, fmtDate, fmtTime, titleCase, timeAgo } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  BookOpen, Users, CalendarCheck, CheckCircle2, XCircle, RotateCcw,
  Clock, AlertCircle, Sparkles, Filter, ChevronRight, GraduationCap,
  CalendarDays, FileText, Check, Search, Eye, ArrowRight, RefreshCw,
  ClipboardList, Bell, Layers, ShieldCheck
} from 'lucide-react'

interface LeaveRequestItem {
  id: string
  requesterName: string
  requesterType: string
  type: string
  category: string
  fromDate: string
  toDate: string
  reason: string
  status: string
  currentApproverRole?: string
  substituteName?: string
  createdAt: string
  stepsJson?: string
  historyJson?: string
}

interface ClassItem {
  id: string
  name: string
  level: number
  sections?: { id: string; name: string; teacherId?: string; room?: string }[]
}

interface ExamItem {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  status: string
  term?: { name: string }
}

export default function AcademicCoordinatorDashboard() {
  const { session, setModule } = useErp()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [loading, setLoading] = React.useState(true)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Data states
  const [classes, setClasses] = React.useState<ClassItem[]>([])
  const [teachers, setTeachers] = React.useState<any[]>([])
  const [pendingLeaves, setPendingLeaves] = React.useState<LeaveRequestItem[]>([])
  const [allLeaves, setAllLeaves] = React.useState<LeaveRequestItem[]>([])
  const [exams, setExams] = React.useState<ExamItem[]>([])
  const [timetables, setTimetables] = React.useState<any[]>([])
  const [events, setEvents] = React.useState<any[]>([])

  // Action Dialog state
  const [actionModalOpen, setActionModalOpen] = React.useState(false)
  const [selectedLeave, setSelectedLeave] = React.useState<LeaveRequestItem | null>(null)
  const [actionType, setActionType] = React.useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE')
  const [actionComments, setActionComments] = React.useState('')
  const [submittingAction, setSubmittingAction] = React.useState(false)

  // Timetable review filter
  const [selectedClassId, setSelectedClassId] = React.useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('')

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [clsRes, empRes, leaveRes, examRes, ttRes, evRes] = await Promise.all([
        api<{ data: ClassItem[] }>('/api/academics/classes?all=1').catch(() => ({ data: [] })),
        api<{ data: any[] }>('/api/employees?all=1').catch(() => ({ data: [] })),
        list<LeaveRequestItem>('api/attendance/leave', { all: true }).catch(() => ({ data: [] })),
        api<{ data: ExamItem[] }>('/api/exams?all=1').catch(() => ({ data: [] })),
        api<{ data: any[] }>('/api/academics/timetables?all=1').catch(() => ({ data: [] })),
        list('api/events', { all: true, sortBy: 'startDate', sortDir: 'asc' }).catch(() => ({ data: [] })),
      ])

      const loadedClasses = clsRes.data || []
      setClasses(loadedClasses)
      if (loadedClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(loadedClasses[0].id)
        if (loadedClasses[0].sections?.length) {
          setSelectedSectionId(loadedClasses[0].sections[0].id)
        }
      }

      setTeachers((empRes.data || []).filter((e: any) => e.isTeacher || e.designation?.toLowerCase().includes('teacher')))
      
      const leaveRows = leaveRes.data || []
      setAllLeaves(leaveRows)
      // Filter requests waiting for Academic Coordinator
      const forCoordinator = leaveRows.filter((l: LeaveRequestItem) => 
        (l.status === 'IN_PROGRESS' || l.status === 'PENDING') &&
        (l.currentApproverRole === 'ACADEMIC_COORDINATOR' || !l.currentApproverRole)
      )
      setPendingLeaves(forCoordinator)

      setExams(examRes.data || [])
      setTimetables(ttRes.data || [])
      setEvents(evRes.data || [])
    } catch (err) {
      console.error('[coordinator-dashboard] load error', err)
      toast.error('Could not refresh academic coordination data.')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  React.useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const openActionModal = (req: LeaveRequestItem, action: 'APPROVE' | 'REJECT' | 'RETURN') => {
    setSelectedLeave(req)
    setActionType(action)
    setActionComments('')
    setActionModalOpen(true)
  }

  const handleDecisionSubmit = async () => {
    if (!selectedLeave) return
    setSubmittingAction(true)
    try {
      await api(`/api/attendance/leave/${selectedLeave.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: actionType,
          comments: actionComments.trim() || undefined,
        }),
      })
      toast.success(
        actionType === 'APPROVE'
          ? `Request for ${selectedLeave.requesterName} approved and advanced to next level.`
          : actionType === 'RETURN'
          ? `Request returned to ${selectedLeave.requesterName} for correction.`
          : `Request rejected.`
      )
      setActionModalOpen(false)
      setSelectedLeave(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit workflow decision.')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Filter timetable slots for currently selected class and section
  const currentClass = classes.find(c => c.id === selectedClassId)
  const availableSections = currentClass?.sections || []
  const filteredSlots = React.useMemo(() => {
    if (!timetables.length) return []
    return timetables.filter((t: any) => {
      const matchClass = selectedClassId ? t.classId === selectedClassId : true
      const matchSec = selectedSectionId ? t.sectionId === selectedSectionId : true
      return matchClass && matchSec
    })
  }, [timetables, selectedClassId, selectedSectionId])

  return (
    <div className="space-y-6">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent p-6 shadow-sm">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <Badge variant="outline" className="border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wide text-[10px]">
                <Sparkles className="mr-1 h-3 w-3" /> Academic Coordinator Workspace
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Welcome, {session?.name || 'Academic Coordinator'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Review syllabus pacing, coordinate teaching faculty, manage timetable schedules, and resolve staff approvals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="h-9 rounded-xl border-border/80 bg-background/80 shadow-sm">
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Academic Data
            </Button>
            <Button size="sm" onClick={() => setActiveTab('approvals')} className="h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Approvals Inbox ({pendingLeaves.length})
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 w-full justify-start rounded-xl bg-muted/60 p-1 sm:w-auto">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="coordination" className="rounded-lg text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Classes & Teachers
          </TabsTrigger>
          <TabsTrigger value="timetable" className="rounded-lg text-xs font-semibold gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Timetable Review
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-lg text-xs font-semibold gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approvals Inbox
            {pendingLeaves.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingLeaves.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Classes</span>
                <span className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                  <GraduationCap className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{classes.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Grades 1 through 12</p>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Faculty</span>
                <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{teachers.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Teaching staff on roster</p>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
                <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingLeaves.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Leave / OD / IOD workflows</p>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Upcoming Exams</span>
                <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                  <ClipboardList className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{exams.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Academic assessments scheduled</p>
            </Card>
          </div>

          {/* Pending Approvals & Upcoming Exams Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Quick Action Pending Approvals */}
            <Card className="rounded-xl border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" /> Pending Approval Requests
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Institutional Leave / OD / IOD tasks awaiting coordinator review
                  </CardDescription>
                </div>
                {pendingLeaves.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('approvals')} className="text-xs text-sky-600">
                    View All ({pendingLeaves.length}) <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 opacity-80" />
                    <p className="text-sm font-semibold text-foreground">All Approvals Clear</p>
                    <p className="text-xs">No pending Leave or OD requests require your action at this time.</p>
                  </div>
                ) : (
                  pendingLeaves.slice(0, 4).map(req => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{req.requesterName}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                            {req.category || 'LEAVE'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">({req.type})</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Reason: {req.reason || 'Not specified'}
                        </p>
                        <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                          {fmtDate(req.fromDate)} – {fmtDate(req.toDate)}
                          {req.substituteName && ` · Sub: ${req.substituteName}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => openActionModal(req, 'APPROVE')}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={() => openActionModal(req, 'RETURN')}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Academic Examinations */}
            <Card className="rounded-xl border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-indigo-500" /> Upcoming Examinations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Assessment schedule & syllabus milestone timeline
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setModule('examinations')} className="text-xs text-sky-600">
                  Open Exams <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {exams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <CalendarCheck className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-foreground">No Upcoming Exams</p>
                    <p className="text-xs">All scheduled examinations have been completed or none are scheduled yet.</p>
                  </div>
                ) : (
                  exams.slice(0, 4).map(exam => (
                    <div key={exam.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{exam.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {exam.type} · {exam.term?.name || 'Academic Term'}
                        </p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                          Starts {fmtDate(exam.startDate)} · Ends {fmtDate(exam.endDate)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                        {exam.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: CLASSES & TEACHERS COORDINATION ── */}
        <TabsContent value="coordination" className="space-y-6">
          <Card className="rounded-xl border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Class & Section Allocation Directory</CardTitle>
              <CardDescription className="text-xs">
                Inspect assigned class teachers, sections, and classroom capacity across school grades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Class / Grade</TableHead>
                      <TableHead className="font-semibold text-xs">Sections</TableHead>
                      <TableHead className="font-semibold text-xs">Assigned Class Teachers</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map(cls => (
                      <TableRow key={cls.id}>
                        <TableCell className="font-bold text-sm text-foreground">
                          {cls.name} <span className="text-xs text-muted-foreground font-normal">(Level {cls.level})</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {(cls.sections || []).map(sec => (
                              <Badge key={sec.id} variant="secondary" className="text-xs font-medium">
                                Sec {sec.name} {sec.room ? `(${sec.room})` : ''}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(cls.sections || []).map(sec => {
                            const teacher = teachers.find(t => t.id === sec.teacherId)
                            return (
                              <div key={sec.id} className="py-0.5">
                                <span className="font-medium text-foreground">Sec {sec.name}:</span> {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                              </div>
                            )
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-sky-600 hover:text-sky-700"
                            onClick={() => {
                              setSelectedClassId(cls.id)
                              if (cls.sections?.length) setSelectedSectionId(cls.sections[0].id)
                              setActiveTab('timetable')
                            }}
                          >
                            Review Timetable <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: TIMETABLE REVIEW ── */}
        <TabsContent value="timetable" className="space-y-6">
          <Card className="rounded-xl border bg-card shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Timetable Schedule Review</CardTitle>
                <CardDescription className="text-xs">
                  Review published class timetables, period allocations, and subject teachers
                </CardDescription>
              </div>

              {/* Class & Section Switcher */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value)
                    const cls = classes.find(c => c.id === e.target.value)
                    if (cls?.sections?.length) setSelectedSectionId(cls.sections[0].id)
                    else setSelectedSectionId('')
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
                  disabled={!availableSections.length}
                >
                  {availableSections.map(s => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-xl border-dashed">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-foreground">No Published Slots for this Section</p>
                  <p className="text-xs max-w-sm mt-1">
                    Master timetables are managed and published by the Principal's Office. You can review scheduled periods once configured.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Day</TableHead>
                        <TableHead className="font-semibold text-xs">Period</TableHead>
                        <TableHead className="font-semibold text-xs">Timing</TableHead>
                        <TableHead className="font-semibold text-xs">Subject</TableHead>
                        <TableHead className="font-semibold text-xs">Teacher</TableHead>
                        <TableHead className="font-semibold text-xs">Room</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSlots.map((slot: any) => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-semibold text-xs">{slot.dayOfWeek}</TableCell>
                          <TableCell className="text-xs font-mono font-medium">Period {slot.periodNumber}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{slot.startTime} – {slot.endTime}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">{slot.subject?.name || slot.subjectName || 'General Subject'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{slot.teacher?.name || slot.teacherName || 'Assigned Staff'}</TableCell>
                          <TableCell className="text-xs">{slot.room || 'Classroom'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: APPROVALS INBOX ── */}
        <TabsContent value="approvals" className="space-y-6">
          <Card className="rounded-xl border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Leave / OD / IOD Approval Tasks</CardTitle>
                <CardDescription className="text-xs">
                  Institutional workflow inbox for staff and faculty leave requests
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {pendingLeaves.length} Actionable Request{pendingLeaves.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>
            <CardContent>
              {allLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-xl border-dashed">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-foreground">No Workflow Requests</p>
                  <p className="text-xs">No leave or On Duty requests have been submitted yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Requester</TableHead>
                        <TableHead className="font-semibold text-xs">Category</TableHead>
                        <TableHead className="font-semibold text-xs">Type</TableHead>
                        <TableHead className="font-semibold text-xs">Dates</TableHead>
                        <TableHead className="font-semibold text-xs">Reason</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLeaves.map(req => {
                        const isActionable = (req.status === 'IN_PROGRESS' || req.status === 'PENDING') &&
                          (req.currentApproverRole === 'ACADEMIC_COORDINATOR' || !req.currentApproverRole)

                        return (
                          <TableRow key={req.id} className={isActionable ? 'bg-amber-500/5' : undefined}>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">{req.requesterName}</div>
                              {req.substituteName && (
                                <div className="text-[11px] text-muted-foreground">Sub: {req.substituteName}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                {req.category || 'LEAVE'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{req.type}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {fmtDate(req.fromDate)} – {fmtDate(req.toDate)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {req.reason}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase ${
                                  req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                  req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                                  req.status === 'RETURNED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                  'bg-sky-500/10 text-sky-600 border-sky-500/30'
                                }`}
                              >
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {isActionable ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                    onClick={() => openActionModal(req, 'APPROVE')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                    onClick={() => openActionModal(req, 'RETURN')}
                                  >
                                    Return
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2.5 text-xs"
                                    onClick={() => openActionModal(req, 'REJECT')}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Logged</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── ACTION CONFIRMATION MODAL ── */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'APPROVE' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {actionType === 'RETURN' && <RotateCcw className="h-5 w-5 text-amber-500" />}
              {actionType === 'REJECT' && <XCircle className="h-5 w-5 text-rose-500" />}
              {actionType === 'APPROVE' ? 'Approve Workflow Request' : actionType === 'RETURN' ? 'Return Request for Correction' : 'Reject Workflow Request'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm your decision for {selectedLeave?.requesterName}'s {selectedLeave?.category} request.
            </DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <div><span className="font-semibold text-foreground">Employee:</span> {selectedLeave.requesterName}</div>
                <div><span className="font-semibold text-foreground">Dates:</span> {fmtDate(selectedLeave.fromDate)} to {fmtDate(selectedLeave.toDate)}</div>
                <div><span className="font-semibold text-foreground">Reason:</span> {selectedLeave.reason}</div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Comments / Decision Remarks {actionType !== 'APPROVE' && <span className="text-rose-500">*</span>}
                </label>
                <Textarea
                  placeholder={actionType === 'APPROVE' ? 'Optional remarks for subsequent approver…' : 'Reason for return or rejection (required)…'}
                  value={actionComments}
                  onChange={e => setActionComments(e.target.value)}
                  className="h-20 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setActionModalOpen(false)} disabled={submittingAction}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : actionType === 'RETURN' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              onClick={handleDecisionSubmit}
              disabled={submittingAction || (actionType !== 'APPROVE' && !actionComments.trim())}
            >
              {submittingAction ? 'Submitting…' : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

