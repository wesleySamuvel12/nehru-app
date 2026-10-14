import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'
import { gradeForPercent } from '../_crud'
import { resolveTenantContext } from '@/lib/tenant'

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
 * Enforces school-level tenant isolation across exam, subject, and students.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'examinations')) return err(403, 'You do not have permission to enter marks.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolId = tenant.schoolId!

  try {
    const body = await req.json()
    const examId: string = String(body?.examId || '')
    const subjectId: string = String(body?.subjectId || '')
    const maxMarks = Number(body?.maxMarks) || 100
    const entries: MarkEntry[] = Array.isArray(body?.entries) ? body.entries : []
    if (!examId || !subjectId) return err(400, 'Exam and subject are required.')
    if (!entries.length) return err(400, 'No marks to save.')

    const exam = await db.exam.findFirst({ where: { id: examId, schoolId } })
    if (!exam) return err(400, 'Invalid exam or belongs to a different school.')

    const subject = await db.subject.findFirst({ where: { id: subjectId, schoolId } })
    if (!subject) return err(400, 'Invalid subject or belongs to a different school.')

    const studentIds = [...new Set(entries.map(e => e.studentId).filter(Boolean))]
    const students = await db.student.findMany({ where: { id: { in: studentIds }, schoolId } })
    if (students.length !== studentIds.length) {
      return err(400, 'One or more students do not belong to your school or were not found.')
    }

    let saved = 0
    for (const entry of entries) {
      if (!entry.studentId) continue
      const isAbsent = !!entry.isAbsent
      const obtained = isAbsent ? 0 : Math.min(maxMarks, Math.max(0, Number(entry.marksObtained) || 0))
      const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0
      const data = {
        schoolId,
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
      schoolId,
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'Mark',
      details: { bulk: true, examId, subjectId, saved },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { saved, examId, subjectId } })
  } catch (e) {
    console.error('[exams:marks:bulk]', e)
    return err(500, 'Could not save marks. Please check the entries and try again.')
  }
}
