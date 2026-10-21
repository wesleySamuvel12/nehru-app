'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Award, Loader2, Printer, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard, EmptyState, ErrorState, StatusBadge } from '@/components/erp/ui'
import { api, list, ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useErp } from '@/lib/store'
import { safeList, personName, parseClassIds, gradeFromPct, loadExamOptions, loadClassOptions, type Option } from './helpers'

interface ResultRow {
  studentId: string
  name: string
  admissionNo: string
  rollNo: string
  obtained: number
  totalMarks: number
  percentage: number
  grade: string
  rank: number
  perSubject: { subject: string; max: number; obtained: number; grade: string; isAbsent: boolean }[]
}

export default function ResultsTab() {
  const { session, moduleParams } = useErp()
  const isTeacher = session?.role === 'TEACHER'

  const [exams, setExams] = React.useState<Option[]>([])
  const [examRows, setExamRows] = React.useState<any[]>([])
  const [examId, setExamId] = React.useState('')
  const [classId, setClassId] = React.useState('')

  const [classes, setClasses] = React.useState<Option[]>([])
  const [gradeConfigs, setGradeConfigs] = React.useState<{ minPercent: number; grade: string }[]>([])
  const [rows, setRows] = React.useState<ResultRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [publishing, setPublishing] = React.useState(false)

  const examRow = examRows.find(e => e.id === examId)

  React.useEffect(() => {
    let alive = true
    loadExamOptions().then(opts => {
      if (!alive) return
      setExams(opts)
      if (opts.length > 0) {
        if (moduleParams?.examId && opts.some(e => e.value === moduleParams.examId)) {
          setExamId(moduleParams.examId)
        } else if (!examId) {
          setExamId(opts[0].value)
        }
      }
    })
    Promise.all([
      safeList('api/exams', { all: 1 }),
      loadClassOptions(),
      safeList('api/exams/grades', { all: 1 }),
    ]).then(([ex, cls, grades]) => {
      if (!alive) return
      setExamRows(ex)
      setClasses(cls)
      setGradeConfigs(grades.map((g: any) => ({ minPercent: Number(g.minPercent), grade: g.grade })))
    })
    return () => { alive = false }
  }, [moduleParams?.examId, examId])

  /* ── Compute live results when exam and class are selected ── */
  React.useEffect(() => {
    if (!examId || !classId) return
    let alive = true
    Promise.all([
      list('api/students', { classId, all: 1 } as any),
      list('api/exams/marks', { examId, all: 1 } as any),
      safeList('api/academics/subjects', { classId, all: 1 }),
    ]).then(([stuRes, markRes, subjectRows]) => {
      if (!alive) return
      const subjectName = new Map<string, string>(subjectRows.map((s: any) => [s.id, s.name]))

      const classStudentIds = new Set((stuRes.data || []).map((s: any) => s.id))
      const marksByStudent = new Map<string, any[]>()
      for (const m of markRes.data || []) {
        if (!classStudentIds.has(m.studentId)) continue
        const arr = marksByStudent.get(m.studentId) || []
        arr.push(m)
        marksByStudent.set(m.studentId, arr)
      }

      const computed: ResultRow[] = []
      for (const s of stuRes.data || []) {
        const marks = marksByStudent.get(s.id) || []
        if (!marks.length) continue
        const obtained = marks.reduce((a: number, m: any) => a + (Number(m.marksObtained) || 0), 0)
        const totalMarks = marks.reduce((a: number, m: any) => a + (Number(m.maxMarks) || 0), 0)
        const percentage = totalMarks > 0 ? (obtained / totalMarks) * 100 : 0
        computed.push({
          studentId: s.id,
          name: personName(s),
          admissionNo: s.admissionNo || '',
          rollNo: s.rollNo || '',
          obtained,
          totalMarks,
          percentage: Math.round(percentage * 10) / 10,
          grade: gradeFromPct(percentage, gradeConfigs),
          rank: 0,
          perSubject: marks.map((m: any) => {
            const max = Number(m.maxMarks) || 0
            const got = Number(m.marksObtained) || 0
            return {
              subject: subjectName.get(m.subjectId) || 'Subject',
              max,
              obtained: got,
              grade: m.isAbsent ? 'AB' : gradeFromPct(max > 0 ? (got / max) * 100 : 0, gradeConfigs),
              isAbsent: !!m.isAbsent,
            }
          }),
        })
      }
      computed.sort((a, b) => b.percentage - a.percentage)
      computed.forEach((r, i) => { r.rank = i + 1 })
      setRows(computed)
      setError(null)
      setLoading(false)
    }).catch(e => {
      if (!alive) return
      setError((e as ApiError).message || 'Could not compute results.')
      setRows([])
      setLoading(false)
    })
    return () => { alive = false }
  }, [examId, classId, gradeConfigs])

  const publish = async () => {
    if (!rows.length || !examId) return
    setPublishing(true)
    try {
      await api('/api/exams/report-cards/bulk', {
        method: 'POST',
        body: JSON.stringify({
          examId,
          rows: rows.map(r => ({
            studentId: r.studentId,
            totalMarks: r.totalMarks,
            obtained: r.obtained,
            percentage: r.percentage,
            grade: r.grade,
            rank: r.rank,
          })),
        }),
      })
      await api(`/api/exams/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({ resultPublished: true, status: 'PUBLISHED' }),
      })
      toast.success('Results published — report cards saved and parents notified.')
      setExamRows(prev => prev.map(e => (e.id === examId ? { ...e, resultPublished: true, status: 'PUBLISHED' } : e)))
      setExams(prev => prev.map(e => (e.value === examId ? { ...e, label: e.label.replace(/\(.*\)/, '(PUBLISHED)') } : e)))
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not publish results.')
    } finally {
      setPublishing(false)
    }
  }

  const printCard = (row: ResultRow) => {
    const subjectRows = row.perSubject
      .map(sub => `
        <tr>
          <td>${escapeHtml(sub.subject)}</td>
          <td style="text-align:center">${sub.max}</td>
          <td style="text-align:center">${sub.isAbsent ? 'AB' : sub.obtained}</td>
          <td style="text-align:center;font-weight:600">${sub.grade}</td>
        </tr>`)
      .join('')
    const result = row.percentage >= 35 ? 'PASS' : 'FAIL'
    const w = window.open('', '_blank', 'width=820,height=900')
    if (!w) {
      toast.error('Popup blocked — allow popups to print report cards.')
      return
    }
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Report Card — ${escapeHtml(row.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1c1917; padding: 24px; background: #fff; }
    .sheet { max-width: 760px; margin: 0 auto; border: 2px solid #1c1917; padding: 32px; border-radius: 8px; }
    .school { text-align: center; border-bottom: 2px solid #1c1917; padding-bottom: 12px; margin-bottom: 16px; }
    .school h1 { font-size: 22px; letter-spacing: 0.5px; }
    .school p { font-size: 12px; color: #57534e; margin-top: 2px; }
    .title { text-align: center; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; font-size: 13px; margin-bottom: 20px; padding: 12px; background: #f5f5f4; border-radius: 6px; }
    .meta b { color: #57534e; font-weight: 600; display: inline-block; width: 90px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th, td { border: 1px solid #d6d3d1; padding: 8px 12px; }
    th { background: #e7e5e4; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    tr.totals { font-weight: 700; background: #f5f5f4; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-top: 16px; border: 1px solid #1c1917; border-radius: 6px; padding: 12px; }
    .summary span { display: block; font-size: 11px; color: #57534e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .summary strong { font-size: 18px; }
    .foot { margin-top: 26px; display: flex; justify-content: space-between; font-size: 12px; color: #57534e; }
    .foot .sig { border-top: 1px solid #1c1917; padding-top: 4px; min-width: 150px; text-align: center; }
    @media print { body { padding: 0; } .sheet { border-width: 1px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="school">
      <h1>Nehru International School</h1>
      <p>Main Campus, Bandra West, Mumbai · education@nis.edu.in · +91 22 4000 1234</p>
    </div>
    <p class="title">Student Report Card</p>
    <div class="meta">
      <div><b>Student:</b> ${escapeHtml(row.name)}</div>
      <div><b>Adm. No:</b> ${escapeHtml(row.admissionNo)}</div>
      <div><b>Class:</b> ${escapeHtml(classes.find(c => c.value === classId)?.label || '—')}</div>
      <div><b>Exam:</b> ${escapeHtml(examRow?.name || '—')}</div>
      <div><b>Roll No:</b> ${escapeHtml(row.rollNo || '—')}</div>
      <div><b>Issued:</b> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
    <table>
      <thead>
        <tr><th>Subject</th><th style="text-align:center">Max Marks</th><th style="text-align:center">Obtained</th><th style="text-align:center">Grade</th></tr>
      </thead>
      <tbody>
        ${subjectRows}
        <tr class="totals">
          <td>Total</td>
          <td style="text-align:center">${row.totalMarks}</td>
          <td style="text-align:center">${row.obtained}</td>
          <td style="text-align:center">${row.grade}</td>
        </tr>
      </tbody>
    </table>
    <div class="summary">
      <div><span>Percentage</span><strong>${row.percentage}%</strong></div>
      <div><span>Grade</span><strong>${row.grade}</strong></div>
      <div><span>Rank in Class</span><strong>${row.rank}</strong></div>
      <div><span>Result</span><strong>${result}</strong></div>
    </div>
    <div class="foot">
      <div class="sig">Class Teacher</div>
      <div class="sig">Examination Cell</div>
      <div class="sig">Principal</div>
    </div>
  </div>
  <script>window.onload = function () { window.print(); }</script>
</body>
</html>`)
    w.document.close()
  }

  const examClassIds = parseClassIds(examRow?.classIds)
  const classOptions = examClassIds.length ? classes.filter(c => examClassIds.includes(c.value)) : classes
  const ready = !!(examId && classId)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Results & report cards"
        description="Results are computed live from entered marks. Review class rankings, subject breakdowns, and print student report cards."
        actions={
          isTeacher ? (
            <div className="flex items-center gap-2">
              {examRow?.resultPublished ? (
                <StatusBadge value="PUBLISHED" />
              ) : (
                <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
                  Pending Admin Publication
                </span>
              )}
            </div>
          ) : (
            <>
              {examRow?.resultPublished && <StatusBadge value="PUBLISHED" />}
              <Button size="sm" onClick={publish} disabled={!ready || !rows.length || publishing || examRow?.resultPublished}>
                {publishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                {examRow?.resultPublished ? 'Results published' : 'Publish Results'}
              </Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Exam</span>
            <Select
              value={examId || undefined}
              onValueChange={v => {
                setExamId(v)
                setClassId('')
                setLoading(true)
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
                setLoading(true)
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
        </div>
      </SectionCard>

      {!ready ? (
        <EmptyState
          title="Select exam and class"
          description="Pick an exam and class above to calculate marks totals, percentages and generate report cards."
          icon={<Award className="h-7 w-7 text-muted-foreground/60" />}
        />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <ErrorState title="Could not compute results" description={error} onRetry={() => setLoading(true)} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No marks found"
          description="No student marks have been entered for this exam and class. Head over to the Marks Entry tab to enter marks first."
          icon={<Award className="h-7 w-7 text-muted-foreground/60" />}
        />
      ) : (
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="erp-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-center">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Subjects</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentId} className="hover:bg-muted/30">
                    <TableCell className="text-center font-mono font-bold text-muted-foreground">
                      {r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : `#${r.rank}`}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.admissionNo}{r.rollNo ? ` · Roll ${r.rollNo}` : ''}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium text-muted-foreground">{r.perSubject.length} papers</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.obtained} <span className="text-xs font-normal text-muted-foreground">/ {r.totalMarks}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      <span className={r.percentage >= 35 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                        {r.percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold border',
                        r.grade === 'F' ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      )}>
                        {r.grade}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border/80" onClick={() => printCard(r)}>
                        <Printer className="mr-1 h-3.5 w-3.5 text-primary" /> Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
