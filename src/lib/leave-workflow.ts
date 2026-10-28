/**
 * Leave / OD / IOD workflow service.
 *
 * Implements a configurable, source-defined approval hierarchy for the four
 * staff categories. Approvers are resolved to concrete people (employees)
 * from the school's roster by designation, so the engine works without
 * inventing new RBAC roles. Routing defaults are documented here and can be
 * overridden per school — the original institutional chart is the source of
 * truth and any unreadable arrow must be confirmed, not invented.
 */
import { db } from './db'
import { notify } from './notify'
import { audit } from './audit'
import { sendEmail } from './email'
import {
  type WorkflowStep, type WorkflowAction, type DecisionContext,
  firstToStep, currentToStep, canDecide, applyDecision,
  serializeSteps, serializeHistory, parseSteps, parseHistory,
} from './workflow'

export type RouteKey = 'TEACHING_9_12' | 'TEACHING_KG_8' | 'ADMINISTRATIVE' | 'NON_TEACHING'

/**
 * Reference routing defaults. `TO` requires approval; `CC` is information only.
 * The original institutional approval hierarchy is authoritative — verify and
 * adjust these steps against it before go-live.
 */
export const LEAVE_ROUTES: Record<RouteKey, WorkflowStep[]> = {
  TEACHING_9_12: [
    { index: 0, approverRole: 'HOD', recipientType: 'TO', label: 'Head of Department' },
    { index: 1, approverRole: 'ACADEMIC_COORDINATOR', recipientType: 'TO', label: 'Academic Coordinator' },
    { index: 2, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  ],
  TEACHING_KG_8: [
    { index: 0, approverRole: 'HEADMISTRESS', recipientType: 'TO', label: 'Headmistress' },
    { index: 1, approverRole: 'ACADEMIC_COORDINATOR', recipientType: 'TO', label: 'Academic Coordinator' },
    { index: 2, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  ],
  ADMINISTRATIVE: [
    { index: 0, approverRole: 'ADMIN_EXECUTIVE', recipientType: 'TO', label: 'Admin Executive' },
    { index: 1, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  ],
  NON_TEACHING: [
    { index: 0, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
    { index: 1, approverRole: 'CORRESPONDENT', recipientType: 'TO', label: 'Correspondent' },
    { index: 2, approverRole: 'CEO_SECRETARY', recipientType: 'TO', label: 'CEO & Secretary' },
  ],
}

export function selectRouteKey(employee: { designation?: string | null; isTeacher?: boolean; departmentName?: string | null }): RouteKey {
  const d = `${employee.designation || ''} ${employee.departmentName || ''}`.toLowerCase()
  if (/(admin executive|administrative|administration)/.test(d)) return 'ADMINISTRATIVE'
  if (employee.isTeacher) {
    if (/(kg|kindergarten|primary|grade\\s*[1-8]\\b|pre-primary|montessori)/.test(d)) return 'TEACHING_KG_8'
    return 'TEACHING_9_12'
  }
  return 'NON_TEACHING'
}

async function findEmployeeByKeywords(schoolId: string, keywords: string[]) {
  const employees = await db.employee.findMany({ where: { schoolId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, designation: true, email: true } })
  const re = new RegExp(keywords.join('|'), 'i')
  return employees.find(e => re.test(`${e.designation || ''} ${e.firstName} ${e.lastName}`)) || null
}

async function resolveApprover(schoolId: string, approverRole: string, requester: any): Promise<{ approverId?: string; label?: string; email?: string } | null> {
  switch (approverRole) {
    case 'PRINCIPAL':
      const p = await findEmployeeByKeywords(schoolId, ['principal'])
      return p ? { approverId: p.id, label: `${p.firstName} ${p.lastName}`, email: p.email || undefined } : null
    case 'HOD': {
      if (requester?.departmentId) {
        const dept = await db.department.findUnique({ where: { id: requester.departmentId }, select: { headId: true, headName: true } })
        if (dept?.headId) {
          const head = await db.employee.findUnique({ where: { id: dept.headId }, select: { id: true, firstName: true, lastName: true, email: true } })
          if (head) return { approverId: head.id, label: `${head.firstName} ${head.lastName}`, email: head.email || undefined }
        }
        if (dept?.headName) return { label: dept.headName }
      }
      const h = await findEmployeeByKeywords(schoolId, ['head of department', 'hod']); return h ? { approverId: h.id, label: h.firstName + ' ' + h.lastName, email: h.email || undefined } : null
    }
    case 'ACADEMIC_COORDINATOR':
      const a = await findEmployeeByKeywords(schoolId, ['academic coordinator']); return a ? { approverId: a.id, label: a.firstName + ' ' + a.lastName, email: a.email || undefined } : null
    case 'HEADMISTRESS':
      const hm = await findEmployeeByKeywords(schoolId, ['headmistress']); return hm ? { approverId: hm.id, label: hm.firstName + ' ' + hm.lastName, email: hm.email || undefined } : null
    case 'ADMIN_EXECUTIVE':
      const ae = await findEmployeeByKeywords(schoolId, ['admin executive']); return ae ? { approverId: ae.id, label: ae.firstName + ' ' + ae.lastName, email: ae.email || undefined } : null
    case 'CORRESPONDENT':
      const c = await findEmployeeByKeywords(schoolId, ['correspondent']); return c ? { approverId: c.id, label: c.firstName + ' ' + c.lastName, email: c.email || undefined } : null
    case 'CEO_SECRETARY':
      const cs = await findEmployeeByKeywords(schoolId, ['ceo', 'secretary']); return cs ? { approverId: cs.id, label: cs.firstName + ' ' + cs.lastName, email: cs.email || undefined } : null
    default:
      return null
  }
}

/** Build the workflow state for a submitted leave/OD/IOD request. */
export async function buildWorkflowFor(requesterId: string, schoolId: string) {
  const requester = await db.employee.findFirst({
    where: { id: requesterId, schoolId },
    include: { department: true },
  })
  if (!requester) return null

  const routeKey = selectRouteKey({ designation: requester.designation, isTeacher: requester.isTeacher, departmentName: requester.department?.name })
  const steps: WorkflowStep[] = LEAVE_ROUTES[routeKey].map(s => ({ ...s, status: s.recipientType === 'CC' ? 'INFO' : 'PENDING' }))
  for (const step of steps) {
    if (step.recipientType !== 'TO') continue
    const resolved = await resolveApprover(schoolId, step.approverRole, requester)
    if (resolved) {
      step.approverId = resolved.approverId
      if (resolved.label) step.label = resolved.label
    }
  }

  const first = firstToStep(steps)
  const requesterName = `${requester.firstName} ${requester.lastName}`
  return {
    workflowKey: routeKey,
    steps,
    stepsJson: serializeSteps(steps),
    currentStep: first?.index ?? 0,
    currentApproverRole: first?.approverRole ?? null,
    approverId: first?.approverId ?? null,
    approverName: first?.label ?? first?.approverRole ?? null,
    historyJson: serializeHistory([{ action: 'SUBMITTED' as const, by: requesterName, at: new Date().toISOString(), stepIndex: first?.index ?? 0 }]),
  }
}

async function requesterUser(record: any) {
  if (record.requesterType === 'EMPLOYEE') {
    return db.user.findFirst({ where: { linkedEmployeeId: record.requesterId }, select: { id: true } })
  }
  return db.user.findFirst({ where: { linkedStudentId: record.requesterId }, select: { id: true } })
}

function fmtRange(from: Date | string, to: Date | string): string {
  const f = new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const t = new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

async function notifyRequesterAndCcs(record: any, steps: WorkflowStep[], title: string, message: string, type: 'SUCCESS' | 'WARNING' | 'INFO') {
  const reqUser = await requesterUser(record)
  if (reqUser) await notify({ userId: reqUser.id, title, message, type, link: 'attendance' })

  // CC recipients are informed, never approvers.
  for (const step of steps) {
    if (step.recipientType !== 'CC' || !step.approverId) continue
    const ccUser = await db.user.findFirst({ where: { linkedEmployeeId: step.approverId }, select: { id: true } })
    if (ccUser) await notify({ userId: ccUser.id, title: `CC: ${title}`, message, type: 'INFO', link: 'attendance' })
  }
}

async function sendLeaveEmails(record: any, schoolId: string) {
  const setting = await db.schoolSetting.findFirst({ where: { schoolId } })
  const cc = (setting?.leaveCcEmails || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean)
  const forward = setting?.leaveForwardEmail || ''
  const to = forward ? [forward] : (setting?.leaveFromEmail ? [setting.leaveFromEmail] : [])
  if (!to.length && !cc.length) return

  const subject = `Approved leave — ${record.requesterName} (${fmtRange(record.fromDate, record.toDate)})`
  const body = [
    `Employee: ${record.requesterName}`,
    `Category: ${record.category}`,
    `Type: ${record.type}`,
    `Dates: ${fmtRange(record.fromDate, record.toDate)}`,
    `Reason: ${record.reason}`,
  ].join('\n')

  await sendEmail({
    schoolId,
    to: to.length ? to : cc[0],
    cc: cc,
    subject,
    body,
    dedupeKey: `leave-${record.id}-approved`,
  })
}

export type DecideAction = WorkflowAction | 'RESUBMIT' | 'WITHDRAW'

export type DecideOutcome =
  | { ok: true; record: any }
  | { ok: false; status: number; error: string }

export async function decideLeave(params: {
  session: any
  leaveId: string
  action: DecideAction
  comments?: string | null
  ip?: string | null
}): Promise<DecideOutcome> {
  const { session, leaveId, action, comments } = params
  const record: any = await db.leaveRequest.findUnique({ where: { id: leaveId } })
  if (!record) return { ok: false, status: 404, error: 'Leave request not found.' }

  // Tenant isolation — a user can never touch another school's request.
  if (record.schoolId && session.schoolId && record.schoolId !== session.schoolId) {
    return { ok: false, status: 404, error: 'Leave request not found.' }
  }

  let steps = parseSteps(record.stepsJson)
  let history = parseHistory(record.historyJson)
  let currentStep = Number(record.currentStep ?? 0)
  let status = record.status

  const reqUser = await requesterUser(record)
  const isRequester = session.sub === reqUser?.id || session.employeeId === record.requesterId

  // ── Resubmit / withdraw (requester-only actions) ──────────────────────────
  if (action === 'RESUBMIT') {
    if (!isRequester) return { ok: false, status: 403, error: 'Only the requester can resubmit.' }
    if (status !== 'RETURNED') return { ok: false, status: 400, error: 'Only returned requests can be resubmitted.' }
    const first = firstToStep(steps)
    currentStep = first?.index ?? 0
    status = 'IN_PROGRESS'
    history = [...history, { action: 'RESUBMITTED' as const, by: session.name, byRole: session.role, at: new Date().toISOString(), comments, stepIndex: currentStep }]
  } else if (action === 'WITHDRAW') {
    if (!isRequester) return { ok: false, status: 403, error: 'Only the requester can withdraw.' }
    if (!['IN_PROGRESS', 'PENDING', 'RETURNED'].includes(status)) return { ok: false, status: 400, error: 'This request can no longer be withdrawn.' }
    status = 'CANCELLED'
    history = [...history, { action: 'WITHDRAWN' as const, by: session.name, byRole: session.role, at: new Date().toISOString(), comments, stepIndex: currentStep }]
  } else {
    // ── Approval / rejection / return (approver-only) ───────────────────────
    if (status !== 'IN_PROGRESS' && status !== 'PENDING') return { ok: false, status: 400, error: `Request is already ${status.toLowerCase()}.` }
    const step = currentToStep(steps, currentStep)
    const ctx: DecisionContext = {
      actorId: session.sub,
      actorEmployeeId: session.employeeId,
      actorRole: session.role,
      requesterId: record.requesterId,
      requesterUserId: reqUser?.id,
    }
    const decision = canDecide(step, ctx)
    if (!decision.ok) return { ok: false, status: 403, error: decision.reason || 'You cannot act on this request.' }

    const applied = applyDecision(steps, currentStep, action as WorkflowAction, comments ?? null, { id: session.sub, name: session.name, role: session.role })
    steps = applied.steps
    currentStep = applied.currentStep
    status = applied.status
    history = [...history, ...applied.history]
  }

  const pending = currentToStep(steps, currentStep)

  const update: any = {
    stepsJson: serializeSteps(steps),
    historyJson: serializeHistory(history),
    currentStep,
    status,
    returnedReason: status === 'RETURNED' ? comments || null : record.returnedReason,
  }

  if (status === 'APPROVED' || status === 'REJECTED') {
    update.decidedAt = new Date()
    update.remarks = comments || null
    update.approverId = session.employeeId || session.sub
    update.approverName = session.name
    update.currentApproverRole = null
    update.balanceDeducted = status === 'APPROVED' && record.category === 'LEAVE'
  } else if (status === 'IN_PROGRESS') {
    update.currentApproverRole = pending?.approverRole ?? null
    update.approverId = pending?.approverId ?? null
    update.approverName = pending?.label ?? pending?.approverRole ?? null
  } else if (status === 'CANCELLED') {
    update.withdrawnAt = new Date()
  }

  const updated: any = await db.leaveRequest.update({ where: { id: leaveId }, data: update })

  // ── Notifications & audit ─────────────────────────────────────────────────
  const range = fmtRange(record.fromDate, record.toDate)
  const verb = status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : status === 'RETURNED' ? 'returned for correction' : status === 'CANCELLED' ? 'withdrawn' : action.toLowerCase()
  await notifyRequesterAndCcs(
    record, steps,
    `Leave request ${verb}`,
    `${record.requesterName}'s ${record.category.toLowerCase()} (${range}) was ${verb}${session.name ? ` by ${session.name}` : ''}.`,
    status === 'APPROVED' ? 'SUCCESS' : status === 'REJECTED' ? 'WARNING' : 'INFO',
  )

  await audit({
    schoolId: record.schoolId || session.schoolId || null,
    userId: session.sub,
    userName: session.name,
    userRole: session.role,
    action: status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : status === 'RETURNED' ? 'RETURN' : action,
    entity: 'LeaveRequest',
    entityId: leaveId,
    details: { category: record.category, action, comments },
    ip: params.ip || null,
  })

  // Approved teacher leave → CC + forward per school email settings (honest status).
  if (status === 'APPROVED' && record.category === 'LEAVE' && record.requesterType === 'EMPLOYEE') {
    await sendLeaveEmails(record, (record.schoolId || session.schoolId) as string)
  }

  return { ok: true, record: updated }
}
