import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'
import { buildWorkflowFor } from '@/lib/leave-workflow'
import type { Session } from '@/lib/auth'

const validationError = (message: string): any => Object.assign(new Error(message), { code: 'VALIDATION' })

function fmtRange(from: Date | string, to: Date | string): string {
  const f = new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const t = new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

export const leaveCrud = defineCrud({
  model: 'leaveRequest',
  module: 'attendance',
  searchFields: ['requesterName', 'reason', 'remarks'],
  filterFields: ['status', 'type', 'requesterType', 'category'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['requesterType', 'requesterId', 'requesterName', 'type', 'fromDate', 'toDate', 'reason'],
  beforeSave: async (body: any, session: Session, op: 'create' | 'update') => {
    const from = new Date(body.fromDate)
    const to = new Date(body.toDate)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw validationError('Please provide valid from and to dates.')
    }
    if (to < from) {
      throw validationError('To date cannot be earlier than From date.')
    }

    const schoolId = session.schoolId || 'main'
    const category = String(body.category || 'LEAVE').toUpperCase()
    if (!['LEAVE', 'OD', 'IOD'].includes(category)) {
      throw validationError('Invalid category. Must be LEAVE, OD, or IOD.')
    }
    body.category = category

    // Check for overlapping active requests for the same requester
    const overlapWhere: any = {
      requesterId: body.requesterId,
      schoolId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'APPROVED'] },
      fromDate: { lte: to },
      toDate: { gte: from },
    }
    if (op === 'update' && body.id) {
      overlapWhere.id = { not: body.id }
    }

    const overlap = await db.leaveRequest.findFirst({
      where: overlapWhere,
      select: { id: true, fromDate: true, toDate: true, status: true, category: true },
    })

    if (overlap) {
      throw validationError(`An active ${overlap.category || 'leave'} request already exists for these dates (${fmtRange(overlap.fromDate, overlap.toDate)}).`)
    }

    // Validate substitute employee if provided
    const subTargetId = body.substituteEmployeeId || body.substituteId
    if (subTargetId) {
      const sub = await db.employee.findFirst({
        where: { id: subTargetId, schoolId, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true },
      })
      if (!sub) {
        throw validationError('The nominated substitute employee is not valid or active in this school.')
      }
      body.substituteId = sub.id
      body.substituteName = `${sub.firstName} ${sub.lastName}`
    }

    // On creation for employees, automatically assemble the 6-tier institutional workflow
    if (op === 'create' && body.requesterType === 'EMPLOYEE') {
      const wf = await buildWorkflowFor(body.requesterId, schoolId, {
        substituteId: body.substituteId,
        substituteName: body.substituteName,
        requestType: body.category,
      })
      if (wf) {
        body.workflowKey = wf.workflowKey
        body.stepsJson = wf.stepsJson
        body.historyJson = wf.historyJson
        body.currentStep = wf.currentStep
        body.currentApproverRole = wf.currentApproverRole
        body.approverId = wf.approverId
        body.approverName = wf.approverName
        body.status = 'IN_PROGRESS'
      }
    }

    return body
  },
  scope: async (session: Session) => {
    if (session.role === 'TEACHER' && session.employeeId) {
      // Find students in teacher's homeroom sections
      const homeroomSections = await db.section.findMany({
        where: { schoolId: session.schoolId, teacherId: session.employeeId },
        select: { id: true },
      })
      const homeroomStudentIds = homeroomSections.length
        ? (await db.student.findMany({
            where: { schoolId: session.schoolId, sectionId: { in: homeroomSections.map(s => s.id) } },
            select: { id: true },
          })).map(s => s.id)
        : []

      return {
        OR: [
          { requesterId: session.employeeId },
          { substituteId: session.employeeId },
          ...(homeroomStudentIds.length ? [{ requesterType: 'STUDENT', requesterId: { in: homeroomStudentIds } }] : []),
        ],
      }
    }
    return null
  },
  afterUpdate: async (row: any, session: Session, before: any) => {
    // Notify the requester (and the student's parent) when a decision is made
    if (row.status === before.status || !['APPROVED', 'REJECTED'].includes(row.status)) return
    const approver = row.approverName || session.name
    const title = `Leave request ${row.status.toLowerCase()}`
    const message = `${row.requesterName}'s ${row.type.toLowerCase()} leave (${fmtRange(row.fromDate, row.toDate)}) was ${row.status.toLowerCase()} by ${approver}.`
    try {
      if (row.requesterType === 'EMPLOYEE') {
        const user = await db.user.findFirst({ where: { linkedEmployeeId: row.requesterId }, select: { id: true } })
        if (user) await notify({ userId: user.id, title, message, type: row.status === 'APPROVED' ? 'SUCCESS' : 'WARNING', link: 'attendance' })
      } else {
        const student = await db.student.findUnique({ where: { id: row.requesterId }, select: { parentId: true } })
        const or: any[] = [{ linkedStudentId: row.requesterId }]
        if (student?.parentId) or.push({ linkedParentId: student.parentId })
        const users = await db.user.findMany({ where: { OR: or }, select: { id: true } })
        for (const u of users) {
          await notify({ userId: u.id, title, message, type: row.status === 'APPROVED' ? 'SUCCESS' : 'INFO', link: 'attendance' })
        }
      }
    } catch (e) {
      console.error('[leave:notify]', e)
    }
  },
})
