'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarIcon, CheckCheck, Loader2, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

  /* ── load classes (with retry) ── */
  const loadClasses = React.useCallback(async () => {
    setLoadError(false)
    const opts = await loadClassOptions()
    if (!opts.length) { setLoadError(true); return }
    setClasses(opts)
  }, [])
  React.useEffect(() => { loadClasses() }, [loadClasses])

  /* ── load sections when class changes ── */
  React.useEffect(() => {
    setSectionId('')
    if (!classId) { setSections([]); return }
    let alive = true
    loadSectionOptions(classId).then(opts => { if (alive) setSections(opts) })
    return () => { alive = false }
  }, [classId])

  /* ── load students + existing attendance for the picked day ── */
  const loadStudents = React.useCallback(async () => {
    if (!classId && !sectionId) return
    setLoading(true)
    try {
      const params: Record<string, unknown> = { all: 1, sortBy: 'rollNo', sortDir: 'asc' }
      if (sectionId) params.sectionId = sectionId
      else params.classId = classId
      const res = await list('api/students', params as any)
      const rows = res.data || []
      setStudents(rows)

      // existing attendance rows for this day
      const attParams: Record<string, unknown> = { all: 1, dateFrom: date, dateTo: date }
      if (sectionId) attParams.sectionId = sectionId
      else attParams.classId = classId
      const att = await list('api/attendance', attParams as any).catch(() => ({ data: [] as any[] }))
      const existing = new Map<string, any>((att.data || []).map((r: any) => [r.studentId, r]))
      const next: MarksMap = {}
      for (const s of rows) {
        const ex = existing.get(s.id)
        next[s.id] = { status: ex?.status && ex.status !== 'HOLIDAY' ? ex.status : 'PRESENT', remarks: ex?.remarks || '' }
      }
      setMarks(next)
      setDirty(false)
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not load students.')
      setStudents([])
      setMarks({})
    } finally {
      setLoading(false)
    }
  }, [classId, sectionId, date])
  React.useEffect(() => { loadStudents() }, [loadStudents])

  const setStatus = (studentId: string, status: string) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
    setDirty(true)
  }
  const setRemarks = (studentId: string, remarks: string) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
    setDirty(true)
  }
  const markAllPresent = () => {
    setMarks(prev => {
      const next: MarksMap = {}
      for (const s of students) next[s.id] = { status: 'PRESENT', remarks: prev[s.id]?.remarks || '' }
      return next
    })
    setDirty(true)
    toast.info('All students marked present — remember to save.')
  }

  const summary = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of students) {
      const st = marks[s.id]?.status || 'PRESENT'
      counts[st] = (counts[st] || 0) + 1
    }
    return counts
  }, [students, marks])

  const save = async () => {
    if (!students.length) return
    setSaving(true)
    try {
      const res = await api<{ data: { saved: number; notified: number } }>('/api/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          date,
          entries: students.map(s => ({
            studentId: s.id,
            status: marks[s.id]?.status || 'PRESENT',
            remarks: marks[s.id]?.remarks || undefined,
          })),
        }),
      })
      const { saved, notified } = res.data
      toast.success(`Attendance saved for ${saved} student${saved === 1 ? '' : 's'}.` + (notified ? ` ${notified} parent${notified === 1 ? '' : 's'} notified of absence.` : ''))
      setDirty(false)
      loadStudents()
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
      {/* Selectors */}
      <SectionCard
        title="Mark daily attendance"
        description="Pick a date and class, then set each student's status. Absences notify parents automatically."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!students.length || saving}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all present
            </Button>
            <Button size="sm" onClick={save} disabled={!students.length || saving || !dirty}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-1.5 h-4 w-4" />}
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Date</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(new Date(`${date}T00:00:00`), 'EEE, dd MMM yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? new Date(`${date}T00:00:00`) : undefined}
                  onSelect={d => { if (d) { setDate(format(d, 'yyyy-MM-dd')); setDirty(true) } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Class</span>
            {loadError ? (
              <Button variant="outline" size="sm" className="w-full" onClick={loadClasses}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry loading classes
              </Button>
            ) : (
              <Select value={classId || undefined} onValueChange={v => { setClassId(v) }}>
                <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {classes.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
                  {classes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Section</span>
            <Select value={sectionId || 'all'} onValueChange={v => setSectionId(v === 'all' ? '' : v)} disabled={!classId}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All sections" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All sections</SelectItem>
                {sections.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary chips */}
        {students.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Users className="h-3.5 w-3.5" /> {students.length} students
            </span>
            {ATTENDANCE_STATUSES.filter(st => summary[st]).map(st => (
              <span key={st} className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', STATUS_CHIP_IDLE[st])}>
                {STATUS_LABELS[st]}: {summary[st]}
              </span>
            ))}
            {dirty && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">● Unsaved changes</span>}
          </div>
        )}
      </SectionCard>

      {/* Student list */}
      {!canPick ? (
        <EmptyState
          title="Select a class to begin"
          description="Choose a class (and optionally a section) above to load students for attendance marking."
          icon={<Users className="h-7 w-7" />}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="No active students are enrolled in this class/section yet."
          icon={<Users className="h-7 w-7" />}
        />
      ) : (
        <div className="erp-scroll max-h-[32rem] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((s) => {
              const row = marks[s.id] || { status: 'PRESENT', remarks: '' }
              return (
                <Card key={s.id} className="py-0">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(`${s.firstName} ${s.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.firstName} {s.lastName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.admissionNo}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ATTENDANCE_STATUSES.map(st => (
                        <button
                          key={st}
                          type="button"
                          aria-pressed={row.status === st}
                          onClick={() => setStatus(s.id, st)}
                          className={cn(
                            'min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            row.status === st ? STATUS_CHIP_ACTIVE[st] : STATUS_CHIP_IDLE[st],
                          )}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      ))}
                    </div>
                    {row.status !== 'PRESENT' && (
                      <Input
                        value={row.remarks}
                        onChange={e => setRemarks(s.id, e.target.value)}
                        placeholder="Remarks (e.g. informed by parent)"
                        className="h-8 text-xs"
                      />
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
