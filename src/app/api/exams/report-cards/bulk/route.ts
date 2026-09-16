import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'


interface CardRow {
  studentId: string
  totalMarks: number
  obtained: number
  percentage: number
  grade: string
  rank?: number
  remarks?: string
}

/**
 * POST /api/exams/report-cards/bulk — generate/update report cards for an exam.
 * Body: { examId, rows: [{ studentId, totalMarks, obtained, percentage, grade, rank, remarks }] }
 * ReportCard has no unique key, so we match on examId+studentId and update or create.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to publish results.')
  try {
    const body = await req.json()
    const examId: string = String(body?.examId || '')
    const rows: CardRow[] = Array.isArray(body?.rows) ? body.rows : []
    if (!examId) return err(400, 'Exam is required.')
    if (!rows.length) return err(400, 'No report card rows to save.')

    const existing = await db.reportCard.findMany({ where: { examId, studentId: { in: rows.map(r => r.studentId) } } })
    const existingMap = new Map(existing.map(r => [r.studentId, r]))

    let saved = 0
    for (const row of rows) {
      if (!row.studentId) continue
      const data = {
        totalMarks: Number(row.totalMarks) || 0,
        obtained: Number(row.obtained) || 0,
        percentage: Math.round((Number(row.percentage) || 0) * 10) / 10,
        grade: row.grade || 'F',
        rank: row.rank ?? null,
        remarks: row.remarks?.trim() || null,
        published: true,
      }
      const before = existingMap.get(row.studentId)
      if (before) {
        await db.reportCard.update({ where: { id: before.id }, data })
      } else {
        await db.reportCard.create({ data: { studentId: row.studentId, examId, ...data } })
      }
      saved++
    }

    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'ReportCard',
      details: { bulk: true, examId, saved },
      ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: { saved, examId } })
  } catch (e) {
    console.error('[report-cards:bulk]', e)
    return err(500, 'Could not publish report cards. Please try again.')
  }
}
