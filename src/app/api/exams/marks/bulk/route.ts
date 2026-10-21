import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'
import { gradeForPercent } from '../_crud'
import { resolveTenantContext } from '@/lib/tenant'
import { getTeacherExamContext } from '../../_auth'

interface MarkEntry {
  studentId: string
  marksObtained?: number | string | null
  isAbsent?: boolean
  remarks?: string
}

/**
 * POST /api/exams/marks/bulk — save marks for one exam + subject across students.
 * Body: { examId, subjectId, sectionId, maxMarks, entries: [{ studentId, marksObtained, isAbsent, remarks }] }
 * Upserts on the [examId, studentId, subjectId] unique key and auto-calculates the grade band.
 * Enforces strict teacher-to-subject row-level security and server-side marks validation:
 * - Reject negative marks and marks exceeding maxMarks.
 * - Enforce teacher authorization on subject.
 * - Guarantee 0 duplicate records.
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
    const examId: string = String(body?.examId || '').trim()
    const subjectId: string = String(body?.subjectId || '').trim()
    const sectionId: string | undefined = body?.sectionId ? String(body.sectionId).trim() : undefined
    const rawMaxMarks = Number(body?.maxMarks)
    const maxMarks = !isNaN(rawMaxMarks) && rawMaxMarks > 0 ? rawMaxMarks : 100
    const entries: MarkEntry[] = Array.isArray(body?.entries) ? body.entries : []

    if (!examId || !subjectId) return err(400, 'Exam and Subject are required.')
    if (!entries.length) return err(400, 'No student marks provided in submission.')

    // Validate Exam
    const exam = await db.exam.findFirst({ where: { id: examId, schoolId } })
    if (!exam) return err(400, 'Invalid exam or belongs to a different school.')

    // Validate Subject
    const subject = await db.subject.findFirst({ where: { id: subjectId, schoolId } })
    if (!subject) return err(400, 'Invalid subject or belongs to a different school.')

    let enteredById = session.sub
    let enteredBy = session.name

    // Enforce Teacher Authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherExamContext(session, schoolId)
      if (!teacherCtx) {
        return err(403, 'Teacher profile not found.')
      }

      const isAuthorized =
        teacherCtx.teacherSubjectIds.includes(subjectId) ||
        (sectionId && teacherCtx.teacherSectionIds.includes(sectionId))

      if (!isAuthorized) {
        return err(403, 'You are not authorized to enter marks for this subject.')
      }

      enteredById = teacherCtx.teacher.id
      enteredBy = `${teacherCtx.teacher.firstName} ${teacherCtx.teacher.lastName}`.trim()
    }

    // Validate all students belong to the school
    const studentIds = [...new Set(entries.map(e => e.studentId).filter(Boolean))]
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, schoolId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    })
    if (students.length !== studentIds.length) {
      return err(400, 'One or more students do not belong to your school, are inactive, or were not found.')
    }

    // Server-side marks validation across all entries before writing
    for (const entry of entries) {
      if (!entry.studentId) continue
      if (!entry.isAbsent && entry.marksObtained !== null && entry.marksObtained !== undefined && entry.marksObtained !== '') {
        const marks = Number(entry.marksObtained)
        if (isNaN(marks)) {
          return err(400, 'Marks must be a valid number.')
        }
        if (marks < 0) {
          return err(400, 'Marks cannot be negative.')
        }
        if (marks > maxMarks) {
          return err(400, `Marks (${marks}) cannot exceed the maximum allowed marks (${maxMarks}).`)
        }
      }
    }

    // Upsert marks
    let saved = 0
    for (const entry of entries) {
      if (!entry.studentId) continue
      const isAbsent = !!entry.isAbsent
      let obtained = 0
      if (!isAbsent && entry.marksObtained !== null && entry.marksObtained !== undefined && entry.marksObtained !== '') {
        obtained = Number(entry.marksObtained)
      }

      const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0
      const data = {
        schoolId,
        marksObtained: obtained,
        maxMarks,
        isAbsent,
        grade: isAbsent ? 'F' : gradeForPercent(pct),
        enteredById,
        enteredBy,
        remarks: entry.remarks?.trim() || null,
      }

      await db.mark.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: entry.studentId,
            subjectId,
          },
        },
        update: data,
        create: {
          examId,
          subjectId,
          studentId: entry.studentId,
          ...data,
        },
      })
      saved++
    }

    await audit({
      schoolId,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      entity: 'Mark',
      details: { bulk: true, examId, subjectId, saved },
      ip: req.headers.get('x-forwarded-for'),
    })

    return json({ data: { saved, examId, subjectId } })
  } catch (e) {
    console.error('[exams:marks:bulk]', e)
    return err(500, 'Could not save marks. Please check the entries and try again.')
  }
}
