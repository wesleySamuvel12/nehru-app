'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ApiError, list, updateOne } from '@/lib/api-client'
import { fmtDateTime } from '@/lib/format'
import { useErp } from '@/lib/store'
import { CheckCircle2, ChevronRight, CircleSlash, FileCheck2, Loader2, XCircle } from 'lucide-react'
import { APP_STATUS_BADGE, APP_STATUS_LABELS, APP_WORKFLOW } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

const columns: Column[] = [
  { key: 'applicationNo', label: 'Application No' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'classApplied', label: 'Class Applied' },
  { key: 'parentName', label: 'Parent Name' },
  { key: 'parentPhone', label: 'Parent Phone', hideOnMobile: true },
  { key: 'status', label: 'Status', render: row => <StatusBadge value={row.status} map={APP_STATUS_BADGE} /> },
  {
    key: 'docsVerified', label: 'Docs',
    render: row => row.docsVerified
      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
      : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CircleSlash className="h-3.5 w-3.5" /> Pending</span>,
  },
  { key: 'testScore', label: 'Test Score', render: row => row.testScore ?? <span className="text-muted-foreground">—</span>, hideOnMobile: true },
  { key: 'interviewScore', label: 'Interview Score', render: row => row.interviewScore ?? <span className="text-muted-foreground">—</span>, hideOnMobile: true },
  { key: 'decidedByName', label: 'Decided By', render: row => row.decidedByName || <span className="text-muted-foreground">—</span>, defaultHidden: true },
  { key: 'createdAt', label: 'Created', date: true },
]

const fields: FormField[] = [
  { name: 'studentName', label: 'Student Name', type: 'text', required: true },
  {
    name: 'gender', label: 'Gender', type: 'select', defaultValue: 'MALE',
    options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }],
  },
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  {
    name: 'classApplied', label: 'Class Applied', type: 'select', required: true,
    optionsLoader: async () => (await list('api/academics/classes', { all: 1 })).data.map(c => ({ label: c.name, value: c.name })),
  },
  { name: 'parentName', label: 'Parent Name', type: 'text', required: true },
  { name: 'parentPhone', label: 'Parent Phone', type: 'tel', required: true },
  { name: 'parentEmail', label: 'Parent Email', type: 'email' },
  { name: 'previousSchool', label: 'Previous School', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea', colSpan: 2 },
  { name: 'docsVerified', label: 'Documents Verified', type: 'switch' },
  { name: 'testScore', label: 'Test Score', type: 'number', min: 0, max: 100 },
  { name: 'interviewScore', label: 'Interview Score', type: 'number', min: 0, max: 100 },
  { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
]

function cleanPayload(values: Record<string, any>) {
  return {
    ...values,
    dob: values.dob || null,
    parentEmail: values.parentEmail || null,
    previousSchool: values.previousSchool || null,
    address: values.address || null,
    remarks: values.remarks || null,
    testScore: values.testScore === '' || values.testScore === undefined ? null : values.testScore,
    interviewScore: values.interviewScore === '' || values.interviewScore === undefined ? null : values.interviewScore,
  }
}

const NEXT_STEP_HINT: Record<string, string> = {
  SCREENING: 'Verify basic eligibility and details.',
  DOC_VERIFICATION: 'Check birth certificate, transfer & report cards.',
  TEST: 'Schedule and conduct the entrance test.',
  INTERVIEW: 'Family interaction with the principal.',
  APPROVED: 'Seat approved — ready for enrolment.',
  REJECTED: 'Application will be closed as rejected.',
  ENROLLED: 'Creates the student record automatically.',
}

function AdvanceDialog({ app, onClose, onSaved }: { app: any | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = React.useState<string | null>(null)
  const session = useErp(s => s.session)
  const open = !!app
  const nextSteps = app ? APP_WORKFLOW[app.status] || [] : []

  const advance = async (status: string) => {
    if (!app) return
    setSaving(status)
    try {
      await updateOne('api/admissions/applications', app.id, { status })
      toast.success(
        status === 'ENROLLED'
          ? `${app.studentName} enrolled — student record is being created.`
          : `Application moved to ${APP_STATUS_LABELS[status] || status}.`,
      )
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advance application</DialogTitle>
          <DialogDescription>
            {app ? `${app.applicationNo} · ${app.studentName} · ${app.classApplied}` : ''}
          </DialogDescription>
        </DialogHeader>

        {app && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Current status</span>
              <StatusBadge value={app.status} map={APP_STATUS_BADGE} />
            </div>

            {app.decidedByName && (
              <p className="-mt-2 text-xs text-muted-foreground">Last decision by {app.decidedByName}{app.decidedAt ? ` on ${fmtDateTime(app.decidedAt)}` : ''}</p>
            )}

            {nextSteps.length > 0 ? (
              <div className="space-y-2">
                {nextSteps.map(step => (
                  <div key={step} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                        {APP_STATUS_LABELS[step] || step}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{NEXT_STEP_HINT[step]}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {step === 'APPROVED' && <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" disabled={!!saving} onClick={() => advance(step)}>
                        {saving === step ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />} Approve
                      </Button>}
                      {step === 'REJECTED' && <Button size="sm" variant="destructive" className="h-8" disabled={!!saving} onClick={() => advance(step)}>
                        {saving === step ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />} Reject
                      </Button>}
                      {step !== 'APPROVED' && step !== 'REJECTED' && (
                        <Button size="sm" variant="outline" className="h-8" disabled={!!saving} onClick={() => advance(step)}>
                          {saving === step ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null} Move
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Action recorded as <span className="font-medium">{session?.name || 'you'}</span> in the audit trail.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed px-3 py-6 text-center">
                <FileCheck2 className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">This application is closed</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {app.status === 'ENROLLED' ? 'The student record has been created.' : 'No further workflow steps are available.'}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={!!saving} onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ApplicationsTab() {
  const [advanceApp, setAdvanceApp] = React.useState<any | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <>
      <DataTable
        endpoint="api/admissions/applications"
        columns={columns}
        fields={fields}
        transformSave={cleanPayload}
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        searchPlaceholder="Search application no, student, parent…"
        createLabel="New Application"
        exportEntity="applications"
        filters={[
          {
            key: 'status', label: 'Statuses',
            options: Object.keys(APP_STATUS_LABELS).map(s => ({ label: APP_STATUS_LABELS[s], value: s })),
          },
        ]}
        emptyTitle="No applications yet"
        emptyDescription="Applications arrive from leads or walk-ins — create one to begin the admission workflow."
        refreshKey={refreshKey}
        deleteLabelField="studentName"
        rowToForm={(row) => {
          const base = Object.fromEntries(fields.map(f => [f.name, row[f.name] ?? (f.type === 'switch' ? !!row[f.name] : '')]))
          return { ...base, docsVerified: !!row.docsVerified }
        }}
        rowActions={(row) => (
          <Button
            key="advance"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setAdvanceApp(row)}
            aria-label={`Advance application ${row.applicationNo}`}
          >
            <ChevronRight className="mr-1 h-3.5 w-3.5" /> Advance
          </Button>
        )}
      />
      <AdvanceDialog app={advanceApp} onClose={() => setAdvanceApp(null)} onSaved={refresh} />
    </>
  )
}
