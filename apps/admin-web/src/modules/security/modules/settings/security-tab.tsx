'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard } from '@/components/erp/ui'
import type { SchoolSettings } from './types'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, ShieldCheck, Timer, DatabaseBackup, Lock } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SecurityTab({ settings, onReload }: { settings: SchoolSettings | null; onReload: () => void }) {
  const [form, setForm] = React.useState({
    mfaRequired: false,
    dataEncryption: true,
    sessionTimeoutMin: 120,
    backupFrequency: 'DAILY',
    attendanceLockHours: 24,
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (settings) {
      setForm({
        mfaRequired: !!settings.mfaRequired,
        dataEncryption: !!settings.dataEncryption,
        sessionTimeoutMin: settings.sessionTimeoutMin ?? 120,
        backupFrequency: settings.backupFrequency || 'DAILY',
        attendanceLockHours: settings.attendanceLockHours ?? 24,
      })
    }
  }, [settings])

  const save = async () => {
    setSaving(true)
    try {
      await api('api/settings/school', { method: 'PUT', body: JSON.stringify(form) })
      toast.success('Security settings saved')
      onReload()
    } catch (e: any) {
      toast.error(e?.message || 'Could not save security settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Authentication & Encryption" description="Applies to every sign-in across the ERP">
          <div className="space-y-5 py-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <Label htmlFor="mfa" className="text-sm">Require MFA for admins</Label>
                  <p className="text-xs text-muted-foreground">Second factor (OTP) mandatory for SUPER_ADMIN & SCHOOL_ADMIN.</p>
                </div>
              </div>
              <Switch id="mfa" checked={form.mfaRequired} onCheckedChange={(v) => setForm(f => ({ ...f, mfaRequired: v }))} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <div>
                  <Label htmlFor="enc" className="text-sm">Data encryption at rest</Label>
                  <p className="text-xs text-muted-foreground">AES-256 on document store and integration secrets.</p>
                </div>
              </div>
              <Switch id="enc" checked={form.dataEncryption} onCheckedChange={(v) => setForm(f => ({ ...f, dataEncryption: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="timeout" className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Session timeout (min)</Label>
                <Input id="timeout" type="number" min={15} max={720} value={form.sessionTimeoutMin}
                  onChange={(e) => setForm(f => ({ ...f, sessionTimeoutMin: Math.max(15, Number(e.target.value) || 120) }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lock" className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Attendance lock (hrs)</Label>
                <Input id="lock" type="number" min={0} max={72} value={form.attendanceLockHours}
                  onChange={(e) => setForm(f => ({ ...f, attendanceLockHours: Math.max(0, Number(e.target.value) || 24) }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><DatabaseBackup className="h-3.5 w-3.5" /> Backup frequency</Label>
              <Select value={form.backupFrequency} onValueChange={(v) => setForm(f => ({ ...f, backupFrequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save security settings
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Security posture" description="Derived recommendations based on current settings">
          <ul className="space-y-3 py-1 text-sm">
            {[
              { ok: form.mfaRequired, text: 'MFA enforced for privileged roles' },
              { ok: form.sessionTimeoutMin <= 120, text: 'Session timeout within recommended 2h window' },
              { ok: form.dataEncryption, text: 'Data encrypted at rest' },
              { ok: form.backupFrequency === 'DAILY' || form.backupFrequency === 'HOURLY', text: 'Backups run at least daily' },
              { ok: form.attendanceLockHours >= 12, text: 'Attendance edits locked after 12+ hours' },
            ].map(item => (
              <li key={item.text} className="flex items-center gap-2.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${item.ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                  {item.ok ? '✓' : '!'}
                </span>
                <span className={item.ok ? '' : 'text-muted-foreground'}>{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Login history below records every authentication attempt, successful or failed, with IP and device for auditing.
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Login History" description="All authentication attempts, newest first" contentClassName="p-0">
        <DataTable
          endpoint="api/settings/sessions"
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50]}
          allowCreate={false}
          allowEdit={false}
          allowDelete={false}
          searchPlaceholder="Search email…"
          defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
          columns={[
            { key: 'email', label: 'Email' },
            { key: 'success', label: 'Result', sortable: false, render: (row) => (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${row.success ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>
                {row.success ? 'Success' : 'Failed'}
              </span>
            ) },
            { key: 'reason', label: 'Reason', render: (row) => <span className="text-xs">{row.reason || '—'}</span> },
            { key: 'ip', label: 'IP Address', render: (row) => <code className="text-xs">{row.ip || '—'}</code> },
            { key: 'createdAt', label: 'When', date: true, sortable: true },
          ]}
          emptyTitle="No login activity yet"
          emptyDescription="Sign-in attempts will appear here as users access the ERP."
        />
      </SectionCard>
    </div>
  )
}
