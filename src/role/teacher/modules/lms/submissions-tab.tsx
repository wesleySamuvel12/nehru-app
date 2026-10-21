'use client'

import * as React from 'react'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { EmptyState } from '@/components/erp/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ApiError, list, updateOne } from '@/lib/api-client'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { Loader2, ClipboardCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useErp } from '@/lib/store'

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E', 'F']

const STATUS_BADGE_MAP: Record<string, string> = {
  SUBMITTED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  GRADED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  LATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PENDING: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
}

const columns: Column[] = [
  {
    key: 'student', label: 'Student', sortable: false,
    render: row => row.student
      ? (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.student.name}</span>
            <span className="text-[11px] text-muted-foreground">{row.student.admissionNo}</span>
          </div>
        )
      : <span className="text-muted-foreground">Unknown student</span>,
  },
  {
    key: 'status', label: 'Status',
    badge: true,
    badgeMap: STATUS_BADGE_MAP,
  },
  { key: 'submittedAt', label: 'Submitted', dateTime: true },
  {
    key: 'marks', label: 'Marks', sortable: false,
    render: row => row.marks !== null && row.marks !== undefined
      ? (
          <span className="font-semibold tabular-nums text-foreground">
            {row.marks}
            <span className="text-xs font-normal text-muted-foreground">
              {row.assignment?.maxMarks ? ` / ${row.assignment.maxMarks}` : ''}
            </span>
          </span>
        )
      : <span className="text-xs text-muted-foreground italic">Not graded</span>,
  },
  {
    key: 'grade', label: 'Grade',
    render: row => row.grade
      ? <Badge variant="secondary" className="font-semibold text-xs">{row.grade}</Badge>
      : <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'feedback', label: 'Feedback',
    render: row => row.feedback
      ? <span className="line-clamp-2 text-xs text-muted-foreground">{row.feedback}</span>
      : <span className="text-muted-foreground">—</span>,
  },
]

interface GradeModalProps {
  submission: Record<string, unknown>
  maxMarks?: number
  onClose: () => void
  onSaved: () => void
}

function GradeModalDialog({ submission, maxMarks, onClose, onSaved }: GradeModalProps) {
  const initialMarks = submission.marks !== null && submission.marks !== undefined ? String(submission.marks) : ''
  const initialGrade = typeof submission.grade === 'string' ? submission.grade : 'none'
  const initialFeedback = typeof submission.feedback === 'string' ? submission.feedback : ''

  const [marks, setMarks] = React.useState(initialMarks)
  const [grade, setGrade] = React.useState(initialGrade)
  const [feedback, setFeedback] = React.useState(initialFeedback)
  const [saving, setSaving] = React.useState(false)

  const student = submission.student as { name?: string; admissionNo?: string } | undefined
  const submittedAt = submission.submittedAt as string | undefined
  const subId = String(submission.id)

  const save = async () => {
    const num = marks === '' ? null : Number(marks)
    if (num !== null && (isNaN(num) || num < 0)) {
      toast.error('Please enter a valid marks value (0 or greater).')
      return
    }
    if (num !== null && maxMarks && num > maxMarks) {
      toast.error(`Marks cannot exceed the maximum allowed (${maxMarks}).`)
      return
    }
    setSaving(true)
    try {
      await updateOne('api/lms/submissions', subId, {
        marks: num,
        grade: grade === 'none' ? null : grade,
        feedback: feedback.trim() || null,
      })
      toast.success('Submission graded successfully.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not save grade.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Grade Submission
          </DialogTitle>
          <DialogDescription>
            {student?.name ? (
              <span>
                {student.name} ({student.admissionNo})
                {submittedAt ? ` · Submitted ${fmtDateTime(submittedAt)}` : ''}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade-marks">
                Marks {maxMarks ? <span className="text-xs text-muted-foreground">(Max: {maxMarks})</span> : null}
              </Label>
              <Input
                id="grade-marks"
                type="number"
                min={0}
                max={maxMarks}
                value={marks}
                onChange={e => setMarks(e.target.value)}
                placeholder={maxMarks ? `0 - ${maxMarks}` : 'e.g. 18'}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade} disabled={saving}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grade</SelectItem>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade-feedback">Teacher Feedback &amp; Remarks</Label>
            <Textarea
              id="grade-feedback"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for the student…"
              className="min-h-[90px]"
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SubmissionsTab() {
  const moduleParams = useErp(s => s.moduleParams)
  const [assignments, setAssignments] = React.useState<Record<string, any>[]>([])
  const [selectedId, setSelectedId] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [grading, setGrading] = React.useState<Record<string, unknown> | null>(null)

  const loadAssignments = React.useCallback(() => {
    let alive = true
    list('api/lms/assignments', { all: 1, sortBy: 'dueDate', sortDir: 'desc' })
      .then(res => {
        if (!alive) return
        setAssignments((res.data || []) as Record<string, any>[])
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  // Derive active assignment ID without calling setState during render/effects
  const effectiveAssignmentId = React.useMemo(() => {
    if (selectedId && assignments.some(a => a.id === selectedId)) {
      return selectedId
    }
    if (moduleParams?.assignmentId && assignments.some(a => a.id === moduleParams.assignmentId)) {
      return moduleParams.assignmentId
    }
    return assignments[0]?.id || ''
  }, [selectedId, moduleParams?.assignmentId, assignments])

  const selected = React.useMemo(() => {
    return assignments.find(a => a.id === effectiveAssignmentId) || null
  }, [assignments, effectiveAssignmentId])

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
  }

  if (!assignments.length) {
    return (
      <EmptyState
        title="No assignments yet"
        description="Create an assignment in the Assignments tab first. Student submissions and grading will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Assignment Selector & Summary Banner ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:max-w-xl">
            <Label className="shrink-0 text-sm font-semibold text-foreground">Select Assignment:</Label>
            <Select value={effectiveAssignmentId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full" aria-label="Select assignment">
                <SelectValue placeholder="Choose an assignment" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {assignments.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                    {a.class?.name ? ` · ${a.class.name}${a.section?.name ? `-${a.section.name}` : ''}` : ''}
                    {a.subject?.name ? ` · ${a.subject.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                Max Marks: <strong className="text-foreground">{selected.maxMarks ?? 20}</strong>
              </span>
              <span className="rounded-lg border bg-muted/50 px-2.5 py-1 text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due {fmtDate(selected.dueDate)}
              </span>
              {selected.stats && (
                <>
                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {selected.stats.graded} Graded
                  </span>
                  {selected.stats.pending > 0 && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {selected.stats.pending} Awaiting Grading
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {selected?.description && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
            {selected.description}
          </p>
        )}
      </div>

      {/* ── Submissions Data Table ── */}
      {effectiveAssignmentId && (
        <DataTable
          key={`${effectiveAssignmentId}-${refreshKey}`}
          endpoint="api/lms/submissions"
          columns={columns}
          extraQuery={{ assignmentId: effectiveAssignmentId }}
          defaultSort={{ sortBy: 'submittedAt', sortDir: 'desc' }}
          searchPlaceholder="Search student name or admission no…"
          allowCreate={false}
          pageSizeOptions={[10, 25, 50]}
          emptyTitle="No submissions for this assignment"
          emptyDescription="Student submissions will appear here once they complete and submit their work."
          refreshKey={refreshKey}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Submitted', value: 'SUBMITTED' },
                { label: 'Graded', value: 'GRADED' },
                { label: 'Late', value: 'LATE' },
                { label: 'Pending', value: 'PENDING' },
              ],
            },
          ]}
          rowActions={(row) => (
            <Button
              key="grade"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs font-medium border-border/80 hover:bg-muted"
              onClick={() => setGrading(row as Record<string, unknown>)}
              aria-label={`Grade submission of ${(row.student as { name?: string } | undefined)?.name || 'student'}`}
            >
              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> Grade
            </Button>
          )}
        />
      )}

      {/* ── Grade Dialog ── */}
      {grading && (
        <GradeModalDialog
          key={String(grading.id)}
          submission={grading}
          maxMarks={selected?.maxMarks}
          onClose={() => setGrading(null)}
          onSaved={() => {
            setRefreshKey(k => k + 1)
            loadAssignments()
          }}
        />
      )}
    </div>
  )
}
