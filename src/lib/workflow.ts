/**
 * Reusable workflow engine for Nehru ERP.
 *
 * Powers approval-driven activities (Leave, OD, IOD, expenses, …)
 * with strict TO/CC enforcement, server-side transition validation,
 * prevention of self-approval, and a tamper-evident audit history trail.
 */
import { normalizeRole } from './rbac'

export type RecipientType = 'TO' | 'CC'

export interface WorkflowStep {
  index: number
  /** Logical approver role key (e.g. PRINCIPAL, HOD, ACADEMIC_COORDINATOR, SUBSTITUTE, CORRESPONDENT, CEO_SECRETARY). */
  approverRole: string
  /** TO = approval required; CC = information only (never an approver). */
  recipientType: RecipientType
  label?: string
  /** Resolved specific person (employee/user id) if applicable. */
  approverId?: string | null
  status?: 'PENDING' | 'APPROVED' | 'INFO' | 'REJECTED' | 'RETURNED'
  decidedAt?: string | null
  decidedBy?: string | null
  comments?: string | null
}

export type WorkflowAction = 'APPROVE' | 'REJECT' | 'RETURN'

export type HistoryAction =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'RESUBMITTED'
  | 'WITHDRAWN'

export interface HistoryEntry {
  action: HistoryAction
  by?: string | null
  byRole?: string | null
  at: string
  comments?: string | null
  stepIndex?: number
}

export interface DecisionContext {
  actorId?: string | null
  actorEmployeeId?: string | null
  actorRole?: string | null
  requesterId?: string | null
  requesterUserId?: string | null
}

export interface DecisionResult {
  ok: boolean
  reason?: string
}

export function parseSteps(json?: string | null): WorkflowStep[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function serializeSteps(steps: WorkflowStep[]): string {
  return JSON.stringify(steps)
}

export function parseHistory(json?: string | null): HistoryEntry[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function serializeHistory(history: HistoryEntry[]): string {
  return JSON.stringify(history)
}

export function isToStep(s: WorkflowStep): boolean {
  return s.recipientType === 'TO'
}

export function firstToStep(steps: WorkflowStep[]): WorkflowStep | null {
  return steps.filter(isToStep).sort((a, b) => a.index - b.index)[0] || null
}

export function currentToStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null {
  return steps.find(s => isToStep(s) && s.index === currentStep) || null
}

export function nextToStep(steps: WorkflowStep[], afterIndex: number): WorkflowStep | null {
  return steps.filter(s => isToStep(s) && s.index > afterIndex && s.status !== 'APPROVED').sort((a, b) => a.index - b.index)[0] || null
}

/**
 * Server-side decision gate.
 *
 * Only designated TO approvers may act.
 * CC recipients receive information only and can never approve.
 * Self-approval is strictly prevented unless explicitly overridden by SUPER_ADMIN.
 */
export function canDecide(step: WorkflowStep | null, ctx: DecisionContext): DecisionResult {
  if (!step) return { ok: false, reason: 'No pending approval step.' }
  if (!isToStep(step)) return { ok: false, reason: 'This recipient is CC-only and cannot approve.' }

  const canonicalActor = ctx.actorRole ? normalizeRole(ctx.actorRole) : ''
  const isSuperAdmin = canonicalActor === 'SUPER_ADMIN'

  const byRole = !!ctx.actorRole && canonicalActor === normalizeRole(step.approverRole)
  const byPerson =
    !!step.approverId &&
    (step.approverId === ctx.actorId || step.approverId === ctx.actorEmployeeId)

  // Substitution staff step flexibility
  const isSubstituteStep = normalizeRole(step.approverRole) === 'SUBSTITUTE'
  const isSubstituteActor = canonicalActor === 'SUBSTITUTE' || (isSubstituteStep && byPerson)

  if (!byRole && !byPerson && !isSubstituteActor && !isSuperAdmin) {
    return { ok: false, reason: 'You are not an approver for this step.' }
  }

  // Prevent self-approval (requester approving their own request)
  const approverMatchesRequester =
    !!step.approverId &&
    (step.approverId === ctx.requesterId || step.approverId === ctx.requesterUserId)
  const actorIsRequester =
    !!ctx.actorId && !!ctx.requesterUserId && ctx.actorId === ctx.requesterUserId
  const actorEmployeeMatchesRequester =
    !!ctx.actorEmployeeId && !!ctx.requesterId && ctx.actorEmployeeId === ctx.requesterId

  if ((approverMatchesRequester || actorIsRequester || actorEmployeeMatchesRequester) && !isSuperAdmin) {
    return { ok: false, reason: 'You cannot approve your own request.' }
  }

  return { ok: true }
}

export interface AppliedDecision {
  steps: WorkflowStep[]
  currentStep: number
  status: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'RETURNED'
  history: HistoryEntry[]
}

/**
 * Apply an approval decision and return the new persisted state.
 * Pure — does not write to the database.
 */
export function applyDecision(
  steps: WorkflowStep[],
  currentStep: number,
  action: WorkflowAction,
  comments: string | null,
  actor: { id?: string | null; name?: string | null; role?: string | null },
): AppliedDecision {
  const updated: WorkflowStep[] = steps.map(s => ({ ...s }))

  if (action === 'APPROVE') {
    const cur = updated.find(s => isToStep(s) && s.index === currentStep)
    if (cur) {
      cur.status = 'APPROVED'
      cur.decidedAt = new Date().toISOString()
      cur.decidedBy = actor.name || actor.role || 'Approver'
      cur.comments = comments || null
    }

    const entry: HistoryEntry = {
      action: 'APPROVED',
      by: actor.name || actor.id || null,
      byRole: actor.role || null,
      at: new Date().toISOString(),
      comments,
      stepIndex: currentStep,
    }

    // Check if any other TO step remains pending
    const remainingTo = updated.filter(s => isToStep(s) && s.status !== 'APPROVED')
    if (remainingTo.length === 0) {
      // All mandatory TO authorities have approved!
      return { steps: updated, currentStep, status: 'APPROVED', history: [entry] }
    }

    const next = nextToStep(updated, currentStep) || remainingTo[0]
    return { steps: updated, currentStep: next.index, status: 'IN_PROGRESS', history: [entry] }
  }

  if (action === 'REJECT') {
    const cur = updated.find(s => isToStep(s) && s.index === currentStep)
    if (cur) {
      cur.status = 'REJECTED'
      cur.decidedAt = new Date().toISOString()
      cur.decidedBy = actor.name || actor.role || 'Approver'
      cur.comments = comments || null
    }
    return {
      steps: updated,
      currentStep,
      status: 'REJECTED',
      history: [{
        action: 'REJECTED',
        by: actor.name || actor.id || null,
        byRole: actor.role || null,
        at: new Date().toISOString(),
        comments,
        stepIndex: currentStep,
      }],
    }
  }

  // RETURN FOR CORRECTION
  const cur = updated.find(s => isToStep(s) && s.index === currentStep)
  if (cur) {
    cur.status = 'RETURNED'
    cur.decidedAt = new Date().toISOString()
    cur.decidedBy = actor.name || actor.role || 'Approver'
    cur.comments = comments || null
  }
  return {
    steps: updated,
    currentStep,
    status: 'RETURNED',
    history: [{
      action: 'RETURNED',
      by: actor.name || actor.id || null,
      byRole: actor.role || null,
      at: new Date().toISOString(),
      comments,
      stepIndex: currentStep,
    }],
  }
}
