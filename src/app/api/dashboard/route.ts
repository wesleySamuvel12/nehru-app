import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!can(session.role, 'dashboard')) return NextResponse.json({ error: 'No permission' }, { status: 403 })

  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29); thirtyAgo.setHours(0, 0, 0, 0)

    const [
      totalStudents, activeStudents, totalStaff, pendingAdmissions,
      todayAttendance, absentToday, attendanceByStatus,
      invoiceAgg, payments, expenses, outstandingInvoices,
      studentsByClass, attendanceTrend, feeTrend, admissionByStage,
      avgMarks, hostelBeds, vehicles, transportActive, leadsTotal, recentAudit, pendingApprovals, eventsUpcoming,
    ] = await Promise.all([
      db.student.count(),
      db.student.count({ where: { status: 'ACTIVE' } }),
      db.employee.count({ where: { status: 'ACTIVE' } }),
      db.application.count({ where: { status: { in: ['SUBMITTED', 'SCREENING', 'DOC_VERIFICATION', 'TEST', 'INTERVIEW'] } } }),
      db.attendance.count({ where: { date: { gte: today }, status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] } } }),
      db.attendance.count({ where: { date: { gte: today }, status: 'ABSENT' } }),
      db.attendance.groupBy({ by: ['status'], where: { date: { gte: today } }, _count: true }),
      db.feeInvoice.aggregate({ _sum: { totalAmount: true, paidAmount: true }, _count: true }),
      db.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { status: { in: ['APPROVED', 'PAID'] } } }),
      db.feeInvoice.findMany({ where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, select: { totalAmount: true, paidAmount: true, dueDate: true, status: true } }),
      db.student.groupBy({ by: ['classId'], _count: true, where: { status: 'ACTIVE' } }),
      db.attendance.groupBy({ by: ['date', 'status'], where: { date: { gte: thirtyAgo } }, _count: true }).then((byDate) => {
        const map = new Map<string, { present: number; total: number }>()
        byDate.forEach(r => {
          const key = r.date.toISOString().slice(0, 10)
          const e = map.get(key) || { present: 0, total: 0 }
          e.total += r._count
          if (['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)) e.present += r._count
          map.set(key, e)
        })
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
          date, percent: v.total ? Math.round((v.present / v.total) * 1000) / 10 : 0,
        }))
      }),
      Promise.all([
        db.payment.findMany({ where: { status: 'SUCCESS' }, select: { amount: true, paidAt: true } }),
      ]).then(([pays]) => {
        const months = new Map<string, number>()
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          months.set(d.toISOString().slice(0, 7), 0)
        }
        pays.forEach(p => {
          const key = new Date(p.paidAt).toISOString().slice(0, 7)
          if (months.has(key)) months.set(key, (months.get(key) || 0) + p.amount)
        })
        return Array.from(months.entries()).map(([month, total]) => ({ month, total: Math.round(total) }))
      }),
      db.lead.groupBy({ by: ['stage'], _count: true }),
      db.mark.groupBy({ by: ['studentId'], _sum: { marksObtained: true, maxMarks: true } }).then((rows) => {
        let sumPct = 0, count = 0
        rows.forEach(r => {
          if (r._sum.maxMarks && r._sum.maxMarks > 0) {
            sumPct += ((r._sum.marksObtained || 0) / r._sum.maxMarks) * 100
            count++
          }
        })
        return count ? Math.round((sumPct / count) * 10) / 10 : 0
      }),
      db.bed.groupBy({ by: ['status'], _count: true }),
      db.vehicle.findMany({ select: { status: true, regNo: true, driverName: true, gpsLat: true, gpsLng: true, lastGpsAt: true, speedKmph: true } }),
      db.transportAllocation.count({ where: { status: 'ACTIVE' } }),
      db.lead.count(),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, userName: true, action: true, entity: true, details: true, createdAt: true } }),
      db.approvalTask.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, type: true, title: true, requestedBy: true, createdAt: true, approverRole: true } }),
      db.event.findMany({ where: { startDate: { gte: today } }, orderBy: { startDate: 'asc' }, take: 5, select: { id: true, title: true, startDate: true, type: true, location: true } }),
    ])

    // Class-wise student counts with class names
    const classes = await db.class.findMany({ select: { id: true, name: true, level: true }, orderBy: { level: 'asc' } })
    const classMap = new Map(classes.map(c => [c.id, c.name]))
    const population = studentsByClass.map(r => ({ name: (r.classId ? classMap.get(r.classId) : undefined) || 'Unassigned', count: r._count }))

    // Outstanding = sum(total - paid) for unpaid invoices
    const outstanding = outstandingInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0)
    const overdueCount = outstandingInvoices.filter(i => i.status === 'OVERDUE' || (i.status !== 'PAID' && new Date(i.dueDate) < today)).length

    const hostelOccupied = hostelBeds.find(b => b.status === 'OCCUPANT')?._count || hostelBeds.find(b => b.status === 'OCCUPIED')?._count || 0
    const hostelTotal = hostelBeds.reduce((s, b) => s + b._count, 0)

    return NextResponse.json({
      data: {
        kpis: {
          totalStudents, activeStudents, totalStaff, pendingAdmissions,
          presentToday: todayAttendance, absentToday,
          attendancePercent: (todayAttendance + absentToday) > 0 ? Math.round((todayAttendance / (todayAttendance + absentToday)) * 1000) / 10 : 0,
          feeBilled: invoiceAgg._sum.totalAmount || 0, feeCollected: invoiceAgg._sum.paidAmount || 0,
          feeOutstanding: Math.round(outstanding), overdueInvoices: overdueCount,
          totalPayments: payments._sum.amount || 0, totalExpenses: expenses._sum.amount || 0,
          avgAcademicScore: avgMarks,
          hostelOccupied, hostelTotal,
          transportActive, leadsTotal,
        },
        todayStatus: attendanceByStatus.map(r => ({ status: r.status, count: r._count })),
        population,
        attendanceTrend,
        feeTrend,
        admissionPipeline: ['NEW', 'CONTACTED', 'COUNSELLING', 'APPLICATION', 'TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED'].map(s => ({
          stage: s, count: admissionByStage.find(a => a.stage === s)?._count || 0,
        })),
        transport: { vehicles, activeAllocations: transportActive },
        recentActivity: recentAudit,
        pendingApprovals,
        upcomingEvents: eventsUpcoming,
      },
    })
  } catch (e) {
    console.error('[dashboard]', e)
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 })
  }
}
