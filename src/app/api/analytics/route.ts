import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET /api/analytics — single aggregated payload for the Analytics module. */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'analytics')) return err(403, 'You do not have permission to view analytics.')

  try {
    const sp = req.nextUrl.searchParams
    const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00`) : null
    const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59`) : null
    const classId = sp.get('classId') || null

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dayKey = (d: Date) => d.toISOString().slice(0, 10)
    const lastMonths = (n: number) => {
      const keys: string[] = []
      const now = new Date()
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        keys.push(monthKey(d))
      }
      return keys
    }
    const months6 = lastMonths(6)

    /* ── Fetch everything in parallel (small dataset → reduce in JS) ── */
    const [
      classes, students, subjects, gradeConfigs, exams, marks,
      attendanceRows, employeeAtt, payslipRows, perfReviews,
      payments, expenses, invoices, leads, applications,
      employees, payrollRuns,
    ] = await Promise.all([
      db.class.findMany({ orderBy: { level: 'asc' } }),
      db.student.findMany({ where: { status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, classId: true } }),
      db.subject.findMany({ select: { id: true, name: true, classId: true } }),
      db.gradeConfig.findMany({ orderBy: { minPercent: 'desc' } }),
      db.exam.findMany({ select: { id: true, name: true, status: true, resultPublished: true } }),
      db.mark.findMany({ select: { examId: true, studentId: true, subjectId: true, marksObtained: true, maxMarks: true, isAbsent: true } }),
      db.attendance.findMany({
        where: {
          ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        },
        select: { studentId: true, classId: true, date: true, status: true },
      }),
      db.employeeAttendance.findMany({
        where: { date: { gte: new Date(Date.now() - 30 * 86400000) } },
        select: { status: true },
      }),
      db.payslip.findMany({ select: { payrollRunId: true, netPay: true } }).catch(() => null),
      db.performanceReview.findMany({ where: { score: { not: null } }, select: { score: true } }),
      db.payment.findMany({ where: { status: 'SUCCESS' }, select: { amount: true, paidAt: true } }),
      db.expense.findMany({ where: { status: { in: ['APPROVED', 'PAID'] } }, select: { amount: true, date: true } }),
      db.feeInvoice.groupBy({ by: ['status'], _sum: { totalAmount: true, paidAmount: true, discount: true }, _count: true }),
      db.lead.groupBy({ by: ['stage'], _count: true }),
      db.application.findMany({ select: { createdAt: true } }),
      db.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }),
      db.payrollRun.findMany({ select: { month: true, year: true, totalAmount: true, status: true } }),
    ])

    const classNameOf = new Map(classes.map((c: any) => [c.id, c.name]))
    const subjectNameOf = new Map(subjects.map((s: any) => [s.id, s.name]))
    const publishedExamIds = new Set(exams.filter((e: any) => e.resultPublished || e.status === 'PUBLISHED').map((e: any) => e.id))
    const studentsByClass = new Map<string, Set<string>>()
    students.forEach((s: any) => {
      if (!s.classId) return
      if (!studentsByClass.has(s.classId)) studentsByClass.set(s.classId, new Set())
      studentsByClass.get(s.classId)!.add(s.id)
    })
    const classScope = (studentId: string) => {
      if (!classId) return true
      return studentsByClass.get(classId)?.has(studentId) || false
    }
    const nameOf = (s: any) => `${s.firstName} ${s.lastName}`

    /* ── ACADEMIC ── */
    // Per-student totals from published marks
    const byStudent = new Map<string, { got: number; max: number }>()
    const bySubject = new Map<string, { got: number; max: number }>()
    marks.forEach((m: any) => {
      if (!publishedExamIds.has(m.examId) || m.isAbsent || !m.maxMarks) return
      const s = byStudent.get(m.studentId) || { got: 0, max: 0 }
      s.got += m.marksObtained; s.max += m.maxMarks; byStudent.set(m.studentId, s)
      const sub = bySubject.get(m.subjectId) || { got: 0, max: 0 }
      sub.got += m.marksObtained; sub.max += m.maxMarks; bySubject.set(m.subjectId, sub)
    })

    const studentPct = new Map<string, number>()
    byStudent.forEach((v, sid) => { if (v.max > 0) studentPct.set(sid, Math.round((v.got / v.max) * 1000) / 10) })

    const classPerformance = (classId ? classes.filter((c: any) => c.id === classId) : classes)
      .map((c: any) => {
        const ids = studentsByClass.get(c.id) || new Set<string>()
        const pcts = [...ids].map(id => studentPct.get(id)).filter((v): v is number => v !== undefined)
        return { name: c.name, avgPct: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : 0 }
      })

    const subjectPerformance = [...bySubject.entries()]
      .map(([sid, v]) => ({ name: subjectNameOf.get(sid) || 'Subject', avgPct: Math.round((v.got / v.max) * 1000) / 10 }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const attendanceByClass = (classId ? classes.filter((c: any) => c.id === classId) : classes)
      .map((c: any) => {
        const rows = attendanceRows.filter((r: any) => r.classId === c.id && r.status !== 'HOLIDAY')
        if (!rows.length) return { name: c.name, pct: 0 }
        const presentish = rows.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length
        return { name: c.name, pct: Math.round((presentish / rows.length) * 1000) / 10 }
      })

    // Daily attendance trend (last 30 marked days)
    const byDay = new Map<string, { present: number; total: number }>()
    attendanceRows.forEach((r: any) => {
      if (r.status === 'HOLIDAY') return
      const k = dayKey(new Date(r.date))
      const d = byDay.get(k) || { present: 0, total: 0 }
      d.total++
      if (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY') d.present++
      byDay.set(k, d)
    })
    const attendanceTrend = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, v]) => ({ date, pct: Math.round((v.present / v.total) * 1000) / 10 }))

    // Grade distribution (map student avg → grade band)
    const seenGrades = new Set<string>()
    const gradeDistribution: { grade: string; count: number }[] = []
    gradeConfigs.forEach((g: any) => {
      if (seenGrades.has(g.grade)) return
      seenGrades.add(g.grade)
      gradeDistribution.push({ grade: g.grade, count: 0 })
    })
    studentPct.forEach((pct, sid) => {
      if (!classScope(sid)) return
      const band = gradeConfigs.find((g: any) => pct >= g.minPercent && pct <= g.maxPercent)
      const entry = gradeDistribution.find(g => g.grade === (band?.grade || 'F'))
      if (entry) entry.count++
    })

    // Top / low performers
    const performerRows = students
      .filter((s: any) => studentPct.has(s.id) && classScope(s.id))
      .map((s: any) => ({ name: nameOf(s), className: classNameOf.get(s.classId) || '—', pct: studentPct.get(s.id)! }))
      .sort((a, b) => b.pct - a.pct)
    const topPerformers = performerRows.slice(0, 5)
    const lowPerformers = performerRows.slice(-5).reverse()

    /* ── FINANCE ── */
    const collectionByMonth = new Map<string, number>(months6.map(m => [m, 0]))
    payments.forEach((p: any) => {
      const k = monthKey(new Date(p.paidAt))
      if (collectionByMonth.has(k)) collectionByMonth.set(k, (collectionByMonth.get(k) || 0) + p.amount)
    })
    const expenseByMonth = new Map<string, number>(months6.map(m => [m, 0]))
    expenses.forEach((e: any) => {
      const k = monthKey(new Date(e.date))
      if (expenseByMonth.has(k)) expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + e.amount)
    })
    const monthly = months6.map(m => ({ month: m, collection: Math.round(collectionByMonth.get(m) || 0), expense: Math.round(expenseByMonth.get(m) || 0) }))

    const outstandingByStatus = invoices
      .filter((g: any) => g.status !== 'PAID' && g.status !== 'CANCELLED')
      .map((g: any) => ({
        status: g.status,
        amount: Math.max(0, Math.round((g._sum.totalAmount || 0) - (g._sum.paidAmount || 0) - (g._sum.discount || 0))),
      })).filter((g: any) => g.amount > 0)
    const collected = Math.round(payments.reduce((a: number, p: any) => a + p.amount, 0))
    const expenseTotal = Math.round(expenses.reduce((a: number, e: any) => a + e.amount, 0))
    const outstanding = Math.round(outstandingByStatus.reduce((a: number, s: any) => a + s.amount, 0))
    const pendingInvoices = invoices.filter((g: any) => g.status !== 'PAID' && g.status !== 'CANCELLED').reduce((a: number, g: any) => a + g._count, 0)

    /* ── HR ── */
    const empAttTotal = employeeAtt.length
    const empAttPresent = employeeAtt.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length
    const staffAttendancePct = empAttTotal ? Math.round((empAttPresent / empAttTotal) * 1000) / 10 : 0

    const payrollTrend = (() => {
      if (payslipRows && payslipRows.length) {
        const runMeta = new Map(payrollRuns.map((r: any) => [r.id, r]))
        const byRun = new Map<string, number>()
        payslipRows.forEach((ps: any) => {
          const run = runMeta.get(ps.payrollRunId)
          if (!run) return
          const k = `${run.year}-${String(run.month).padStart(2, '0')}`
          byRun.set(k, (byRun.get(k) || 0) + (ps.netPay || 0))
        })
        return [...byRun.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
          .map(([month, netPay]) => ({ month, netPay: Math.round(netPay) }))
      }
      return payrollRuns
        .filter((r: any) => r.status !== 'DRAFT')
        .map((r: any) => ({ month: `${r.year}-${String(r.month).padStart(2, '0')}`, netPay: Math.round(r.totalAmount) }))
        .sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
    })()

    const performanceAvg = perfReviews.length
      ? Math.round((perfReviews.reduce((a: number, r: any) => a + (r.score || 0), 0) / perfReviews.length) * 10) / 10
      : 0

    /* ── ADMISSIONS ── */
    const STAGE_ORDER = ['NEW', 'CONTACTED', 'COUNSELLING', 'APPLICATION', 'TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED', 'LOST']
    const leadStageCounts = new Map(leads.map((l: any) => [l.stage, l._count]))
    const funnel = STAGE_ORDER
      .filter(s => leadStageCounts.has(s))
      .map(s => ({ stage: s, count: leadStageCounts.get(s) || 0 }))
      .concat(leads.filter((l: any) => !STAGE_ORDER.includes(l.stage)).map((l: any) => ({ stage: l.stage, count: l._count })))

    const leadSources = await db.lead.groupBy({ by: ['source'], _count: true })
    const sourceSplit = leadSources.map((l: any) => ({ source: l.source, count: l._count }))

    const appsByMonth = new Map<string, number>(months6.map(m => [m, 0]))
    applications.forEach((a: any) => {
      const k = monthKey(new Date(a.createdAt))
      if (appsByMonth.has(k)) appsByMonth.set(k, (appsByMonth.get(k) || 0) + 1)
    })
    const monthlyApplications = months6.map(m => ({ month: m, count: appsByMonth.get(m) || 0 }))
    const totalLeads = leads.reduce((a: number, l: any) => a + l._count, 0)
    const enrolled = leadStageCounts.get('ENROLLED') || 0
    const conversionPct = totalLeads ? Math.round((enrolled / totalLeads) * 100) : 0

    /* ── KPIs ── */
    const kpiAttRows = attendanceRows.filter((r: any) => r.status !== 'HOLIDAY' && (!classId || classScope(r.studentId)))
    const kpiAttPresent = kpiAttRows.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length
    const kpiAttendancePct = kpiAttRows.length ? Math.round((kpiAttPresent / kpiAttRows.length) * 1000) / 10 : 0
    const scopedPcts = [...studentPct.entries()].filter(([sid]) => classScope(sid)).map(([, v]) => v)
    const avgScorePct = scopedPcts.length ? Math.round((scopedPcts.reduce((a, b) => a + b, 0) / scopedPcts.length) * 10) / 10 : 0

    return json({
      academic: { classPerformance, subjectPerformance, attendanceByClass, attendanceTrend, gradeDistribution, topPerformers, lowPerformers },
      finance: { monthly, outstandingByStatus, totals: { collected, expense: expenseTotal, outstanding, pendingInvoices } },
      hr: { staffAttendancePct, payrollTrend, performanceAvg, headcount: employees.length, reviewsCount: perfReviews.length },
      admissions: { funnel, sourceSplit, monthlyApplications, conversionPct, totalLeads },
      kpis: {
        students: students.length,
        staff: employees.length,
        attendancePct: kpiAttendancePct,
        avgScorePct,
        collected,
        outstanding,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[analytics]', e)
    return err(500, 'Unable to compute analytics right now. Please try again.')
  }
}
