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
  PlusCircle, BookOpen, ChevronRight, Sparkles, UserCheck, Users
} from 'lucide-react'

function greetingFor(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TeacherDashboard() {
  const { session, setModule } = useErp()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

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
          title="Could not load your dashboard"
          description={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  const teacher = data?.teacher
  const kpis = data?.kpis || {}
  const timetable = data?.todayTimetable || []
  const tasks = data?.pendingTasks || []
  const upcomingExams = data?.upcomingExams || []
  const announcements = data?.announcements || []

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
            </div>

            <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {greetingFor()}, {teacher?.name ? teacher.name.split(' ')[0] : (session?.name?.split(' ')[0] || 'Teacher')}
            </h1>

            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {teacher?.designation || 'Academic Faculty'} · {teacher?.department || 'Nehru International School'}
            </p>
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
          hint={`${kpis.activeStudentsCount || 0} students · ${kpis.assignedClassesCount || 0} classes`}
          onClick={() => setModule('students', { tab: 'my-classes' })}
        />

        <StatCard
          label="Attendance Status"
          value={kpis.attendancePendingCount > 0 ? `${kpis.attendancePendingCount} Pending` : '0 Pending'}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone={kpis.attendancePendingCount > 0 ? 'danger' : 'success'}
          hint={
            kpis.attendancePendingCount > 0
              ? 'Roll call pending for your section'
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
          hint={kpis.upcomingExamsCount > 0 ? 'Assessments for your classes' : 'No upcoming exams'}
          onClick={() => setModule('examinations', { tab: 'exams' })}
        />
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Actions:</span>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium"
          onClick={() => setModule('students', { tab: 'my-classes' })}
        >
          <Users className="h-3.5 w-3.5 text-primary" /> My Classes
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
          onClick={() => setModule('lms', { tab: 'assignments' })}
        >
          <PlusCircle className="h-3.5 w-3.5 text-primary" /> Create Assignment
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
          onClick={() => setModule('academics', { tab: 'timetable' })}
        >
          <Clock className="h-3.5 w-3.5 text-primary" /> View Timetable
        </Button>
      </div>

      {/* ── Main Two-Column Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Timetable & Tasks (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Today's Teaching Schedule */}
          <SectionCard
            title="Today's Teaching Schedule"
            description={`Live timetable slots scheduled for ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}`}
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setModule('academics', { tab: 'timetable' })}
              >
                Full Timetable <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          >
            {timetable.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
                title="No classes scheduled for today"
                description="You have no assigned timetable periods for today. You can configure and allocate schedule slots in the Academics module."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModule('academics', { tab: 'timetable' })}
                  >
                    Open Timetable Planner
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {timetable.map((slot: any) => (
                  <div
                    key={slot.id || slot.period}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
                        P{slot.period}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {slot.subject}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold py-0">
                            {slot.className} - {slot.sectionName}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {slot.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {slot.room}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setModule('attendance')}
                      >
                        Roll Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
            description="Scheduled school assessments"
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setModule('examinations', { tab: 'exams' })}
              >
                Exam Desk <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          >
            {upcomingExams.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-7 w-7 text-muted-foreground/60" />}
                title="No upcoming exams"
                description="No active assessment timetables found for your classes."
              />
            ) : (
              <div className="space-y-2.5">
                {upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs space-y-1.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">
                        {exam.subjectName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {exam.className}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {exam.examName} ({exam.examType})
                    </p>
                    <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                      <span>{fmtDate(exam.date)}</span>
                      <span>{exam.startTime} - {exam.endTime}</span>
                      <span>{exam.room}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Announcements & Circulars */}
          <SectionCard
            title="Campus Circulars"
            description="Official communications and notices"
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setModule('communication')}
              >
                All Notices <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          >
            {announcements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-7 w-7 text-muted-foreground/60" />}
                title="No circulars"
                description="There are no active faculty announcements right now."
              />
            ) : (
              <div className="space-y-2.5">
                {announcements.map((ann: any) => (
                  <div
                    key={ann.id}
                    className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs space-y-1.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {ann.title}
                      </h4>
                      <StatusBadge value={ann.priority || 'NORMAL'} />
                    </div>
                    <p className="line-clamp-2 text-muted-foreground leading-relaxed">
                      {ann.body}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Audience: {ann.audience}</span>
                      <span>{fmtDate(ann.publishAt || ann.createdAt)}</span>
                    </div>
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
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
