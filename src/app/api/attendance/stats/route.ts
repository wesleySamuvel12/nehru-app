import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/**
 * GET /api/attendance/stats?days=30&classId=&sectionId=
 * Returns daily attendance % trend, status distribution and top absentees for analytics.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'attendance')) return err(403, 'You do not have permission to view attendance analytics.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const sp = req.nextUrl.searchParams
    const days = Math.min(90, Math.max(7, parseInt(sp.get('days') || '30')))
    const classId = sp.get('classId') || undefined
    const sectionId = sp.get('sectionId') || undefined

    const from = new Date()
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (days - 1))

    const where: any = { date: { gte: from }, ...schoolWhere }
    if (classId) where.classId = classId
    if (sectionId) where.sectionId = sectionId

    const [rows, classes, sections] = await Promise.all([
      db.attendance.findMany({
        where,
        select: { studentId: true, date: true, status: true },
        orderBy: { date: 'asc' },
        take: 25000,
      }),
      db.class.findMany({ where: schoolWhere, select: { id: true, name: true } }),
      db.section.findMany({ where: schoolWhere, select: { id: true, name: true } }),
    ])
    const classNameById = new Map(classes.map(c => [c.id, c.name]))
    const sectionNameById = new Map(sections.map(s => [s.id, s.name]))

    type DayAgg = { total: number; attended: number; counts: Record<string, number> }
    const byDay = new Map<string, DayAgg>()
    const statusTotals: Record<string, number> = {}
    const absentsByStudent = new Map<string, number>()
    const rowsByStudent = new Map<string, number>()

    let latestDay = ''
    for (const r of rows) {
      const key = dayKey(new Date(r.date))
      if (key > latestDay) latestDay = key
      const agg = byDay.get(key) || { total: 0, attended: 0, counts: {} }
      if (r.status !== 'HOLIDAY') {
        agg.total++
        if (['PRESENT', 'LATE', 'HALF_DAY', 'EXCUSED'].includes(r.status)) agg.attended++
      }
      agg.counts[r.status] = (agg.counts[r.status] || 0) + 1
      byDay.set(key, agg)
      statusTotals[r.status] = (statusTotals[r.status] || 0) + 1
      rowsByStudent.set(r.studentId, (rowsByStudent.get(r.studentId) || 0) + 1)
      if (r.status === 'ABSENT') absentsByStudent.set(r.studentId, (absentsByStudent.get(r.studentId) || 0) + 1)
    }

    const trend = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, agg]) => ({
        date,
        percent: agg.total ? Math.round((agg.attended / agg.total) * 1000) / 10 : 0,
        present: (agg.counts.PRESENT || 0) + (agg.counts.LATE || 0) + (agg.counts.HALF_DAY || 0),
        absent: agg.counts.ABSENT || 0,
        total: agg.total,
      }))

    const byStatus = Object.entries(statusTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const topIds = [...absentsByStudent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    const topStudents = topIds.length
      ? await db.student.findMany({ where: { id: { in: topIds.map(t => t[0]) }, ...schoolWhere }, select: { id: true, firstName: true, lastName: true, classId: true, sectionId: true } })
      : []
    const stName = new Map(topStudents.map(s => [s.id, s]))
    const topAbsentees = topIds.map(([studentId, absents]) => {
      const s = stName.get(studentId)
      const cls = s?.classId ? classNameById.get(s.classId) : undefined
      const sec = s?.sectionId ? sectionNameById.get(s.sectionId) : undefined
      return {
        studentId,
        name: s ? `${s.firstName} ${s.lastName}` : 'Unknown student',
        className: cls ? `${cls}${sec ? `-${sec}` : ''}` : '—',
        absents,
        totalDays: rowsByStudent.get(studentId) || 0,
      }
    })

    const avgPercent = trend.length
      ? Math.round((trend.reduce((a, t) => a + t.percent, 0) / trend.length) * 10) / 10
      : 0
    const latest = trend.find(t => t.date === latestDay)

    return json({
      data: {
        days,
        trend,
        byStatus,
        topAbsentees,
        avgPercent,
        latestDay,
        latestPercent: latest?.percent ?? 0,
        totalAbsents: [...absentsByStudent.values()].reduce((a, b) => a + b, 0),
        trackedStudents: rowsByStudent.size,
      },
    })
  } catch (e) {
    console.error('[attendance:stats]', e)
    return err(500, 'Unable to load attendance analytics right now.')
  }
}
