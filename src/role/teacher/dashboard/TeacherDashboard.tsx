'use client'

import * as React from 'react'
import { useErp } from '@/lib/store'
import { api, ApiError } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  StatCard, SectionCard, StatusBadge, EmptyState, ErrorState
} from '@/components/erp/ui'
import {
  GraduationCap, CalendarCheck, FileEdit, ClipboardList, Clock, MapPin,
  CheckCircle2, Megaphone, ArrowRight, RefreshCw,
  PlusCircle, BookOpen, ChevronRight, Sparkles, UserCheck, Users,
  CalendarDays, AlertCircle, Eye, Check
} from 'lucide-react'

function greetingFor(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const WEEK_DAYS = [
  { day: 1, name: 'Monday', short: 'Mon' },
  { day: 2, name: 'Tuesday', short: 'Tue' },
  { day: 3, name: 'Wednesday', short: 'Wed' },
  { day: 4, name: 'Thursday', short: 'Thu' },
  { day: 5, name: 'Friday', short: 'Fri' },
  { day: 6, name: 'Saturday', short: 'Sat' },
]

export default function TeacherDashboard() {
  const { session, setModule } = useErp()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Timetable view state: DAY or WEEK
  const [timetableMode, setTimetableMode] = React.useState<'DAY' | 'WEEK'>('DAY')
  const currentJsDay = new Date().getDay()
  const defaultDay = currentJsDay === 0 ? 1 : Math.min(6, currentJsDay)
  const [selectedWeekDay, setSelectedWeekDay] = React.useState<number>(defaultDay)

  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    setRefreshKey(k => k + 1)
  }

  React.useEffect(() => {
    let alive = true
    api<{ data: any }>('/api/portal/teacher')
      .then(res => {
        if (alive) {
          setData(res.data)
          setError(null)
        }
      })
      .catch((err: ApiError) => {
        if (alive) {
          console.error('[TeacherDashboard load error]', err)
          setError(err.message || 'Unable to load teacher dashboard data.')
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [refreshKey])

  if (loading) {
    return <TeacherDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  const teacher = data?.teacher
  const kpis = data?.kpis || {}
  const timetable = data?.todayTimetable || []
  const weekTimetable = data?.weekTimetable || []
  const tasks = data?.pendingTasks || []
  const upcomingExams = data?.upcomingExams || []
  const announcements = data?.announcements || []
  const assignedClasses = teacher?.assignedClasses || []
  const assignedSubjects = teacher?.assignedSubjects || []

  // Filter week timetable slots for selected day
  const displayedWeekSlots = weekTimetable.filter((s: any) => s.dayOfWeek === selectedWeekDay)

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* ── Greeting Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:p-6 backdrop-blur-md shadow-xs">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {todayStr}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <Sparkles className="mr-1 h-3 w-3" /> Teacher Portal
              </Badge>
              {teacher?.isClassTeacher && (
                <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 text-[10px] font-bold uppercase">
                  Homeroom Class Teacher
                </Badge>
              )}
            </div>

            <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {greetingFor()}, {teacher?.name ? teacher.name.split(' ')[0] : (session?.name?.split(' ')[0] || 'Teacher')}
            </h1>

            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">{teacher?.name}</span> · {teacher?.designation || 'Academic Faculty'} · {teacher?.department || 'Nehru International School'}
            </p>

            {/* Assigned Classes & Subjects Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Assigned Classes:</span>
              {assignedClasses.length > 0 ? (
                assignedClasses.map((cls: any) => (
                  <span
                    key={cls.id}
                    className="inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-semibold border border-border/80 shadow-2xs"
                  >
                    <Users className="h-3 w-3 text-primary" />
                    {cls.name}
                    {cls.isHomeroom && <span className="text-[9px] text-emerald-600 font-bold ml-0.5">(HR)</span>}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">General Academic Pool</span>
              )}

              {assignedSubjects.length > 0 && (
                <>
                  <span className="text-muted-foreground/40 mx-1">|</span>
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">Subjects:</span>
                  {assignedSubjects.map((sub: any) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary border border-primary/20 shadow-2xs"
                    >
                      <BookOpen className="h-3 w-3" />
                      {sub.name}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-border/80 bg-background/80 shadow-2xs hover:bg-background"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync Data
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's Classes"
          countTo={kpis.todayClassesCount || 0}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="info"
          hint={`${kpis.activeStudentsCount || 0} students · ${kpis.assignedClassesCount || 0} assigned classes`}
          onClick={() => setModule('students', { tab: 'directory' })}
        />

        <StatCard
          label="Attendance Status"
          value={kpis.attendancePendingCount > 0 ? `${kpis.attendancePendingCount} Pending` : '0 Pending'}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone={kpis.attendancePendingCount > 0 ? 'danger' : 'success'}
          hint={
            kpis.attendancePendingCount > 0
              ? 'Roll call pending for your section today'
              : (kpis.isClassTeacher ? "Today's roll call completed" : 'Subject Faculty · No homeroom duty')
          }
          onClick={() => setModule('attendance', { tab: 'mark' })}
        />

        <StatCard
          label="Awaiting Grading"
          countTo={kpis.assignmentsToGradeCount || 0}
          icon={<FileEdit className="h-5 w-5" />}
          tone={kpis.assignmentsToGradeCount > 0 ? 'warning' : 'default'}
          hint={kpis.assignmentsToGradeCount > 0 ? 'Submissions for your assignments' : 'All assignments graded'}
          onClick={() => setModule('lms', { tab: 'submissions' })}
        />

        <StatCard
          label="Upcoming Exams"
          countTo={kpis.upcomingExamsCount || 0}
          icon={<ClipboardList className="h-5 w-5" />}
          tone={kpis.upcomingExamsCount > 0 ? 'info' : 'default'}
          hint={kpis.upcomingExamsCount > 0 ? 'Assessments scheduled for your classes' : 'No upcoming exams'}
          onClick={() => setModule('examinations', { tab: 'marks' })}
        />
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Actions:</span>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('students', { tab: 'directory' })}
        >
          <Users className="h-3.5 w-3.5 text-primary" /> My Students
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('attendance', { tab: 'mark' })}
        >
          <UserCheck className="h-3.5 w-3.5 text-primary" /> Mark Attendance
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('examinations', { tab: 'marks' })}
        >
          <ClipboardList className="h-3.5 w-3.5 text-primary" /> Enter Marks
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('lms', { tab: 'assignments' })}
        >
          <PlusCircle className="h-3.5 w-3.5 text-primary" /> Homework & Assignments
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('academics', { tab: 'lesson-planning' })}
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" /> Lesson Plans
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
          onClick={() => setModule('attendance', { tab: 'leave' })}
        >
          <CalendarDays className="h-3.5 w-3.5 text-primary" /> Apply Leave / OD
        </Button>
      </div>

      {/* ── Main Two-Column Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Timetable & Tasks (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Teaching Schedule with Day & Week Views */}
          <SectionCard
            title={timetableMode === 'DAY' ? "Today's Teaching Schedule" : "Weekly Master Timetable"}
            description={
              timetableMode === 'DAY'
                ? `Live timetable slots scheduled for ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}`
                : "Weekly period distribution across classes and subjects"
            }
            actions={
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg border border-border/80 bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTimetableMode('DAY')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${timetableMode === 'DAY'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Day View
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimetableMode('WEEK')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${timetableMode === 'WEEK'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Week View
                  </button>
                </div>
              </div>
            }
          >
            {/* WEEK VIEW: Day Selector Tabs */}
            {timetableMode === 'WEEK' && (
              <div className="mb-4 flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
                {WEEK_DAYS.map(d => (
                  <button
                    key={d.day}
                    onClick={() => setSelectedWeekDay(d.day)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${selectedWeekDay === d.day
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <span>{d.name}</span>
                    {d.day === defaultDay && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${selectedWeekDay === d.day ? 'bg-primary-foreground/20 text-white' : 'bg-primary/10 text-primary'
                        }`}>
                        Today
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* DAY VIEW SLOTS */}
            {timetableMode === 'DAY' && (
              timetable.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
                  title="No classes scheduled for today"
                  description="You have no assigned timetable periods for today. Relax or review lesson planning."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTimetableMode('WEEK')}
                    >
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> View Full Week Schedule
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {timetable.map((slot: any) => (
                    <div
                      key={slot.id || slot.period}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border p-4 transition-all ${slot.isCurrent
                          ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-xs'
                          : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30'
                        }`}
                    >
                      {/* Left: Period Badge, Details */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono text-sm font-black shadow-2xs ${slot.isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-primary/10 text-primary'
                            }`}>
                            P{slot.period}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground/80 mt-1 uppercase">
                            Period {slot.period}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {slot.subject}
                            </span>
                            <Badge variant="outline" className="border-border/80 bg-background/80 font-bold text-xs py-0">
                              {slot.className} · Section {slot.sectionName}
                            </Badge>
                            {slot.isCurrent && (
                              <span className="anim-pulse inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                In Progress
                              </span>
                            )}
                            {slot.isNext && (
                              <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                                Up Next
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary/70" />
                              <strong className="text-foreground">{slot.time}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" /> {slot.room}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {slot.className} - {slot.sectionName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Attendance status badge & actions */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        {slot.attendanceStatus === 'MARKED' ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold py-0.5">
                              <Check className="mr-1 h-3 w-3" /> Attendance Marked
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground"
                              onClick={() => setModule('attendance', { tab: 'mark', classId: slot.classId, sectionId: slot.sectionId })}
                            >
                              <Eye className="mr-1 h-3 w-3" /> View
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold py-0.5">
                              <AlertCircle className="mr-1 h-3 w-3" /> Attendance Pending
                            </Badge>
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                              onClick={() => setModule('attendance', { tab: 'mark', classId: slot.classId, sectionId: slot.sectionId })}
                            >
                              <UserCheck className="mr-1 h-3 w-3" /> Mark Attendance
                            </Button>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] text-muted-foreground hover:text-primary p-0"
                          onClick={() => setModule('examinations', { tab: 'marks' })}
                        >
                          Enter Marks <ChevronRight className="ml-0.5 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* WEEK VIEW SLOTS */}
            {timetableMode === 'WEEK' && (
              displayedWeekSlots.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-8 w-8 text-muted-foreground/60" />}
                  title={`No periods scheduled for ${WEEK_DAYS.find(d => d.day === selectedWeekDay)?.name || 'this day'}`}
                  description="There are no classes allocated to you on this day in the academic master timetable."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b border-border/70">
                      <tr>
                        <th className="px-3 py-2.5">Period</th>
                        <th className="px-3 py-2.5">Time</th>
                        <th className="px-3 py-2.5">Class & Section</th>
                        <th className="px-3 py-2.5">Subject</th>
                        <th className="px-3 py-2.5">Room</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-card">
                      {displayedWeekSlots.map((slot: any) => (
                        <tr key={slot.id || slot.period} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 font-mono font-bold text-foreground">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-primary/10 text-primary">
                              P{slot.period}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">
                            {slot.time}
                          </td>
                          <td className="px-3 py-3 font-semibold text-foreground">
                            {slot.className} - {slot.sectionName}
                          </td>
                          <td className="px-3 py-3 font-medium text-foreground">
                            <Badge variant="outline" className="font-semibold text-xs">
                              {slot.subject}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {slot.room}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-semibold text-primary hover:text-primary"
                              onClick={() => setModule('attendance', { tab: 'mark', classId: slot.classId, sectionId: slot.sectionId })}
                            >
                              Roll Call
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </SectionCard>

          {/* Action Center: Pending Tasks */}
          <SectionCard
            title="Action Center & Pending Tasks"
            description="Operational items requiring your immediate review or submission"
          >
            {tasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500/80" />}
                title="All caught up!"
                description="You have no outstanding roll calls, pending grades, or unresolved notices."
              />
            ) : (
              <div className="space-y-2.5">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 transition-all hover:border-primary/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={task.badge} />
                        <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 h-8 text-xs rounded-lg"
                      onClick={() => setModule(task.targetModule, task.targetParams || {})}
                    >
                      {task.actionLabel} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Exams & Announcements (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Upcoming Examinations */}
          <SectionCard
            title="Upcoming Examinations"
            description="Assessments scheduled for your assigned classes"
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setModule('examinations', { tab: 'marks' })}
              >
                Marks Portal <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          >
            {upcomingExams.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8 text-muted-foreground/60" />}
                title="No upcoming exams"
                description="No active assessment cycle scheduled for your classes at this time."
              />
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {exam.examType || 'Term'}
                        </Badge>
                        <h4 className="font-semibold text-sm truncate text-foreground">
                          {exam.subjectName}
                        </h4>
                      </div>

                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {exam.examName} · <strong className="text-foreground">{exam.className}</strong>
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {fmtDate(exam.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {exam.startTime} - {exam.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {exam.room}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 text-xs"
                      onClick={() => setModule('examinations', { tab: 'marks' })}
                    >
                      Enter Marks
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Announcements & Notifications */}
          <SectionCard
            title="Campus Circulars & Notices"
            description="Official communications for teaching staff"
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setModule('communication')}
              >
                All Circulars <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          >
            {announcements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-8 w-8 text-muted-foreground/60" />}
                title="No active circulars"
                description="Administrative circulars and institutional notices will appear here."
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((ann: any) => (
                  <div
                    key={ann.id}
                    className="rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {ann.title}
                      </h4>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {fmtDate(ann.publishAt || ann.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 rounded-2xl border bg-muted/30 p-6 flex flex-col justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border bg-card p-4 flex flex-col justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="h-96 rounded-2xl border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="h-96 rounded-2xl border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
