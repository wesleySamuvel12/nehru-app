'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  CalendarIcon, CheckCheck, Loader2, RefreshCw, Users, Percent, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SectionCard, EmptyState } from '@/components/erp/ui'
import { initials } from '@/lib/format'
import { api, list, ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  ATTENDANCE_STATUSES, STATUS_LABELS, STATUS_CHIP_ACTIVE, STATUS_CHIP_IDLE,
  loadClassOptions, loadSectionOptions, todayISO, type Option,
} from './helpers'

interface MarkRow { status: string; remarks: string }
type MarksMap = Record<string, MarkRow>

const SCROLL_CSS = `
.erp-scroll::-webkit-scrollbar{width:6px;height:6px}
.erp-scroll::-webkit-scrollbar-thumb{background:hsl(var(--muted-foreground)/.25);border-radius:9999px}
.erp-scroll::-webkit-scrollbar-track{background:transparent}
`

export default function MarkAttendance() {
  const [date, setDate] = React.useState<string>(todayISO())
  const [classId, setClassId] = React.useState('')
  const [sectionId, setSectionId] = React.useState('')

  const [classes, setClasses] = React.useState<Option[]>([])
  const [sections, setSections] = React.useState<Option[]>([])
  const [loadError, setLoadError] = React.useState(false)

  const [students, setStudents] = React.useState<any[]>([])
  const [marks, setMarks] = React.useState<MarksMap>({})
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  /* ── 1. Load teacher assigned classes ── */
  const loadClasses = React.useCallback(() => {
    loadClassOptions()
      .then(opts => {
        if (!opts.length) {
          setLoadError(true)
        } else {
          setClasses(opts)
          setLoadError(false)
          setClassId(prev => prev || opts[0].value)
        }
      })
      .catch(() => setLoadError(true))
  }, [])

  React.useEffect(() => {
    loadClasses()
  }, [loadClasses])

  /* ── 2. Load sections when class changes ── */
  React.useEffect(() => {
    let alive = true
    if (!classId) {
      Promise.resolve().then(() => {
        if (alive) {
          setSections([])
          setSectionId('')
        }
      })
      return () => { alive = false }
    }

    loadSectionOptions(classId).then(opts => {
      if (alive) {
        setSections(opts)
        setSectionId(opts.length > 0 ? opts[0].value : '')
      }
    })
    return () => { alive = false }
  }, [classId])

  /* ── 3. Load enrolled students + existing attendance records ── */
  React.useEffect(() => {
    if (!classId && !sectionId) return
    let alive = true

    const params: Record<string, unknown> = { all: 1, sortBy: 'rollNo', sortDir: 'asc' }
    if (sectionId) params.sectionId = sectionId
    else if (classId) params.classId = classId

    const attParams: Record<string, unknown> = { all: 1, dateFrom: date, dateTo: date }
    if (sectionId) attParams.sectionId = sectionId
    else if (classId) attParams.classId = classId

    Promise.all([
      list('api/students', params as any),
      list('api/attendance', attParams as any).catch(() => ({ data: [] as any[] })),
    ])
      .then(([res, att]) => {
        if (!alive) return
        const rows = res.data || []
        const existing = new Map<string, any>((att.data || []).map((r: any) => [r.studentId, r]))
        const next: MarksMap = {}
        for (const s of rows) {
          const ex = existing.get(s.id)
          next[s.id] = {
            status: ex?.status && ex.status !== 'HOLIDAY' ? ex.status : 'PRESENT',
            remarks: ex?.remarks || '',
          }
        }
        setStudents(rows)
        setMarks(next)
        setDirty(false)
        setLoading(false)
      })
      .catch(e => {
        if (!alive) return
        toast.error((e as ApiError).message || 'Could not load students for attendance.')
        setStudents([])
        setMarks({})
        setLoading(false)
      })

    return () => { alive = false }
  }, [classId, sectionId, date, tick])

  /* ── 4. Marking Actions ── */
  const setStatus = (studentId: string, status: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }))
    setDirty(true)
  }

  const setRemarks = (studentId: string, remarks: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }))
    setDirty(true)
  }

  const markAllPresent = () => {
    if (!students.length) return
    setMarks(prev => {
      const next: MarksMap = {}
      for (const s of students) {
        next[s.id] = { status: 'PRESENT', remarks: prev[s.id]?.remarks || '' }
      }
      return next
    })
    setDirty(true)
    toast.info('All students marked present. Remember to save changes.')
  }

  /* ── 5. Calculated Summary Metrics ── */
  const summary = React.useMemo(() => {
    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      EXCUSED: 0,
    }
    for (const s of students) {
      const st = marks[s.id]?.status || 'PRESENT'
      counts[st] = (counts[st] || 0) + 1
    }
    const attended = (counts.PRESENT || 0) + (counts.LATE || 0) + (counts.HALF_DAY || 0) + (counts.EXCUSED || 0)
    const total = students.length
    const percent = total > 0 ? Math.round((attended / total) * 100) : 0
    return { counts, attended, total, percent }
  }, [students, marks])

  /* ── 6. Save Attendance Bulk ── */
  const save = async () => {
    if (!students.length) return
    setSaving(true)
    try {
      const res = await api<{ data: { saved: number; notified: number } }>('/api/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          date,
          classId: classId || undefined,
          sectionId: sectionId || undefined,
          entries: students.map(s => ({
            studentId: s.id,
            status: marks[s.id]?.status || 'PRESENT',
            remarks: marks[s.id]?.remarks || undefined,
          })),
        }),
      })
      const { saved, notified } = res.data
      toast.success(
        `Attendance saved for ${saved} student${saved === 1 ? '' : 's'}.` +
        (notified ? ` ${notified} parent${notified === 1 ? '' : 's'} notified of absence.` : '')
      )
      setDirty(false)
      setTick(t => t + 1)
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const canPick = !!(classId || sectionId)

  return (
    <>
      <style>{SCROLL_CSS}</style>
      <div className="space-y-4">
        {/* Selectors and Action Bar */}
        <SectionCard
          title="Mark daily attendance"
          description="Select an assigned class and section, then mark each student's attendance. Absences notify parents automatically."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                disabled={!students.length || saving}
                className="h-8 text-xs font-medium"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Mark all present
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!students.length || saving || !dirty}
                className="h-8 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
              >
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                {saving ? 'Saving…' : 'Save attendance'}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Date Picker */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                    {date ? format(new Date(`${date}T00:00:00`), 'EEE, dd MMM yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(`${date}T00:00:00`) : undefined}
                    onSelect={d => {
                      if (d) {
                        const newDate = format(d, 'yyyy-MM-dd')
                        if (dirty && !window.confirm('You have unsaved changes. Switch date anyway?')) return
                        setDate(newDate)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned Class Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Class</span>
              {loadError ? (
                <Button variant="outline" size="sm" className="w-full" onClick={loadClasses}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry loading classes
                </Button>
              ) : (
                <Select
                  value={classId || undefined}
                  onValueChange={v => {
                    if (dirty && !window.confirm('You have unsaved changes. Switch class anyway?')) return
                    setClassId(v)
                  }}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {classes.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading assigned classes…</div>}
                    {classes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Section Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Section</span>
              <Select
                value={sectionId || undefined}
                onValueChange={v => {
                  if (dirty && !window.confirm('You have unsaved changes. Switch section anyway?')) return
                  setSectionId(v)
                }}
                disabled={!classId || sections.length === 0}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder={sections.length === 0 ? 'No sections' : 'Select section'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sections.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Real-time Summary Metric Strip */}
          {students.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <Badge variant="outline" className="gap-1.5 border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-800">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Total: <strong>{summary.total}</strong></span>
              </Badge>

              <Badge variant="outline" className="gap-1.5 border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-800">
                <Percent className="h-3.5 w-3.5 text-blue-600" />
                <span>Attendance: <strong>{summary.percent}%</strong></span>
              </Badge>

              <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                <span>Present: <strong>{summary.counts.PRESENT}</strong></span>
              </Badge>

              <Badge variant="outline" className="gap-1.5 border-rose-300 bg-rose-50 px-2.5 py-1 text-xs text-rose-800">
                <span>Absent: <strong>{summary.counts.ABSENT}</strong></span>
              </Badge>

              {summary.counts.LATE > 0 && (
                <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                  <span>Late: <strong>{summary.counts.LATE}</strong></span>
                </Badge>
              )}

              {summary.counts.EXCUSED > 0 && (
                <Badge variant="outline" className="gap-1.5 border-sky-300 bg-sky-50 px-2.5 py-1 text-xs text-sky-800">
                  <span>Excused: <strong>{summary.counts.EXCUSED}</strong></span>
                </Badge>
              )}

              {summary.counts.HALF_DAY > 0 && (
                <Badge variant="outline" className="gap-1.5 border-orange-300 bg-orange-50 px-2.5 py-1 text-xs text-orange-800">
                  <span>Half Day: <strong>{summary.counts.HALF_DAY}</strong></span>
                </Badge>
              )}

              {dirty && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> Unsaved changes
                </span>
              )}
            </div>
          )}
        </SectionCard>

        {/* Student Roster List */}
        {!canPick ? (
          <EmptyState
            title="Select a class to begin"
            description="Choose one of your assigned classes and sections above to load students for attendance marking."
            icon={<Users className="h-7 w-7 text-blue-600" />}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="No active students are currently enrolled in this class/section."
            icon={<Users className="h-7 w-7 text-muted-foreground" />}
          />
        ) : (
          <div className="erp-scroll max-h-[34rem] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {students.map(s => {
                const row = marks[s.id] || { status: 'PRESENT', remarks: '' }
                return (
                  <Card key={s.id} className="border-slate-200 transition-all hover:border-blue-300">
                    <CardContent className="space-y-3 p-4">
                      {/* Student Details */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarFallback className="bg-blue-50 text-xs font-bold text-blue-700">
                            {initials(`${s.firstName} ${s.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {s.admissionNo}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Status Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {ATTENDANCE_STATUSES.map(st => (
                          <button
                            key={st}
                            type="button"
                            aria-pressed={row.status === st}
                            onClick={() => setStatus(s.id, st)}
                            className={cn(
                              'min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                              row.status === st ? STATUS_CHIP_ACTIVE[st] : STATUS_CHIP_IDLE[st],
                            )}
                          >
                            {STATUS_LABELS[st]}
                          </button>
                        ))}
                      </div>

                      {/* Remarks Field (Shown when status is not PRESENT) */}
                      {row.status !== 'PRESENT' && (
                        <div className="space-y-1">
                          <Input
                            value={row.remarks}
                            onChange={e => setRemarks(s.id, e.target.value)}
                            placeholder="Add remarks (e.g. medical leave, parent informed)"
                            className="h-8 text-xs placeholder:text-slate-400"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
