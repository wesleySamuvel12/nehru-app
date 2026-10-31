/**
 * Leave / OD / IOD Workflow Engine for Nehru ERP.
 *
 * Implements the authoritative institutional approval hierarchy for:
 * - Route A: Principal's own request (CEO & Secretary, Correspondent, Alternate Staff; CC: Head-AO, HR)
 * - Route B: Academic Coordinator (Correspondent, Principal, Alternate Staff; CC: Head-AO, HR)
 * - Route C: Headmistress (Correspondent, Principal, Academic Coordinator, Alternate Staff; CC: Head-AO, HR)
 * - Route D: Teaching Staff, Grade 9 to 12 (Principal, HOD, Academic Coordinator, Alternate Staff; No CC)
 * - Route E: Teaching Staff, KG to Grade 8 (Principal, Headmistress, Academic Coordinator, Alternate Staff; No CC)
 * - Route F: Administrative Staff (Correspondent, Principal, Admin Executive, Alternate Staff; CC: Head-AO, HR)
 *
 * Rules:
 * 1. TO = Approval Required. All designated TO authorities must approve before final approval.
 * 2. CC = For Information Only. CC recipients can never approve.
 * 3. Principal approval is mandatory for every request except the Principal's own request (Route A).
 * 4. Principal self-approval is bypassed only on Route A.
 * 5. OD and IOD requests do NOT deduct from casual leave balance.
 * 6. Approved teacher leave emails are CC'd to niskarthikeyani@nehrucolleges.com & nisadmissions@nehrucolleges.com.
 * 7. All approved Leave / OD / IOD records are forwarded to nistaffleave@nehrucolleges.com.
 */
import { db } from './db'
import { notify } from './notify'
import { audit } from './audit'
import { sendEmail } from './email'
import {
  type WorkflowStep, type WorkflowAction, type DecisionContext,
  firstToStep, currentToStep, canDecide, applyDecision,
  serializeSteps, serializeHistory, parseSteps, parseHistory, isToStep,
} from './workflow'
import { type RouteKey, ROUTE_METADATA } from './leave-constants'

export { type RouteKey, ROUTE_METADATA }

/**
 * Exact Source-Defined Approval Routes from the Institutional Specification
 */
const ROUTE_A_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'CORRESPONDENT', recipientType: 'TO', label: 'Correspondent' },
  { index: 1, approverRole: 'CEO_SECRETARY', recipientType: 'TO', label: 'CEO & Secretary' },
  { index: 2, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
  { index: 3, approverRole: 'HEAD_AO', recipientType: 'CC', label: 'Head-AO' },
  { index: 4, approverRole: 'HR', recipientType: 'CC', label: 'HR' },
]

const ROUTE_B_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  { index: 1, approverRole: 'CORRESPONDENT', recipientType: 'TO', label: 'Correspondent' },
  { index: 2, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
  { index: 3, approverRole: 'HEAD_AO', recipientType: 'CC', label: 'Head-AO' },
  { index: 4, approverRole: 'HR', recipientType: 'CC', label: 'HR' },
]

const ROUTE_C_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'ACADEMIC_COORDINATOR', recipientType: 'TO', label: 'Academic Coordinator' },
  { index: 1, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  { index: 2, approverRole: 'CORRESPONDENT', recipientType: 'TO', label: 'Correspondent' },
  { index: 3, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
  { index: 4, approverRole: 'HEAD_AO', recipientType: 'CC', label: 'Head-AO' },
  { index: 5, approverRole: 'HR', recipientType: 'CC', label: 'HR' },
]

const ROUTE_D_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'HOD', recipientType: 'TO', label: 'Head of Department' },
  { index: 1, approverRole: 'ACADEMIC_COORDINATOR', recipientType: 'TO', label: 'Academic Coordinator' },
  { index: 2, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  { index: 3, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
]

const ROUTE_E_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'HEADMISTRESS', recipientType: 'TO', label: 'Headmistress' },
  { index: 1, approverRole: 'ACADEMIC_COORDINATOR', recipientType: 'TO', label: 'Academic Coordinator' },
  { index: 2, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  { index: 3, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
]

const ROUTE_F_STEPS: WorkflowStep[] = [
  { index: 0, approverRole: 'ADMIN_EXECUTIVE', recipientType: 'TO', label: 'Admin Executive' },
  { index: 1, approverRole: 'PRINCIPAL', recipientType: 'TO', label: 'Principal' },
  { index: 2, approverRole: 'CORRESPONDENT', recipientType: 'TO', label: 'Correspondent' },
  { index: 3, approverRole: 'SUBSTITUTE', recipientType: 'TO', label: 'Alternative / Substitution Staff' },
  { index: 4, approverRole: 'HEAD_AO', recipientType: 'CC', label: 'Head-AO' },
  { index: 5, approverRole: 'HR', recipientType: 'CC', label: 'HR' },
]

export const LEAVE_ROUTES: Record<string, WorkflowStep[]> = {
  ROUTE_A: ROUTE_A_STEPS,
  ROUTE_B: ROUTE_B_STEPS,
  ROUTE_C: ROUTE_C_STEPS,
  ROUTE_D: ROUTE_D_STEPS,
  ROUTE_E: ROUTE_E_STEPS,
  ROUTE_F: ROUTE_F_STEPS,

  // Named Aliases
  ROUTE_A_PRINCIPAL: ROUTE_A_STEPS,
  ROUTE_B_COORDINATOR: ROUTE_B_STEPS,
  ROUTE_C_HEADMISTRESS: ROUTE_C_STEPS,
  ROUTE_D_TEACHING_9_12: ROUTE_D_STEPS,
  ROUTE_E_TEACHING_KG_8: ROUTE_E_STEPS,
  ROUTE_F_ADMINISTRATIVE: ROUTE_F_STEPS,

  // Legacy compatibility keys
  TEACHING_9_12: ROUTE_D_STEPS,
  TEACHING_KG_8: ROUTE_E_STEPS,
  ADMINISTRATIVE: ROUTE_F_STEPS,
  NON_TEACHING: ROUTE_F_STEPS,
}

/**
 * Determine the applicable approval route based on employee's designation, department, and role.
 */
export function selectRouteKey(employee: {
  designation?: string | null
  isTeacher?: boolean
  departmentName?: string | null
  role?: string | null
}): RouteKey {
  const d = `${employee.designation || ''} ${employee.departmentName || ''} ${employee.role || ''}`.toLowerCase()

  // Route A: Principal's own request (bypasses Principal self-approval)
  if (/(\bprincipal\b|\bpro\b)/.test(d) && !/(vice|vice-|assistant)/.test(d)) {
    return 'ROUTE_A'
  }

  // Route B: Academic Coordinator
  if (/(academic coordinator|\bcoordinator\b)/.test(d) && !/(exam|transport|admission)/.test(d)) {
    return 'ROUTE_B'
  }

  // Route C: Headmistress
  if (/(headmistress|\bhm\b)/.test(d)) {
    return 'ROUTE_C'
  }

  // Route D & E: Teaching Staff
  if (employee.isTeacher || /(teacher|faculty|lecturer|pgt|tgt|prt)/.test(d)) {
    if (/(kg|kindergarten|primary|grade\s*[1-8]\b|pre-primary|montessori|middle)/.test(d)) {
      return 'ROUTE_E'
    }
    return 'ROUTE_D'
  }

  // Route F: Administrative Staff & all other institutional personnel
  return 'ROUTE_F'
}

async function findEmployeeByKeywords(schoolId: string, keywords: string[]) {
  const employees = await db.employee.findMany({
    where: { schoolId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, designation: true, email: true },
  })
  const re = new RegExp(keywords.join('|'), 'i')
  return employees.find(e => re.test(`${e.designation || ''} ${e.firstName} ${e.lastName}`)) || null
}

async function resolveApprover(
  schoolId: string,
  approverRole: string,
  requester: any,
  substituteId?: string | null,
): Promise<{ approverId?: string; label?: string; email?: string } | null> {
  switch (approverRole) {
    case 'SUBSTITUTE': {
      if (substituteId) {
        const sub = await db.employee.findUnique({
          where: { id: substituteId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
        if (sub) return { approverId: sub.id, label: `${sub.firstName} ${sub.lastName}`, email: sub.email || undefined }
      }
      const s = await findEmployeeByKeywords(schoolId, ['substitute', 'substitution'])
      return s ? { approverId: s.id, label: `${s.firstName} ${s.lastName}`, email: s.email || undefined } : { label: 'Alternative / Substitution Staff' }
    }
    case 'PRINCIPAL': {
      const p = await findEmployeeByKeywords(schoolId, ['principal'])
      if (p) return { approverId: p.id, label: `${p.firstName} ${p.lastName}`, email: p.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'PRINCIPAL' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'HOD': {
      if (requester?.departmentId) {
        const dept = await db.department.findUnique({
          where: { id: requester.departmentId },
          select: { headId: true, headName: true },
        })
        if (dept?.headId) {
          const head = await db.employee.findUnique({
            where: { id: dept.headId },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
          if (head) return { approverId: head.id, label: `${head.firstName} ${head.lastName}`, email: head.email || undefined }
        }
        if (dept?.headName) return { label: dept.headName }
      }
      const h = await findEmployeeByKeywords(schoolId, ['head of department', 'hod'])
      if (h) return { approverId: h.id, label: `${h.firstName} ${h.lastName}`, email: h.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'HOD' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'ACADEMIC_COORDINATOR': {
      const a = await findEmployeeByKeywords(schoolId, ['academic coordinator', 'coordinator'])
      if (a) return { approverId: a.id, label: `${a.firstName} ${a.lastName}`, email: a.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'ACADEMIC_COORDINATOR' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'HEADMISTRESS': {
      const hm = await findEmployeeByKeywords(schoolId, ['headmistress', 'hm'])
      if (hm) return { approverId: hm.id, label: `${hm.firstName} ${hm.lastName}`, email: hm.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'HEADMISTRESS' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'ADMIN_EXECUTIVE': {
      const ae = await findEmployeeByKeywords(schoolId, ['admin executive', 'administrative executive'])
      if (ae) return { approverId: ae.id, label: `${ae.firstName} ${ae.lastName}`, email: ae.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'ADMIN_EXECUTIVE' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'CORRESPONDENT': {
      const c = await findEmployeeByKeywords(schoolId, ['correspondent'])
      if (c) return { approverId: c.id, label: `${c.firstName} ${c.lastName}`, email: c.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'CORRESPONDENT' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'CEO_SECRETARY': {
      const cs = await findEmployeeByKeywords(schoolId, ['ceo', 'secretary'])
      if (cs) return { approverId: cs.id, label: `${cs.firstName} ${cs.lastName}`, email: cs.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'CEO_SECRETARY' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : null
    }
    case 'HEAD_AO': {
      const hao = await findEmployeeByKeywords(schoolId, ['head ao', 'head-ao', 'administrative officer', 'head administrative officer'])
      return hao ? { approverId: hao.id, label: `${hao.firstName} ${hao.lastName}`, email: hao.email || undefined } : { label: 'Head-AO' }
    }
    case 'HR': {
      const hr = await findEmployeeByKeywords(schoolId, ['hr manager', 'hr', 'human resources'])
      if (hr) return { approverId: hr.id, label: `${hr.firstName} ${hr.lastName}`, email: hr.email || undefined }
      const u = await db.user.findFirst({ where: { schoolId, role: 'HR' }, select: { id: true, name: true, email: true, linkedEmployeeId: true } })
      return u ? { approverId: u.linkedEmployeeId || u.id, label: u.name, email: u.email } : { label: 'HR' }
    }
    default:
      return null
  }
}

/**
 * Build the complete workflow state for a submitted Leave / OD / IOD request.
 */
export async function buildWorkflowFor(
  requesterId: string,
  schoolId: string,
  options?: { substituteId?: string | null; substituteName?: string | null; requestType?: string },
) {
  let requester = await db.employee.findFirst({
    where: { id: requesterId, schoolId },
    include: { department: true },
  })

  if (!requester) {
    const u = await db.user.findFirst({ where: { id: requesterId, schoolId } })
    if (u?.linkedEmployeeId) {
      requester = await db.employee.findFirst({
        where: { id: u.linkedEmployeeId, schoolId },
        include: { department: true },
      })
    }
  }

  if (!requester) return null

  const routeKey = selectRouteKey({
    designation: requester.designation,
    isTeacher: requester.isTeacher,
    departmentName: requester.department?.name,
  })

  const templateSteps = LEAVE_ROUTES[routeKey] || LEAVE_ROUTES.ROUTE_F
  const steps: WorkflowStep[] = templateSteps.map(s => ({
    ...s,
    status: s.recipientType === 'CC' ? 'INFO' : 'PENDING',
  }))

  for (const step of steps) {
    if (step.approverRole === 'SUBSTITUTE' && options?.substituteId) {
      step.approverId = options.substituteId
      step.label = options.substituteName || 'Alternative / Substitution Staff'
      continue
    }

    const resolved = await resolveApprover(schoolId, step.approverRole, requester, options?.substituteId)
    if (resolved) {
      if (resolved.approverId) step.approverId = resolved.approverId
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
    historyJson: serializeHistory([
      { action: 'SUBMITTED', by: requesterName, at: new Date().toISOString(), stepIndex: first?.index ?? 0 },
    ]),
  }
}

async function requesterUser(record: any) {
  if (record.requesterType === 'EMPLOYEE') {
    return db.user.findFirst({ where: { linkedEmployeeId: record.requesterId }, select: { id: true, email: true } })
  }
  return db.user.findFirst({ where: { linkedStudentId: record.requesterId }, select: { id: true, email: true } })
}

function fmtRange(from: Date | string, to: Date | string): string {
  const f = new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const t = new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

async function notifyRequesterAndCcs(
  record: any,
  steps: WorkflowStep[],
  title: string,
  message: string,
  type: 'SUCCESS' | 'WARNING' | 'INFO',
) {
  const reqUser = await requesterUser(record)
  if (reqUser) await notify({ userId: reqUser.id, title, message, type, link: 'attendance' })

  // CC recipients receive information only (never approval tasks)
  for (const step of steps) {
    if (step.recipientType !== 'CC') continue
    let ccUserId: string | null = null
    if (step.approverId) {
      const u = await db.user.findFirst({
        where: { OR: [{ linkedEmployeeId: step.approverId }, { id: step.approverId }] },
        select: { id: true },
      })
      if (u) ccUserId = u.id
    }
    if (!ccUserId && step.approverRole) {
      const u = await db.user.findFirst({
        where: { schoolId: record.schoolId, role: step.approverRole },
        select: { id: true },
      })
      if (u) ccUserId = u.id
    }
    if (ccUserId) {
      await notify({ userId: ccUserId, title: `CC: ${title}`, message, type: 'INFO', link: 'attendance' })
    }
  }
}

/**
 * Dispatches approved request email summary according to the official institutional specification:
 * - Teacher requests CC: niskarthikeyani@nehrucolleges.com, nisadmissions@nehrucolleges.com
 * - Recordkeeping forward: nistaffleave@nehrucolleges.com
 * - Deduplicated by dedupeKey to avoid duplicates on retries.
 */
async function sendLeaveEmails(record: any, schoolId: string) {
  const setting = await db.schoolSetting.findFirst({ where: { schoolId } })
  const isTeacher =
    record.workflowKey === 'ROUTE_D' ||
    record.workflowKey === 'ROUTE_E' ||
    record.workflowKey === 'TEACHING_9_12' ||
    record.workflowKey === 'TEACHING_KG_8'

  // Teacher leave CC addresses
  let cc: string[] = []
  if (isTeacher) {
    const teacherCcs = setting?.leaveCcEmails || 'niskarthikeyani@nehrucolleges.com,nisadmissions@nehrucolleges.com'
    cc = teacherCcs.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  // Official recordkeeping forwarding destination
  const forward = setting?.leaveForwardEmail || 'nistaffleave@nehrucolleges.com'
  const to = [forward]

  const history = parseHistory(record.historyJson)
  const approvalTrail = history
    .filter(h => h.action === 'APPROVED')
    .map(h => `- ${h.byRole || h.by || 'Approver'}: Approved on ${new Date(h.at).toLocaleDateString('en-IN')}${h.comments ? ` (${h.comments})` : ''}`)
    .join('\n')

  const routeLabel = ROUTE_METADATA[record.workflowKey]?.label || record.workflowKey
  const subject = `Approved ${record.category || 'Leave'} — ${record.requesterName} (${fmtRange(record.fromDate, record.toDate)})`
  const body = [
    `NEHRU ERP — INSTITUTIONAL APPROVAL SUMMARY`,
    `==========================================`,
    `Requester: ${record.requesterName}`,
    `Staff Category / Route: ${routeLabel}`,
    `Request Type: ${record.category} (${record.type})`,
    `Duration: ${fmtRange(record.fromDate, record.toDate)} (${record.durationType || 'FULL_DAY'})`,
    `Reason: ${record.reason}`,
    record.substituteName ? `Alternative / Substitution Staff: ${record.substituteName}` : '',
    ``,
    `Approval Trail:`,
    approvalTrail || 'All designated TO authorities approved.',
    ``,
    `System Reference: ${record.id}`,
    `Generated At: ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n')

  await sendEmail({
    schoolId,
    to,
    cc,
    subject,
    body,
    dedupeKey: `leave-${record.id}-approved`,
  })
}

/**
 * Transactionally synchronize approved employee leave/OD dates into EmployeeAttendance.
 */
async function syncEmployeeAttendance(record: any, status: 'APPROVED' | 'CANCELLED') {
  if (record.requesterType !== 'EMPLOYEE' || !record.requesterId) return

  const startDate = new Date(record.fromDate)
  const endDate = new Date(record.toDate)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return

  const cur = new Date(startDate)
  const dates: Date[] = []
  while (cur <= endDate && dates.length < 90) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  for (const date of dates) {
    if (status === 'APPROVED') {
      const attendanceStatus = record.category === 'OD' ? 'OD' : record.category === 'IOD' ? 'IOD' : 'LEAVE'
      await db.employeeAttendance.upsert({
        where: {
          employeeId_date: {
            employeeId: record.requesterId,
            date,
          },
        },
        create: {
          schoolId: record.schoolId,
          employeeId: record.requesterId,
          date,
          status: attendanceStatus,
          remarks: `Approved ${record.category} (${record.type}) - Ref: ${record.id}`,
        },
        update: {
          status: attendanceStatus,
          remarks: `Approved ${record.category} (${record.type}) - Ref: ${record.id}`,
        },
      })
    }
  }
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

    // Revalidate and reset all TO steps to PENDING to prevent reusing invalidated approvals
    steps = steps.map(s => (isToStep(s) ? { ...s, status: 'PENDING', decidedAt: null, decidedBy: null, comments: null } : s))
    const first = firstToStep(steps)
    currentStep = first?.index ?? 0
    status = 'IN_PROGRESS'
    history = [
      ...history,
      {
        action: 'RESUBMITTED' as const,
        by: session.name,
        byRole: session.role,
        at: new Date().toISOString(),
        comments,
        stepIndex: currentStep,
      },
    ]
  } else if (action === 'WITHDRAW') {
    if (!isRequester) return { ok: false, status: 403, error: 'Only the requester can withdraw.' }
    if (!['IN_PROGRESS', 'PENDING', 'RETURNED'].includes(status)) {
      return { ok: false, status: 400, error: 'This request can no longer be withdrawn.' }
    }
    status = 'CANCELLED'
    history = [
      ...history,
      {
        action: 'WITHDRAWN' as const,
        by: session.name,
        byRole: session.role,
        at: new Date().toISOString(),
        comments,
        stepIndex: currentStep,
      },
    ]
  } else {
    // ── Approval / rejection / return (approver-only) ───────────────────────
    if (status !== 'IN_PROGRESS' && status !== 'PENDING') {
      return { ok: false, status: 400, error: `Request is already ${status.toLowerCase()}.` }
    }

    const step = currentToStep(steps, currentStep)
    const ctx: DecisionContext = {
      actorId: session.sub,
      actorEmployeeId: session.employeeId,
      actorRole: session.role,
      requesterId: record.requesterId,
      requesterUserId: reqUser?.id,
    }

    const decision = canDecide(step, ctx)
    if (!decision.ok) {
      return { ok: false, status: 403, error: decision.reason || 'You cannot act on this request.' }
    }

    const applied = applyDecision(
      steps,
      currentStep,
      action as WorkflowAction,
      comments ?? null,
      { id: session.sub, name: session.name, role: session.role },
    )

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
    // OD and IOD MUST NOT deduct from casual leave balance
    update.balanceDeducted = status === 'APPROVED' && record.category === 'LEAVE'
  } else if (status === 'IN_PROGRESS') {
    update.currentApproverRole = pending?.approverRole ?? null
    update.approverId = pending?.approverId ?? null
    update.approverName = pending?.label ?? pending?.approverRole ?? null
  } else if (status === 'CANCELLED') {
    update.withdrawnAt = new Date()
  }

  const updated: any = await db.leaveRequest.update({ where: { id: leaveId }, data: update })

  // ── Sync attendance transactionally on final approval ─────────────────────
  if (status === 'APPROVED') {
    await syncEmployeeAttendance(record, 'APPROVED')
  }

  // ── Notifications & audit ─────────────────────────────────────────────────
  const range = fmtRange(record.fromDate, record.toDate)
  const verb =
    status === 'APPROVED'
      ? 'approved'
      : status === 'REJECTED'
      ? 'rejected'
      : status === 'RETURNED'
      ? 'returned for correction'
      : status === 'CANCELLED'
      ? 'withdrawn'
      : action.toLowerCase()

  await notifyRequesterAndCcs(
    record,
    steps,
    `Leave / OD request ${verb}`,
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

  // ── Approved employee requests → CC + forward per official email instructions
  if (status === 'APPROVED' && record.requesterType === 'EMPLOYEE') {
    await sendLeaveEmails(record, (record.schoolId || session.schoolId) as string)
  }

  return { ok: true, record: updated }
}
