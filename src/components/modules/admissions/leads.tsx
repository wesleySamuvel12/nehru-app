'use client'

import * as React from 'react'
import { DataTable, FormFields, validateForm, type Column, type FormField } from '@/components/erp/DataTable'
import { StatusBadge } from '@/components/erp/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, ApiError, list } from '@/lib/api-client'
import { fmtDate, fmtDateTime, titleCase } from '@/lib/format'
import { Loader2, MessageSquarePlus, PhoneCall } from 'lucide-react'
import { LEAD_SOURCES, LEAD_STAGES, STAGE_BADGE, STAGE_LABELS, SOURCE_BADGE, SOURCE_LABELS, FOLLOWUP_OUTCOMES, isPastDay } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

const OUTCOME_BADGE: Record<string, string> = {
  INTERESTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  NOT_INTERESTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  FOLLOW_UP: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  NO_RESPONSE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  ENROLLED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

const columns: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', hideOnMobile: true },
  { key: 'source', label: 'Source', render: row => <StatusBadge value={row.source} map={SOURCE_BADGE} /> },
  { key: 'classAppliedFor', label: 'Class Applied', render: row => row.classAppliedFor || <span className="text-muted-foreground">—</span> },
  { key: 'stage', label: 'Stage', render: row => <StatusBadge value={row.stage} map={STAGE_BADGE} /> },
  { key: 'assignedToName', label: 'Counsellor', render: row => row.assignedToName || <span className="text-muted-foreground">Unassigned</span> },
  {
    key: 'nextFollowUp', label: 'Next Follow-up', date: true,
    render: row => row.nextFollowUp ? (
      <span className={isPastDay(row.nextFollowUp) ? 'whitespace-nowrap font-medium text-amber-600 dark:text-amber-400' : 'whitespace-nowrap text-muted-foreground'}>
        {fmtDate(row.nextFollowUp)}{isPastDay(row.nextFollowUp) ? ' · Due' : ''}
      </span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  { key: 'createdAt', label: 'Created', date: true, defaultHidden: true },
]

const fields: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Parent / guardian name' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91…' },
  { name: 'email', label: 'Email', type: 'email' },
  {
    name: 'source', label: 'Source', type: 'select', required: true, defaultValue: 'WALK_IN',
    options: LEAD_SOURCES.map(s => ({ label: SOURCE_LABELS[s] || titleCase(s), value: s })),
  },
  {
    name: 'classAppliedFor', label: 'Class Applied For', type: 'select',
    optionsLoader: async () => (await list('api/academics/classes', { all: 1 })).data.map(c => ({ label: c.name, value: c.name })),
  },
  {
    name: 'stage', label: 'Stage', type: 'select', defaultValue: 'NEW',
    options: LEAD_STAGES.map(s => ({ label: STAGE_LABELS[s] || s, value: s })),
  },
  { name: 'assignedToName', label: 'Assigned Counsellor', type: 'text', placeholder: 'Counsellor name' },
  { name: 'nextFollowUp', label: 'Next Follow-up', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, placeholder: 'Interest, fee queries, campus visit plans…' },
]

function cleanPayload(values: Record<string, any>) {
  return {
    ...values,
    email: values.email || null,
    classAppliedFor: values.classAppliedFor || null,
    assignedToName: values.assignedToName || null,
    notes: values.notes || null,
    nextFollowUp: values.nextFollowUp || null,
  }
}

/* ── Log follow-up dialog ── */
function FollowUpDialog({ lead, onClose, onSaved }: { lead: any | null; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = React.useState<Record<string, any>>({ note: '', outcome: 'FOLLOW_UP', nextAt: '' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [history, setHistory] = React.useState<any[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)

  const open = !!lead

  React.useEffect(() => {
    if (!lead) return
    setValues({ note: '', outcome: 'FOLLOW_UP', nextAt: lead.nextFollowUp ? String(lead.nextFollowUp).slice(0, 10) : '' })
    setErrors({})
    setHistoryLoading(true)
    api<{ data: any[] }>(`/api/admissions/leads/${lead.id}/followups`)
      .then(res => setHistory(res.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [lead])

  const save = async () => {
    if (!lead) return
    const errs = validateForm([
      { name: 'note', label: 'Note', type: 'textarea', required: true },
    ], values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await api(`/api/admissions/leads/${lead.id}/followups`, {
        method: 'POST',
        body: JSON.stringify({ note: values.note, outcome: values.outcome, nextAt: values.nextAt || null }),
      })
      toast.success(`Follow-up logged for ${lead.name}.`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" /> Log follow-up
          </DialogTitle>
          <DialogDescription>
            {lead ? `${lead.name} · ${lead.phone} · ${STAGE_LABELS[lead.stage] || lead.stage}` : ''}
          </DialogDescription>
        </DialogHeader>

        <FormFields
          mode="create"
          errors={errors}
          values={values}
          setValues={setValues}
          fields={[
            { name: 'note', label: 'Note', type: 'textarea', required: true, colSpan: 2, placeholder: 'What was discussed?' },
            {
              name: 'outcome', label: 'Outcome', type: 'select', colSpan: 1,
              options: FOLLOWUP_OUTCOMES.map(o => ({ label: titleCase(o), value: o })),
            },
            { name: 'nextAt', label: 'Next Follow-up Date', type: 'date', colSpan: 1 },
          ]}
        />

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Recent history</Label>
          <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {historyLoading ? (
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            ) : history.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No follow-ups logged yet.</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge value={h.outcome} map={OUTCOME_BADGE} />
                    <span className="text-[11px] text-muted-foreground">{fmtDateTime(h.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm">{h.note}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {h.byName || 'System'}{h.nextAt ? ` · next ${fmtDate(h.nextAt)}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
            Save follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Leads tab ── */
export default function LeadsTab() {
  const [followUpLead, setFollowUpLead] = React.useState<any | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <>
      <DataTable
        endpoint="api/admissions/leads"
        columns={columns}
        fields={fields}
        transformSave={cleanPayload}
        defaultSort={{ sortBy: 'updatedAt', sortDir: 'desc' }}
        searchPlaceholder="Search name, phone, email…"
        createLabel="Add Lead"
        exportEntity="leads"
        filters={[
          { key: 'stage', label: 'Stages', options: LEAD_STAGES.map(s => ({ label: STAGE_LABELS[s] || s, value: s })) },
          { key: 'source', label: 'Sources', options: LEAD_SOURCES.map(s => ({ label: SOURCE_LABELS[s] || s, value: s })) },
        ]}
        emptyTitle="No leads yet"
        emptyDescription="Add your first enquiry to start building the admission pipeline."
        refreshKey={refreshKey}
        rowActions={(row) => (
          <Button
            key="followup"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setFollowUpLead(row)}
            aria-label={`Log follow-up for ${row.name}`}
          >
            <PhoneCall className="mr-1 h-3.5 w-3.5" /> Follow-up
          </Button>
        )}
      />
      <FollowUpDialog lead={followUpLead} onClose={() => setFollowUpLead(null)} onSaved={refresh} />
    </>
  )
}
