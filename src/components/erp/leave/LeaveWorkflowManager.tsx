'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  CalendarDays, CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle,
  FileText, Send, UserCheck, ShieldAlert, ArrowRight, Check, X, Info,
  Filter, Plus, RefreshCw, Eye, MessageSquare, Paperclip, ChevronRight
} from 'lucide-react'
import { useErp } from '@/lib/store'
import { api, ApiError } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ROUTE_METADATA, type RouteKey } from '@/lib/leave-constants'

export interface LeaveRequestItem {
  id: string
  schoolId?: string
  requesterType: string
  requesterId: string
  requesterName: string
  category: 'LEAVE' | 'OD' | 'IOD'
  type: string
  durationType: 'FULL_DAY' | 'HALF_DAY'
  halfDayPart?: string
  fromDate: string
  toDate: string
  reason: string
  substituteId?: string
  substituteName?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED'
  currentStep: number
  currentApproverRole?: string
  approverId?: string
  approverName?: string
  returnedReason?: string
  remarks?: string
  decidedAt?: string
  withdrawnAt?: string
  balanceDeducted: boolean
  workflowKey?: string
  stepsJson?: string
  historyJson?: string
  createdAt: string
}

const CATEGORY_OPTIONS = [
  { value: 'LEAVE', label: 'Leave', desc: 'Personal, Casual, Medical or Emergency absence' },
  { value: 'OD', label: 'On-Duty (OD)', desc: 'Official school duty, competitions, university duty (Preserves leave balance)' },
  { value: 'IOD', label: 'Internal On-Duty (IOD)', desc: 'Campus event duty, exam cell, evaluation (Preserves leave balance)' },
]

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'SICK', label: 'Sick / Medical Leave' },
  { value: 'PRIVILEGE', label: 'Privilege / Earned Leave' },
  { value: 'MATERNITY', label: 'Maternity / Paternity Leave' },
  { value: 'EMERGENCY', label: 'Emergency Leave' },
  { value: 'OTHER', label: 'Other Leave' },
]

export default function LeaveWorkflowManager() {
  const session = useErp(s => s.session)
  const [activeTab, setActiveTab] = React.useState<'MY_REQUESTS' | 'PENDING_APPROVALS' | 'ALL_REQUESTS'>('MY_REQUESTS')
  const [requests, setRequests] = React.useState<LeaveRequestItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [employees, setEmployees] = React.useState<{ id: string; name: string; designation?: string }[]>([])

  // Modal Dialog states
  const [applyModalOpen, setApplyModalOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [selectedReq, setSelectedReq] = React.useState<LeaveRequestItem | null>(null)
  const [decisionAction, setDecisionAction] = React.useState<'APPROVE' | 'REJECT' | 'RETURN' | null>(null)
  const [decisionComments, setDecisionComments] = React.useState('')
  const [deciding, setDeciding] = React.useState(false)

  // Resubmit modal
  const [resubmitModalOpen, setResubmitModalOpen] = React.useState(false)
  const [resubmitTarget, setResubmitTarget] = React.useState<LeaveRequestItem | null>(null)
  const [resubmitComments, setResubmitComments] = React.useState('')

  // Form state
  const [formData, setFormData] = React.useState({
    category: 'LEAVE' as 'LEAVE' | 'OD' | 'IOD',
    type: 'CASUAL',
    durationType: 'FULL_DAY' as 'FULL_DAY' | 'HALF_DAY',
    halfDayPart: 'FIRST_HALF',
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: '',
    substituteEmployeeId: '',
  })

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [leaveRes, empRes] = await Promise.all([
        api<{ data: LeaveRequestItem[] }>('/api/attendance/leave?all=1').catch(() => ({ data: [] })),
        api<{ data: any[] }>('/api/employees?all=1').catch(() => ({ data: [] })),
      ])
      setRequests(leaveRes.data || [])
      setEmployees((empRes.data || []).map((e: any) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        designation: e.designation,
      })))
    } catch (e) {
      console.error('[leave load error]', e)
      toast.error('Failed to load leave records')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Filter requests
  const myRequests = requests.filter(r =>
    r.requesterId === session?.employeeId ||
    r.requesterId === session?.sub ||
    (session?.name && r.requesterName.toLowerCase().includes(session.name.toLowerCase()))
  )

  const pendingApprovals = requests.filter(r => {
    if (r.status !== 'IN_PROGRESS' && r.status !== 'PENDING') return false
    const parsedSteps = r.stepsJson ? JSON.parse(r.stepsJson) : []
    const currentStepObj = parsedSteps.find((s: any) => s.recipientType === 'TO' && s.index === r.currentStep)
    if (!currentStepObj) return false

    const matchesRole = currentStepObj.approverRole === session?.role
    const matchesId = currentStepObj.approverId === session?.employeeId || currentStepObj.approverId === session?.sub
    const isSuperAdmin = session?.role === 'SUPER_ADMIN'
    const isSubstituteStep = currentStepObj.approverRole === 'SUBSTITUTE' && (session?.role === 'SUBSTITUTE' || r.substituteId === session?.employeeId)

    return matchesRole || matchesId || isSuperAdmin || isSubstituteStep
  })

  // Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.reason.trim()) {
      toast.error('Please enter a reason for the request.')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        requesterType: 'EMPLOYEE',
        requesterId: session?.employeeId || session?.sub,
        requesterName: session?.name || 'Staff Member',
        category: formData.category,
        type: formData.category === 'LEAVE' ? formData.type : formData.category,
        durationType: formData.durationType,
        halfDayPart: formData.durationType === 'HALF_DAY' ? formData.halfDayPart : null,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason,
      }

      if (formData.substituteEmployeeId) {
        payload.substituteEmployeeId = formData.substituteEmployeeId
      }

      await api('/api/attendance/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      toast.success(`${formData.category} request submitted successfully and routed for institutional approval.`)
      setApplyModalOpen(false)
      setFormData({
        category: 'LEAVE',
        type: 'CASUAL',
        durationType: 'FULL_DAY',
        halfDayPart: 'FIRST_HALF',
        fromDate: new Date().toISOString().slice(0, 10),
        toDate: new Date().toISOString().slice(0, 10),
        reason: '',
        substituteEmployeeId: '',
      })
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit leave application.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Approver Action (Approve, Reject, Return)
  const handleConfirmDecision = async () => {
    if (!selectedReq || !decisionAction) return
    if ((decisionAction === 'REJECT' || decisionAction === 'RETURN') && !decisionComments.trim()) {
      toast.error(`Please provide a reason when ${decisionAction.toLowerCase()}ing a request.`)
      return
    }

    setDeciding(true)
    try {
      await api(`/api/attendance/leave/${selectedReq.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decisionAction,
          comments: decisionComments.trim() || undefined,
        }),
      })

      toast.success(`Request ${decisionAction === 'APPROVE' ? 'approved' : decisionAction === 'REJECT' ? 'rejected' : 'returned for correction'}.`)
      setSelectedReq(null)
      setDecisionAction(null)
      setDecisionComments('')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setDeciding(false)
    }
  }

  // Handle Resubmit
  const handleConfirmResubmit = async () => {
    if (!resubmitTarget) return
    setDeciding(true)
    try {
      await api(`/api/attendance/leave/${resubmitTarget.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESUBMIT',
          comments: resubmitComments.trim() || 'Corrected and resubmitted by requester.',
        }),
      })

      toast.success('Request resubmitted successfully for approval.')
      setResubmitModalOpen(false)
      setResubmitTarget(null)
      setResubmitComments('')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to resubmit request')
    } finally {
      setDeciding(false)
    }
  }

  // Handle Withdraw
  const handleWithdraw = async (req: LeaveRequestItem) => {
    if (!confirm('Are you sure you want to cancel and withdraw this request?')) return
    try {
      await api(`/api/attendance/leave/${req.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WITHDRAW',
          comments: 'Withdrawn by requester.',
        }),
      })
      toast.success('Request withdrawn successfully.')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw request')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Institutional Leave, OD & IOD Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Strict 6-Route Source Governance Hierarchy • Verified TO Approvals & CC Intimations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setApplyModalOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Apply Leave / OD
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'MY_REQUESTS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <UserCheck className="h-4 w-4" /> My Applications ({myRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('PENDING_APPROVALS')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'PENDING_APPROVALS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Clock className="h-4 w-4" /> Pending Approvals ({pendingApprovals.length})
          {pendingApprovals.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        {['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'ACADEMIC_COORDINATOR'].includes(session?.role || '') && (
          <button
            onClick={() => setActiveTab('ALL_REQUESTS')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'ALL_REQUESTS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <ShieldAlert className="h-4 w-4" /> Institutional Register ({requests.length})
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading institutional approval workflows...</p>
        </div>
      ) : activeTab === 'MY_REQUESTS' ? (
        myRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <CalendarDays className="h-10 w-10 text-muted-foreground/60 mx-auto" />
              <div className="text-base font-semibold">No Leave or OD requests found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You haven&apos;t submitted any leave, on-duty, or internal on-duty applications yet.
              </p>
              <Button size="sm" onClick={() => setApplyModalOpen(true)} className="mt-2">
                Apply for First Leave
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myRequests.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                isRequester={true}
                onResubmit={() => {
                  setResubmitTarget(req)
                  setResubmitModalOpen(true)
                }}
                onWithdraw={() => handleWithdraw(req)}
              />
            ))}
          </div>
        )
      ) : activeTab === 'PENDING_APPROVALS' ? (
        pendingApprovals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/70 mx-auto" />
              <div className="text-base font-semibold">All Pending Approvals Cleared</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You have no leave or OD requests currently awaiting your action.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingApprovals.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                isApprover={true}
                onApprove={() => {
                  setSelectedReq(req)
                  setDecisionAction('APPROVE')
                  setDecisionComments('')
                }}
                onReject={() => {
                  setSelectedReq(req)
                  setDecisionAction('REJECT')
                  setDecisionComments('')
                }}
                onReturn={() => {
                  setSelectedReq(req)
                  setDecisionAction('RETURN')
                  setDecisionComments('')
                }}
              />
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}

      {/* ── Dialog: Apply Leave / OD / IOD ─────────────────────────────────── */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Apply for Leave / On-Duty (OD)
            </DialogTitle>
            <DialogDescription>
              Submit an institutional absence request. Your application will automatically follow the official 6-Route hierarchy.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitApplication} className="space-y-4 py-2">
            {/* Request Category */}
            <div className="space-y-2">
              <Label className="font-semibold text-xs text-muted-foreground uppercase">Request Category</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, category: c.value as any }))}
                    className={`p-3 text-left rounded-lg border text-xs font-medium transition-all ${
                      formData.category === c.value
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-muted hover:border-foreground/30 text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Leave Type if Category is LEAVE */}
            {formData.category === 'LEAVE' && (
              <div className="space-y-1.5">
                <Label htmlFor="leaveType">Leave Type</Label>
                <select
                  id="leaveType"
                  className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                  value={formData.type}
                  onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                >
                  {LEAVE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="durationType">Duration</Label>
                <select
                  id="durationType"
                  className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                  value={formData.durationType}
                  onChange={e => setFormData(f => ({ ...f, durationType: e.target.value as any }))}
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              {formData.durationType === 'HALF_DAY' && (
                <div className="space-y-1.5">
                  <Label htmlFor="halfDayPart">Half Day Timing</Label>
                  <select
                    id="halfDayPart"
                    className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                    value={formData.halfDayPart}
                    onChange={e => setFormData(f => ({ ...f, halfDayPart: e.target.value }))}
                  >
                    <option value="FIRST_HALF">First Half (Morning Session)</option>
                    <option value="SECOND_HALF">Second Half (Afternoon Session)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={formData.fromDate}
                  onChange={e => setFormData(f => ({ ...f, fromDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={formData.toDate}
                  onChange={e => setFormData(f => ({ ...f, toDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Nominate Alternative / Substitution Staff */}
            <div className="space-y-1.5">
              <Label htmlFor="substituteStaff" className="flex items-center justify-between">
                <span>Alternative / Substitution Staff</span>
                <span className="text-[11px] text-muted-foreground font-normal">Mandatory TO Approver</span>
              </Label>
              <select
                id="substituteStaff"
                className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                value={formData.substituteEmployeeId}
                onChange={e => setFormData(f => ({ ...f, substituteEmployeeId: e.target.value }))}
              >
                <option value="">-- Select Alternate Staff Colleague --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.designation ? `(${emp.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">Detailed Reason</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Provide complete context, event title or medical reason..."
                value={formData.reason}
                onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Approver Decision Modal ───────────────────────────────── */}
      <Dialog open={!!decisionAction} onOpenChange={open => { if (!open) setDecisionAction(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionAction === 'APPROVE' && <Check className="h-5 w-5 text-emerald-600" />}
              {decisionAction === 'REJECT' && <X className="h-5 w-5 text-rose-600" />}
              {decisionAction === 'RETURN' && <RotateCcw className="h-5 w-5 text-amber-600" />}
              Confirm Decision: {decisionAction}
            </DialogTitle>
            <DialogDescription>
              {decisionAction === 'APPROVE'
                ? `Authorize request for ${selectedReq?.requesterName}. It will advance to the next authority or complete final approval.`
                : decisionAction === 'REJECT'
                ? `Reject request for ${selectedReq?.requesterName}. This terminates the workflow.`
                : `Return request to ${selectedReq?.requesterName} for correction and resubmission.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
              <div><span className="font-semibold">Requester:</span> {selectedReq?.requesterName}</div>
              <div><span className="font-semibold">Type:</span> {selectedReq?.category} ({selectedReq?.type})</div>
              <div><span className="font-semibold">Dates:</span> {selectedReq && fmtDate(selectedReq.fromDate)} – {selectedReq && fmtDate(selectedReq.toDate)}</div>
              <div><span className="font-semibold">Reason:</span> {selectedReq?.reason}</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comments">
                Remarks / Comments {decisionAction !== 'APPROVE' && <span className="text-rose-500">*</span>}
              </Label>
              <Textarea
                id="comments"
                rows={3}
                placeholder={decisionAction === 'APPROVE' ? 'Optional remarks...' : 'Explain the reason for rejection or needed correction...'}
                value={decisionComments}
                onChange={e => setDecisionComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionAction(null)}>Cancel</Button>
            <Button
              disabled={deciding}
              onClick={handleConfirmDecision}
              className={
                decisionAction === 'APPROVE'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : decisionAction === 'REJECT'
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }
            >
              {deciding ? <RefreshCw className="h-4 w-4 animate-spin" /> : `Confirm ${decisionAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Resubmit Modal ────────────────────────────────────────── */}
      <Dialog open={resubmitModalOpen} onOpenChange={setResubmitModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" /> Resubmit Corrected Request
            </DialogTitle>
            <DialogDescription>
              Resubmission will clear previous review notes and restart the approval process at Step 0.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {resubmitTarget?.returnedReason && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-amber-700 dark:text-amber-400">Return Note from Approver:</span>
                <p className="text-muted-foreground">{resubmitTarget.returnedReason}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="resubmitNote">Corrections Made / Clarification</Label>
              <Textarea
                id="resubmitNote"
                rows={3}
                placeholder="Explain the changes or attachments updated..."
                value={resubmitComments}
                onChange={e => setResubmitComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResubmitModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmResubmit} disabled={deciding} className="gap-2">
              {deciding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Resubmit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: Request Card with Visual Approval Route Steps
// ─────────────────────────────────────────────────────────────────────────────

function RequestCard({
  req,
  isRequester = false,
  isApprover = false,
  onApprove,
  onReject,
  onReturn,
  onResubmit,
  onWithdraw,
}: {
  req: LeaveRequestItem
  isRequester?: boolean
  isApprover?: boolean
  onApprove?: () => void
  onReject?: () => void
  onReturn?: () => void
  onResubmit?: () => void
  onWithdraw?: () => void
}) {
  const steps: any[] = req.stepsJson ? JSON.parse(req.stepsJson) : []
  const history: any[] = req.historyJson ? JSON.parse(req.historyJson) : []
  const meta = req.workflowKey ? ROUTE_METADATA[req.workflowKey] : null

  return (
    <Card className="overflow-hidden border hover:border-foreground/20 transition-all shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-foreground">{req.requesterName}</span>
              <Badge variant="outline" className="font-semibold text-xs uppercase bg-muted/60">
                {req.category}
              </Badge>
              {req.category === 'LEAVE' && (
                <Badge variant="secondary" className="text-xs">
                  {req.type}
                </Badge>
              )}
              <StatusBadge status={req.status} />
              {req.category !== 'LEAVE' && req.status === 'APPROVED' && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                  Balance Preserved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted on {fmtDate(req.createdAt)} • Ref: <span className="font-mono">{req.id.slice(-8)}</span>
            </p>
          </div>

          {/* Action buttons for Approvers */}
          {isApprover && req.status === 'IN_PROGRESS' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onReturn}
                className="h-8 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Return
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="h-8 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 gap-1"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            </div>
          )}

          {/* Action buttons for Requesters */}
          {isRequester && (
            <div className="flex items-center gap-2">
              {req.status === 'RETURNED' && (
                <Button size="sm" onClick={onResubmit} className="h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Resubmit Corrections
                </Button>
              )}
              {['IN_PROGRESS', 'PENDING', 'RETURNED'].includes(req.status) && (
                <Button size="sm" variant="outline" onClick={onWithdraw} className="h-8 text-muted-foreground hover:text-rose-600">
                  Cancel Request
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Date and Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/30 p-3 rounded-lg border">
          <div>
            <span className="font-semibold text-muted-foreground block mb-0.5">Duration:</span>
            <span className="font-medium">
              {fmtDate(req.fromDate)} – {fmtDate(req.toDate)} ({req.durationType === 'HALF_DAY' ? `Half Day (${req.halfDayPart})` : 'Full Day'})
            </span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block mb-0.5">Alternative / Substitution:</span>
            <span className="font-medium text-foreground">
              {req.substituteName || 'Alternative / Substitution Staff'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block mb-0.5">Official Route:</span>
            <span className="font-medium text-foreground">
              {meta?.label || req.workflowKey || 'Standard Hierarchy'}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="text-xs text-foreground/90">
          <span className="font-semibold text-muted-foreground">Reason: </span>
          {req.reason}
        </div>

        {/* Returned Reason banner if applicable */}
        {req.returnedReason && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Returned for Correction: </span>
              {req.returnedReason}
            </div>
          </div>
        )}

        {/* Visual Stepper for TO & CC Authorities */}
        {steps.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Approval Progress Trail
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {steps.map(step => {
                const isTo = step.recipientType === 'TO'
                const isApproved = step.status === 'APPROVED'
                const isPendingCurrent = isTo && req.status === 'IN_PROGRESS' && step.index === req.currentStep
                const isRejected = step.status === 'REJECTED'

                return (
                  <div
                    key={step.index}
                    className={`p-2 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                      isApproved
                        ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200'
                        : isRejected
                        ? 'border-rose-500/40 bg-rose-500/5 text-rose-950 dark:text-rose-200'
                        : isPendingCurrent
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : !isTo
                        ? 'border-dashed bg-muted/20 text-muted-foreground'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isTo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.recipientType}
                        </span>
                        {isApproved ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : isPendingCurrent ? (
                          <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                        ) : isRejected ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        ) : null}
                      </div>
                      <div className="font-semibold truncate text-[11px]">{step.label || step.approverRole}</div>
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      {isApproved
                        ? 'Approved'
                        : isPendingCurrent
                        ? 'Current Action'
                        : !isTo
                        ? 'Info Only (CC)'
                        : 'Awaiting Turn'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><Check className="h-3 w-3" /> Approved</Badge>
    case 'REJECTED':
      return <Badge className="bg-rose-600 hover:bg-rose-700 text-white gap-1"><X className="h-3 w-3" /> Rejected</Badge>
    case 'RETURNED':
      return <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1"><RotateCcw className="h-3 w-3" /> Returned</Badge>
    case 'CANCELLED':
      return <Badge variant="secondary" className="gap-1">Cancelled</Badge>
    default:
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1"><Clock className="h-3 w-3" /> In Progress</Badge>
  }
}
