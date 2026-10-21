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
import { useErp } from '@/lib/store'
import { safeList, parseClassIds, loadExamOptions, type Option } from './helpers'

interface EntryState { marks: string; absent: boolean }
type EntriesMap = Record<string, EntryState>

export default function MarksEntry() {
  const { moduleParams } = useErp()

  const [exams, setExams] = React.useState<Option[]>([])
  const [examRows, setExamRows] = React.useState<any[]>([])
  const [examId, setExamId] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')

  const [classes, setClasses] = React.useState<Option[]>([])
  const [allSubjects, setAllSubjects] = React.useState<any[]>([])

  const [students, setStudents] = React.useState<any[]>([])
  const [entries, setEntries] = React.useState<EntriesMap>({})
  const [maxMarks, setMaxMarks] = React.useState<number>(100)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  /* ── initial load: exams + teacher-scoped classes & subjects ── */
  React.useEffect(() => {
    let alive = true
    Promise.all([
      loadExamOptions(),
      safeList('api/exams', { all: 1 }),
      api<{ data: any }>('/api/portal/teacher/classes').catch(() => null),
      safeList('api/academics/classes', { all: 1 }),
      safeList('api/academics/subjects', { all: 1 }),
    ]).then(([examOpts, examList, teacherClassesRes, allClasses, schoolSubjects]) => {
      if (!alive) return
      setExams(examOpts)
      setExamRows(examList)

      const teacherClasses = teacherClassesRes?.data?.classes
      if (Array.isArray(teacherClasses) && teacherClasses.length > 0) {
        setClasses(teacherClasses.map((c: any) => ({ label: c.name, value: c.id })))
        const subs: any[] = []
        for (const c of teacherClasses) {
          if (Array.isArray(c.subjects)) {
            for (const sub of c.subjects) {
              subs.push({ id: sub.id, name: sub.name, code: sub.code, classId: c.id, maxMarks: sub.maxMarks })
            }
          }
        }
        setAllSubjects(subs.length ? subs : schoolSubjects)
      } else {
        setClasses(allClasses.map((c: any) => ({ label: c.name, value: c.id })))
        setAllSubjects(schoolSubjects)
      }

      if (moduleParams?.examId && examOpts.some(e => e.value === moduleParams.examId)) {
        setExamId(moduleParams.examId)
      }
    })
    return () => { alive = false }
  }, [moduleParams?.examId])

  /* ── subjects filtered for chosen class ── */
  const subjectsForClass = React.useMemo(() => {
    if (!classId) return []
    return allSubjects.filter(s => !s.classId || s.classId === classId)
  }, [allSubjects, classId])

  /* ── students + existing marks + maxMarks when exam/class/subject ready ── */
  React.useEffect(() => {
    if (!examId || !classId || !subjectId) return
    let alive = true
    Promise.all([
      list('api/students', { classId, all: 1, sortBy: 'rollNo', sortDir: 'asc' } as any),
      list('api/exams/marks', { examId, subjectId, all: 1 } as any).catch(() => ({ data: [] as any[] })),
      safeList('api/exams/schedules', { examId, subjectId, classId }),
    ]).then(([stuRes, markRes, schedRows]) => {
      if (!alive) return
      const stuRows = stuRes.data || []
      setStudents(stuRows)

      const subject = allSubjects.find((s: any) => s.id === subjectId)
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
      setLoading(false)
    }).catch(e => {
      if (!alive) return
      toast.error((e as ApiError).message || 'Could not load the marks sheet.')
      setStudents([])
      setEntries({})
      setLoading(false)
    })
    return () => { alive = false }
  }, [examId, classId, subjectId, allSubjects, refreshKey])

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

    // Client-side validation: ensure no negative marks or marks > maxMarks
    const invalid = students.find(s => {
      const e = entries[s.id]
      if (!e) return false
      if (!e.absent && e.marks !== '') {
        const num = Number(e.marks)
        return isNaN(num) || num < 0 || num > maxMarks
      }
      return false
    })

    if (invalid) {
      toast.error(`All entered marks must be valid numbers between 0 and ${maxMarks}.`)
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
              marksObtained: e.absent || e.marks === '' ? null : Number(e.marks),
              isAbsent: e.absent,
            }
          }),
        }),
      })
      toast.success(`Saved marks for ${res.data.saved} student${res.data.saved === 1 ? '' : 's'}. Grades calculated automatically.`)
      setDirty(false)
      setRefreshKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not save marks.')
    } finally {
      setSaving(false)
    }
  }

  const ready = !!(examId && classId && subjectId)

  return (
    <div className="space-y-4">
      {/* ── Selectors & Filter Header ── */}
      <SectionCard
        title="Enter marks"
        description="Select an exam, class, and authorized subject. Enter each student's score or mark them absent. Grades are calculated automatically on save."
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
            <Select
              value={examId || undefined}
              onValueChange={v => {
                setExamId(v)
                setClassId('')
                setSubjectId('')
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {exams.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No exams yet.</div>}
                {exams.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Class</span>
            <Select
              value={classId || undefined}
              onValueChange={v => {
                setClassId(v)
                setSubjectId('')
              }}
              disabled={!examId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {classOptions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
                {classOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Subject {ready ? `(Max ${maxMarks})` : ''}
            </span>
            <Select
              value={subjectId || undefined}
              onValueChange={v => {
                setSubjectId(v)
                setLoading(true)
              }}
              disabled={!classId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {subjectsForClass.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No subjects found.</div>}
                {subjectsForClass.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.code ? ` (${s.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {ready && students.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs pt-3 border-t border-border/50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
              <Users className="h-3.5 w-3.5 text-primary" /> {summary.entered}/{summary.total} entered
            </span>
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 font-medium text-sky-700 dark:text-sky-400">
              Avg {summary.avg} / {maxMarks}
            </span>
            {summary.absentCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 font-medium text-rose-700 dark:text-rose-400">
                {summary.absentCount} absent
              </span>
            )}
            {dirty && (
              <span className="font-medium text-amber-600 dark:text-amber-400 ml-auto flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
              </span>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Marks Sheet Grid ── */}
      {!ready ? (
        <EmptyState
          title="Select exam, class and subject"
          description="Choose an examination, class, and your authorized subject to load the student marks roster."
          icon={<ClipboardEdit className="h-7 w-7 text-muted-foreground/60" />}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="No students are enrolled in this class."
          icon={<Users className="h-7 w-7 text-muted-foreground/60" />}
        />
      ) : (
        <div className="erp-scroll max-h-[34rem] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((s) => {
              const entry = entries[s.id] || { marks: '', absent: false }
              const num = Number(entry.marks)
              const invalid = entry.marks !== '' && (isNaN(num) || num < 0 || num > maxMarks)
              return (
                <Card key={s.id} className="py-0 border-border/80 shadow-2xs hover:border-border transition-colors">
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(`${s.firstName} ${s.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.firstName} {s.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.admissionNo}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
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
                        className={cn('h-9 w-18 text-center text-sm tabular-nums', invalid && 'border-rose-500 focus-visible:ring-rose-500')}
                      />
                      <span className="text-xs text-muted-foreground">/{maxMarks}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1 pl-1">
                      <Checkbox
                        id={`abs-${s.id}`}
                        checked={entry.absent}
                        onCheckedChange={(v) => setEntry(s.id, { absent: v === true, marks: v ? '' : entry.marks })}
                        aria-label={`Absent for ${s.firstName} ${s.lastName}`}
                      />
                      <Label htmlFor={`abs-${s.id}`} className="text-[10px] text-muted-foreground cursor-pointer">Absent</Label>
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
