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
import { toast } from 'sonner'
import { ApiError, list, updateOne } from '@/lib/api-client'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { Loader2, ClipboardCheck } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'E', 'F']

const columns: Column[] = [
  {
    key: 'student', label: 'Student', sortable: false,
    render: row => row.student
      ? <span className="font-medium">{row.student.name}<span className="ml-1.5 text-[11px] font-normal text-muted-foreground">({row.student.admissionNo})</span></span>
      : <span className="text-muted-foreground">Unknown student</span>,
  },
  { key: 'status', label: 'Status', badge: true },
  { key: 'submittedAt', label: 'Submitted', dateTime: true },
  {
    key: 'marks', label: 'Marks', sortable: false,
    render: row => row.marks !== null && row.marks !== undefined
      ? <span className="font-medium tabular-nums">{row.marks}{row.assignment?.maxMarks ? ` / ${row.assignment.maxMarks}` : ''}</span>
      : <span className="text-muted-foreground">Not graded</span>,
  },
  { key: 'grade', label: 'Grade', render: row => row.grade || <span className="text-muted-foreground">—</span> },
  { key: 'feedback', label: 'Feedback', render: row => row.feedback ? <span className="line-clamp-2">{row.feedback}</span> : <span className="text-muted-foreground">—</span> },
]

function GradeDialog({ submission, maxMarks, onClose, onSaved }: {
  submission: any | null
  maxMarks?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [marks, setMarks] = React.useState('')
  const [grade, setGrade] = React.useState('')
  const [feedback, setFeedback] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (submission) {
      setMarks(submission.marks ?? '')
      setGrade(submission.grade ?? '')
      setFeedback(submission.feedback ?? '')
    }
  }, [submission])

  const save = async () => {
    if (!submission) return
    const num = marks === '' ? null : Number(marks)
    if (num !== null && (isNaN(num) || num < 0)) { toast.error('Enter a valid marks value.'); return }
    if (num !== null && maxMarks && num > maxMarks) { toast.error(`Marks cannot exceed ${maxMarks}.`); return }
    setSaving(true)
    try {
      await updateOne('api/lms/submissions', submission.id, { marks: num, grade: grade || null, feedback: feedback || null })
      toast.success('Submission graded.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!submission} onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Grade submission
          </DialogTitle>
          <DialogDescription>
            {submission?.student ? `${submission.student.name}${submission.submittedAt ? ` · submitted ${fmtDateTime(submission.submittedAt)}` : ''}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade-marks">Marks {maxMarks ? <span className="text-muted-foreground">(out of {maxMarks})</span> : null}</Label>
              <Input
                id="grade-marks"
                type="number"
                min={0}
                max={maxMarks}
                value={marks}
                onChange={e => setMarks(e.target.value)}
                placeholder="e.g. 17"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grade</SelectItem>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade-feedback">Feedback</Label>
            <Textarea
              id="grade-feedback"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Comments for the student…"
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SubmissionsTab() {
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [assignmentId, setAssignmentId] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [grading, setGrading] = React.useState<any | null>(null)

  React.useEffect(() => {
    let alive = true
    list('api/lms/assignments', { all: 1, sortBy: 'dueDate', sortDir: 'desc' })
      .then(res => {
        if (!alive) return
        setAssignments(res.data || [])
        if (res.data?.length) setAssignmentId(res.data[0].id)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const selected = assignments.find(a => a.id === assignmentId) || null

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
  }

  if (!assignments.length) {
    return (
      <EmptyState
        title="No assignments yet"
        description="Create an assignment first — student submissions and grading live here."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label className="shrink-0 text-sm">Assignment</Label>
        <Select value={assignmentId} onValueChange={setAssignmentId}>
          <SelectTrigger className="w-full sm:max-w-md" aria-label="Select assignment">
            <SelectValue placeholder="Choose an assignment" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {assignments.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.title}{a.class?.name ? ` · ${a.class.name}${a.section?.name ? `-${a.section.name}` : ''}` : ''} · due {fmtDate(a.dueDate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <p className="text-sm text-muted-foreground">
          {selected.description || 'Submissions for this assignment.'}{' '}
          <span className="text-xs">Max marks: <span className="font-medium text-foreground">{selected.maxMarks}</span> · Due: {fmtDate(selected.dueDate)}</span>
        </p>
      )}

      {assignmentId && (
        <DataTable
          key={assignmentId}
          endpoint="api/lms/submissions"
          columns={columns}
          extraQuery={{ assignmentId }}
          defaultSort={{ sortBy: 'submittedAt', sortDir: 'desc' }}
          searchPlaceholder="Search submissions…"
          allowCreate={false}
          pageSizeOptions={[10, 25]}
          emptyTitle="No submissions yet"
          emptyDescription="Student submissions for this assignment will appear here."
          refreshKey={refreshKey}
          rowActions={(row) => (
            <Button
              key="grade"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setGrading(row)}
              aria-label={`Grade submission of ${row.student?.name || 'student'}`}
            >
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Grade
            </Button>
          )}
        />
      )}

      <GradeDialog
        submission={grading}
        maxMarks={selected?.maxMarks}
        onClose={() => setGrading(null)}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    </div>
  )
}
