'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { PageHeader, SectionCard, EmptyState, ErrorState, Skeleton } from '@/components/erp/ui'
import { useErp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton as Skel } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UsersTab } from './users-tab'
import { SecurityTab } from './security-tab'
import type { SchoolSettings, SettingsStats } from './types'
import {
  Save, Loader2, Upload, School as SchoolIcon, BookOpen, GraduationCap, ClipboardList,
  BellRing, MessageSquare, Mail, Smartphone, DatabaseBackup, AlertTriangle, Download,
  CalendarDays, Layers, ArrowRight, Trash2,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC']
const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR']

export default function SettingsModule() {
  const setModule = useErp((s) => s.setModule)
  const [settings, setSettings] = React.useState<SchoolSettings | null>(null)
  const [stats, setStats] = React.useState<SettingsStats | null>(null)
  const [grades, setGrades] = React.useState<any[] | null>(null)
  const [years, setYears] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [savingNotif, setSavingNotif] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [profileForm, setProfileForm] = React.useState({
    schoolName: '', address: '', phone: '', email: '', timezone: 'Asia/Kolkata', currency: 'INR', logoUrl: '' as string | null,
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [schoolRes, statsRes] = await Promise.all([
        api('api/settings/school'),
        api('api/settings/stats').catch(() => null),
      ])
      const s: SchoolSettings = schoolRes?.data
      setSettings(s)
      setProfileForm({
        schoolName: s.schoolName || '', address: s.address || '', phone: s.phone || '', email: s.email || '',
        timezone: s.timezone || 'Asia/Kolkata', currency: s.currency || 'INR', logoUrl: s.logoUrl || '',
      })
      if (statsRes) {
        setStats(statsRes)
        if (Array.isArray(statsRes.gradingScales)) setGrades(statsRes.gradingScales)
        if (statsRes.currentYear) setYears([statsRes.currentYear])
      }
      // Prefer dedicated endpoints when other modules expose them
      fetch('api/exams/grades', { credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : null))
        .then(g => { if (g?.data?.length) setGrades(g.data) })
        .catch(() => undefined)
      fetch('api/academics/years?all=1', { credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : null))
        .then(y => { if (y?.data?.length) setYears(y.data) })
        .catch(() => undefined)
    } catch (e: any) {
      setError(e?.message || 'Unable to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const saveProfile = async () => {
    if (!profileForm.schoolName.trim()) { toast.error('School name is required'); return }
    setSaving(true)
    try {
      await api('api/settings/school', { method: 'PUT', body: JSON.stringify(profileForm) })
      toast.success('School profile saved', { description: 'Changes reflect across the ERP immediately.' })
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('api/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Upload failed')
      setProfileForm(f => ({ ...f, logoUrl: body.url }))
      toast.success('Logo uploaded', { description: 'Remember to save the profile.' })
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const notifForm = {
    smsEnabled: settings?.smsEnabled ?? true,
    emailEnabled: settings?.emailEnabled ?? true,
    whatsappEnabled: settings?.whatsappEnabled ?? false,
    pushEnabled: settings?.pushEnabled ?? true,
  }

  const saveNotifications = async (next: typeof notifForm) => {
    setSavingNotif(true)
    try {
      await api('api/settings/school', { method: 'PUT', body: JSON.stringify(next) })
      setSettings(s => s ? { ...s, ...next } : s)
      toast.success('Notification channels updated')
    } catch (e: any) {
      toast.error(e?.message || 'Could not update channels')
    } finally {
      setSavingNotif(false)
    }
  }

  const currentYear = years?.find((y: any) => y.isCurrent) || years?.[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="School profile, academic year, users, security and data management."
        breadcrumbs={['System', 'Settings']}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-4">
          <Skel className="h-10 w-96 rounded-lg" />
          <Skel className="h-72 rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="profile" className="gap-1.5"><SchoolIcon className="h-3.5 w-3.5" /> School Profile</TabsTrigger>
            <TabsTrigger value="academic" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Academic Setup</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Users & Roles</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><BellRing className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5"><DatabaseBackup className="h-3.5 w-3.5" /> Data</TabsTrigger>
          </TabsList>

          {/* ── SCHOOL PROFILE ── */}
          <TabsContent value="profile" className="space-y-4">
            <SectionCard title="School Profile" description="Displayed on reports, receipts and the parent app">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40">
                    {profileForm.logoUrl
                      ? <img src={profileForm.logoUrl} alt="School logo" className="h-full w-full object-contain" />
                      : <SchoolIcon className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <label className="w-full">
                    <input
                      type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }}
                    />
                    <span className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border text-xs font-medium hover:bg-accent">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? 'Uploading…' : 'Upload logo'}
                    </span>
                  </label>
                  {profileForm.logoUrl && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600" onClick={() => setProfileForm(f => ({ ...f, logoUrl: null }))}>
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="sch-name">School name *</Label>
                    <Input id="sch-name" value={profileForm.schoolName} onChange={(e) => setProfileForm(f => ({ ...f, schoolName: e.target.value }))} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="sch-addr">Address</Label>
                    <Textarea id="sch-addr" rows={2} value={profileForm.address} onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sch-phone">Phone</Label>
                    <Input id="sch-phone" value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 …" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sch-email">Email</Label>
                    <Input id="sch-email" type="email" value={profileForm.email} onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Timezone</Label>
                    <Select value={profileForm.timezone} onValueChange={(v) => setProfileForm(f => ({ ...f, timezone: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select value={profileForm.currency} onValueChange={(v) => setProfileForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save profile
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── ACADEMIC SETUP ── */}
          <TabsContent value="academic" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Current Academic Year" description="Used by attendance, exams and fees">
                {currentYear ? (
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold tracking-tight">{currentYear.name}</p>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Active</Badge>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {fmtDate(currentYear.startDate)} → {fmtDate(currentYear.endDate)}
                    </p>
                    {currentYear.terms?.length ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {currentYear.terms.map((t: any) => (
                          <Badge key={t.name} variant="outline" className={t.isCurrent ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400' : ''}>
                            {t.name}{t.isCurrent ? ' •' : ''}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setModule('academics')}>
                      Manage years & terms <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Academic year endpoint not available"
                    description="The Academics module exposes /api/academics/years — once live, the current year shows here."
                    icon={<CalendarDays className="h-7 w-7" />}
                  />
                )}
              </SectionCard>

              <SectionCard title="Quick Links" description="Jump to academic configuration">
                <div className="grid gap-2 py-1">
                  {[
                    { label: 'Classes, sections & subjects', desc: 'Grade hierarchy and subject allocation', mod: 'academics' },
                    { label: 'Timetables', desc: 'Weekly period grid per section', mod: 'academics' },
                    { label: 'Exams & grading', desc: 'Schedule exams, publish marks', mod: 'examinations' },
                    { label: 'Attendance policies', desc: 'Lock hours & leave approvals', mod: 'attendance' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => setModule(item.mod)}
                      className="flex items-center justify-between rounded-lg border px-3.5 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Grading Scales"
              description="Read-only summary — edit in the Examinations module"
              contentClassName="p-0"
            >
              {grades?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-semibold">Grade</th>
                        <th className="px-4 py-2 font-semibold">Name</th>
                        <th className="px-4 py-2 font-semibold">Range %</th>
                        <th className="px-4 py-2 font-semibold">GPA</th>
                        <th className="px-4 py-2 font-semibold">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {grades.map((g: any) => (
                        <tr key={g.id || g.grade}>
                          <td className="px-4 py-2"><Badge variant="outline" className="font-bold">{g.grade}</Badge></td>
                          <td className="px-4 py-2">{g.name}</td>
                          <td className="px-4 py-2 tabular-nums">{g.minPercent} – {g.maxPercent}</td>
                          <td className="px-4 py-2 tabular-nums">{g.gpa}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{g.remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Grading scales not exposed yet"
                  description="/api/exams/grades (Examinations module) will feed this summary. Schema defaults: A+ ≥90, A ≥80, B+ ≥70, B ≥60, C ≥50, D ≥35, F below."
                  icon={<Layers className="h-7 w-7" />}
                />
              )}
            </SectionCard>
          </TabsContent>

          {/* ── USERS & ROLES ── */}
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security">
            <SecurityTab settings={settings} onReload={load} />
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications" className="space-y-4">
            <SectionCard title="Notification Channels" description="Toggle delivery channels for the notification engine">
              <div className="grid gap-4 py-1 sm:grid-cols-2">
                {([
                  { key: 'smsEnabled', label: 'SMS', desc: 'Fee reminders, attendance alerts (MSG91)', icon: <Smartphone className="h-4 w-4" /> },
                  { key: 'emailEnabled', label: 'Email', desc: 'Receipts, circulars, reports (SendGrid)', icon: <Mail className="h-4 w-4" /> },
                  { key: 'whatsappEnabled', label: 'WhatsApp', desc: 'WhatsApp Business API broadcasts (Gupshup)', icon: <MessageSquare className="h-4 w-4" /> },
                  { key: 'pushEnabled', label: 'Push', desc: 'Mobile app push notifications', icon: <BellRing className="h-4 w-4" /> },
                ] as const).map(ch => (
                  <div key={ch.key} className="flex items-center justify-between gap-3 rounded-lg border p-3.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{ch.icon}</span>
                      <div>
                        <Label htmlFor={ch.key} className="text-sm">{ch.label}</Label>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={ch.key}
                      checked={notifForm[ch.key]}
                      disabled={savingNotif}
                      onCheckedChange={(v) => saveNotifications({ ...notifForm, [ch.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── DATA ── */}
          <TabsContent value="data" className="space-y-4">
            <SectionCard title="Database Overview" description="Live record counts by entity">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(stats?.counts || []).map(c => (
                  <div key={c.key} className="rounded-lg border p-3.5">
                    <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{c.count.toLocaleString('en-IN')}</p>
                  </div>
                ))}
                {!stats && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Counts unavailable right now.</p>}
              </div>
            </SectionCard>

            <SectionCard title="Exports" description="Download CSV snapshots (respects role permissions)">
              <div className="flex flex-wrap gap-2">
                {['students', 'attendance', 'invoices', 'payments', 'expenses', 'leads', 'books', 'payslips'].map(entity => (
                  <Button key={entity} variant="outline" size="sm" className="h-9 capitalize" onClick={() => { window.open(`/api/export?entity=${entity}`, '_blank'); toast.info(`Preparing ${entity} export…`) }}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> {entity}
                  </Button>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="border-rose-500/40" title={<span className="flex items-center gap-2 text-rose-600 dark:text-rose-400"><AlertTriangle className="h-4 w-4" /> Danger Zone</span>} description="Irreversible operations — proceed with caution" contentClassName="p-4 sm:p-5">
              <div className="flex flex-col gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Reset demo dataset</p>
                  <p className="text-xs text-muted-foreground">Re-running the seed script wipes all live changes and restores factory demo data.</p>
                </div>
                <Button
                  variant="destructive" size="sm" className="shrink-0"
                  onClick={() => toast.error('Disabled in production', { description: 'Database resets are only permitted from the server console.' })}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Reset data
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Deletion of individual records is available inside each module with full audit logging. Bulk purge endpoints are intentionally not exposed.
              </p>
            </SectionCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
