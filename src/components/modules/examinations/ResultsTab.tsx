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
    loadExamOptions().then(opts => { if (alive) setExams(opts) })
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
  }, [])

  React.useEffect(() => {
    setClassId('')
  }, [examId])

  const compute = React.useCallback(async () => {
    if (!examId || !classId) return
    setLoading(true)
    setError(null)
    try {
      const [stuRes, markRes, subjectRows] = await Promise.all([
        list('api/students', { classId, all: 1 } as any),
        list('api/exams/marks', { examId, all: 1 } as any),
        safeList('api/academics/subjects', { classId, all: 1 }),
      ])
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
    } catch (e) {
      setError((e as ApiError).message || 'Could not compute results.')
    } finally {
      setLoading(false)
    }
  }, [examId, classId, gradeConfigs])
  React.useEffect(() => { compute() }, [compute])

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
    body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; padding: 32px; }
    .sheet { max-width: 720px; margin: 0 auto; border: 2px solid #1c1917; padding: 28px 32px; }
    .school { text-align: center; border-bottom: 2px solid #1c1917; padding-bottom: 14px; }
    .school h1 { font-size: 22px; letter-spacing: 1px; text-transform: uppercase; }
    .school p { font-size: 12px; color: #57534e; margin-top: 4px; }
    .title { text-align: center; margin: 16px 0; font-size: 15px; letter-spacing: 3px; text-transform: uppercase; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 24px; font-size: 13px; margin-bottom: 16px; }
    .meta b { display: inline-block; min-width: 70px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #44403c; padding: 7px 10px; }
    th { background: #f5f5f4; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals td { font-weight: 700; background: #fafaf9; }
    .summary { display: flex; gap: 14px; margin-top: 18px; font-size: 13px; }
    .summary div { flex: 1; border: 1px dashed #78716c; padding: 10px; text-align: center; }
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
      <h1>Greenwood International School</h1>
      <p>Greenwood Campus, Bandra West, Mumbai · education@greenwood.edu.in · +91 22 4000 1234</p>
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
        description="Results are computed live from entered marks. Publishing saves report cards and notifies parents."
        actions={
          <>
            {examRow?.resultPublished && <StatusBadge value="PUBLISHED" />}
            <Button size="sm" onClick={publish} disabled={!ready || !rows.length || publishing || examRow?.resultPublished}>
              {publishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {examRow?.resultPublished ? 'Results published' : 'Publish Results'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Exam</span>
            <Select value={examId || undefined} onValueChange={setExamId}>
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
        </div>
      </SectionCard>

      {!ready ? (
        <EmptyState
          title="Select an exam and class"
          description="Choose an exam and class to compute totals, grades and ranks from the entered marks."
          icon={<Award className="h-7 w-7" />}
        />
      ) : loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={compute} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No marks entered"
          description="Enter marks for this exam, class and its subjects first — results appear here automatically."
          icon={<Award className="h-7 w-7" />}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="erp-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Obtained</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Report Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.studentId}>
                    <TableCell>
                      <span className={r.rank <= 3 ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                        #{r.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.admissionNo}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.obtained}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.totalMarks}</TableCell>
                    <TableCell className="text-right font-semibold">{r.percentage}%</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        r.grade === 'F' ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}>
                        {r.grade}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => printCard(r)}>
                        <Printer className="mr-1 h-3.5 w-3.5" /> Print
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
