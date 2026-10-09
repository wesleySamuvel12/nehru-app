'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardEdit, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard, EmptyState } from '@/components/erp/ui'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { list, api, ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { safeList, personName, parseClassIds, loadClassOptions, loadExamOptions, type Option } from './helpers'


interface EntryState { marks: string; absent: boolean }
type EntriesMap = Record<string, EntryState>

export default function MarksEntry() {
  const [exams, setExams] = React.useState<Option[]>([])
  const [examRows, setExamRows] = React.useState<any[]>([])
  const [examId, setExamId] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')

  const [classes, setClasses] = React.useState<Option[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])

  const [students, setStudents] = React.useState<any[]>([])
  const [entries, setEntries] = React.useState<EntriesMap>({})
  const [maxMarks, setMaxMarks] = React.useState<number>(100)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  /* ── initial load: exams + classes ── */
  React.useEffect(() => {
    let alive = true
    loadExamOptions().then(opts => { if (alive) setExams(opts) })
    safeList('api/exams', { all: 1 }).then(rows => { if (alive) setExamRows(rows) })
    loadClassOptions().then(opts => { if (alive) setClasses(opts) })
    return () => { alive = false }
  }, [])

  /* ── subjects for chosen class ── */
  React.useEffect(() => {
    setSubjectId('')
    if (!classId) { setSubjects([]); return }
    let alive = true
    safeList('api/academics/subjects', { classId, all: 1 }).then(rows => {
      if (alive) setSubjects(rows)
    })
    return () => { alive = false }
  }, [classId])

  /* ── students + existing marks + maxMarks when exam/class/subject ready ── */
  const loadSheet = React.useCallback(async () => {
    if (!examId || !classId || !subjectId) return
    setLoading(true)
    try {
      const [stuRes, markRes, schedRows] = await Promise.all([
        list('api/students', { classId, all: 1, sortBy: 'rollNo', sortDir: 'asc' } as any),
        list('api/exams/marks', { examId, subjectId, all: 1 } as any).catch(() => ({ data: [] as any[] })),
        safeList('api/exams/schedules', { examId, subjectId, classId }),
      ])
      const stuRows = stuRes.data || []
      setStudents(stuRows)

      // maxMarks: prefer the scheduled paper, then subject default
      const subject = await safeList('api/academics/subjects', { classId, all: 1 })
        .then(rows => rows.find((s: any) => s.id === subjectId))
      const mm = Number(schedRows[0]?.maxMarks) || Number(subject?.maxMarks) || 100
      setMaxMarks(mm)

      const existing = new Map<string, any>((markRes.data || []).map((m: any) => [m.studentId, m]))
      const next: EntriesMap = {}
      for (const s of stuRows) {
        const ex = existing.get(s.id)
        next[s.id] = ex
          ? { marks: ex.isAbsent ? '' : String(ex.marksObtained), absent: !!ex.isAbsent }
          : { marks: '', absent: false }
      }
      setEntries(next)
      setDirty(false)
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not load the marks sheet.')
      setStudents([])
      setEntries({})
    } finally {
      setLoading(false)
    }
  }, [examId, classId, subjectId])
  React.useEffect(() => { loadSheet() }, [loadSheet])

  const setEntry = (studentId: string, patch: Partial<EntryState>) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }))
    setDirty(true)
  }

  const summary = React.useMemo(() => {
    const vals = students.map(s => entries[s.id]).filter(Boolean) as EntryState[]
    const entered = vals.filter(v => v.absent || v.marks !== '').length
    const scored = vals.filter(v => !v.absent && v.marks !== '').map(v => Number(v.marks) || 0)
    const avg = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : 0
    const absentCount = vals.filter(v => v.absent).length
    return { entered, avg, absentCount, total: students.length }
  }, [students, entries])

  const examRow = examRows.find(e => e.id === examId)
  const examClassIds = parseClassIds(examRow?.classIds)
  const classOptions = examClassIds.length
    ? classes.filter(c => examClassIds.includes(c.value))
    : classes

  const save = async () => {
    if (!students.length) return
    const invalid = students.find(s => {
      const e = entries[s.id]
      return !e || (!e.absent && e.marks !== '' && (Number(e.marks) < 0 || Number(e.marks) > maxMarks))
    })
    if (invalid) {
      toast.error(`Marks must be between 0 and ${maxMarks}.`)
      return
    }
    setSaving(true)
    try {
      const res = await api<{ data: { saved: number } }>('/api/exams/marks/bulk', {
        method: 'POST',
        body: JSON.stringify({
          examId,
          subjectId,
          maxMarks,
          entries: students.map(s => {
            const e = entries[s.id] || { marks: '', absent: false }
            return {
              studentId: s.id,
              marksObtained: e.absent || e.marks === '' ? 0 : Number(e.marks),
              isAbsent: e.absent,
            }
          }),
        }),
      })
      toast.success(`Saved marks for ${res.data.saved} student${res.data.saved === 1 ? '' : 's'}. Grades calculated automatically.`)
      setDirty(false)
      loadSheet()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not save marks.')
    } finally {
      setSaving(false)
    }
  }

  const ready = !!(examId && classId && subjectId)

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <SectionCard
        title="Enter marks"
        description="Pick exam, class and subject, then type each student's score. Grades are calculated on save."
        actions={
          <Button size="sm" onClick={save} disabled={!ready || !students.length || saving || !dirty}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            {saving ? 'Saving…' : 'Save all marks'}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Exam</span>
            <Select value={examId || undefined} onValueChange={v => { setExamId(v); setClassId('') }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {exams.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No exams yet.</div>}
                {exams.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Class</span>
            <Select value={classId || undefined} onValueChange={setClassId} disabled={!examId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {classOptions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
                {classOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Subject (max {maxMarks})</span>
            <Select value={subjectId || undefined} onValueChange={setSubjectId} disabled={!classId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {subjects.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
                {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {ready && students.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
              <Users className="h-3.5 w-3.5" /> {summary.entered}/{summary.total} entered
            </span>
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 font-medium text-sky-700 dark:text-sky-400">Avg {summary.avg}</span>
            {summary.absentCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 font-medium text-rose-700 dark:text-rose-400">{summary.absentCount} absent</span>
            )}
            {dirty && <span className="font-medium text-amber-600 dark:text-amber-400">● Unsaved changes</span>}
          </div>
        )}
      </SectionCard>

      {/* Marks grid */}
      {!ready ? (
        <EmptyState
          title="Select exam, class and subject"
          description="Once all three are chosen, the student sheet loads with any previously entered marks."
          icon={<ClipboardEdit className="h-7 w-7" />}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : students.length === 0 ? (
        <EmptyState title="No students found" description="No students are enrolled in this class." icon={<Users className="h-7 w-7" />} />
      ) : (
        <div className="erp-scroll max-h-[32rem] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((s) => {
              const entry = entries[s.id] || { marks: '', absent: false }
              const num = Number(entry.marks)
              const invalid = entry.marks !== '' && (isNaN(num) || num < 0 || num > maxMarks)
              return (
                <Card key={s.id} className="py-0">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-9 w-9 shrink-0">
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
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={maxMarks}
                        value={entry.marks}
                        disabled={entry.absent}
                        onChange={e => setEntry(s.id, { marks: e.target.value })}
                        placeholder="—"
                        aria-label={`Marks for ${s.firstName} ${s.lastName}`}
                        className={cn('h-9 w-20 text-center text-sm', invalid && 'border-rose-500')}
                      />
                      <span className="text-xs text-muted-foreground">/{maxMarks}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                      <Checkbox
                        id={`abs-${s.id}`}
                        checked={entry.absent}
                        onCheckedChange={(v) => setEntry(s.id, { absent: v === true, marks: v ? '' : entry.marks })}
                        aria-label={`Absent for ${s.firstName} ${s.lastName}`}
                      />
                      <Label htmlFor={`abs-${s.id}`} className="text-[10px] text-muted-foreground">Absent</Label>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
