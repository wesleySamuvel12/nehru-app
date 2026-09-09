import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'
import { gradeForPercent } from '../_crud'


interface MarkEntry {
  studentId: string
  marksObtained?: number | null
  isAbsent?: boolean
  remarks?: string
}

/**
 * POST /api/exams/marks/bulk — save marks for one exam + subject across students.
 * Body: { examId, subjectId, maxMarks, entries: [{ studentId, marksObtained, isAbsent }] }
 * Upserts on the [examId, studentId, subjectId] unique key and auto-calculates the grade band.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to enter marks.')
  try {
    const body = await req.json()
    const examId: string = String(body?.examId || '')
    const subjectId: string = String(body?.subjectId || '')
    const maxMarks = Number(body?.maxMarks) || 100
    const entries: MarkEntry[] = Array.isArray(body?.entries) ? body.entries : []
    if (!examId || !subjectId) return err(400, 'Exam and subject are required.')
    if (!entries.length) return err(400, 'No marks to save.')

    const studentIds = [...new Set(entries.map(e => e.studentId).filter(Boolean))]
    const existing = await db.mark.findMany({
      where: { examId, subjectId, studentId: { in: studentIds } },
    })
    const existingMap = new Map(existing.map(m => [m.studentId, m]))

    let saved = 0
    for (const entry of entries) {
      if (!entry.studentId) continue
      const isAbsent = !!entry.isAbsent
      const obtained = isAbsent ? 0 : Math.min(maxMarks, Math.max(0, Number(entry.marksObtained) || 0))
      const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0
      const data = {
        marksObtained: obtained,
        maxMarks,
        isAbsent,
        grade: gradeForPercent(pct),
        enteredById: session.sub,
        enteredBy: session.name,
        remarks: entry.remarks?.trim() || null,
      }
      await db.mark.upsert({
        where: { examId_studentId_subjectId: { examId, studentId: entry.studentId, subjectId } },
        update: data,
        create: { examId, subjectId, studentId: entry.studentId, ...data },
      })
      saved++
    }

    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'Mark',
      details: { bulk: true, examId, subjectId, maxMarks, saved },
      ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: { saved, examId, subjectId } })
  } catch (e) {
    console.error('[marks:bulk]', e)
    return err(500, 'Could not save marks. Please try again.')
  }
}
