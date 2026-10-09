'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  PageHeader, SectionCard, EmptyState, ErrorState, CardGridSkeleton, StatusBadge,
} from '@/components/erp/ui'
import { api, list } from '@/lib/api-client'
import { timeAgo, titleCase } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Wallet, MessageSquare, Mail, MapPin, Fingerprint, ScanLine, Camera, Calculator,
  MonitorPlay, Landmark, Globe, RefreshCw, Settings2, Plug, PlugZap, CheckCircle2,
  AlertTriangle, Unplug, Server, Code2, Loader2,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Integration {
  id: string
  key: string
  name: string
  category: string
  provider: string
  status: string
  configJson: string
  lastSyncAt: string | null
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  PAYMENT: <Wallet className="h-5 w-5" />,
  SMS: <MessageSquare className="h-5 w-5" />,
  EMAIL: <Mail className="h-5 w-5" />,
  WHATSAPP: <MessageSquare className="h-5 w-5" />,
  GPS: <MapPin className="h-5 w-5" />,
  BIOMETRIC: <Fingerprint className="h-5 w-5" />,
  RFID: <ScanLine className="h-5 w-5" />,
  CCTV: <Camera className="h-5 w-5" />,
  ACCOUNTING: <Calculator className="h-5 w-5" />,
  LMS: <MonitorPlay className="h-5 w-5" />,
  GOVERNMENT: <Landmark className="h-5 w-5" />,
  API: <Globe className="h-5 w-5" />,
}

const CATEGORY_TONES: Record<string, string> = {
  PAYMENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  SMS: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  EMAIL: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  WHATSAPP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  GPS: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  BIOMETRIC: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  RFID: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  CCTV: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400',
  ACCOUNTING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  LMS: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  GOVERNMENT: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  API: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}

const CATEGORIES = ['ALL', 'PAYMENT', 'SMS', 'EMAIL', 'WHATSAPP', 'GPS', 'BIOMETRIC', 'RFID', 'CCTV', 'ACCOUNTING', 'LMS', 'GOVERNMENT']

const STATUS_MAP: Record<string, string> = {
  ERROR: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/students', desc: 'List & search students (paged)' },
  { method: 'POST', path: '/api/attendance', desc: 'Bulk mark daily attendance' },
  { method: 'GET', path: '/api/fees/invoices', desc: 'Fee invoices with status filters' },
  { method: 'POST', path: '/api/fees/payments', desc: 'Record a fee payment' },
  { method: 'GET', path: '/api/academics/timetables', desc: 'Timetable slots by section' },
  { method: 'POST', path: '/api/communication/announcements', desc: 'Publish announcements' },
  { method: 'GET', path: '/api/transport/vehicles', desc: 'Fleet + live GPS positions' },
  { method: 'GET', path: '/api/dashboard', desc: 'Aggregated KPI snapshot' },
]

function prettyJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw || '{}'), null, 2) } catch { return raw || '{}' }
}

export default function IntegrationsModule() {
  const [items, setItems] = React.useState<Integration[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [category, setCategory] = React.useState('ALL')
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [configuring, setConfiguring] = React.useState<Integration | null>(null)
  const [form, setForm] = React.useState({ provider: '', category: 'API', configJson: '{}' })
  const [saving, setSaving] = React.useState(false)
  const [syncingKey, setSyncingKey] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await list('api/settings/integrations', { all: 1, sortBy: 'name', sortDir: 'asc' })
      setItems(r.data || [])
    } catch (e: any) {
      setError(e?.message || 'Unable to load integrations.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const patch = async (row: Integration, body: Record<string, unknown>) => {
    setBusyId(row.id)
    try {
      await api(`api/settings/integrations/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await load()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Update failed')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const toggleConnect = async (row: Integration) => {
    const next = row.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED'
    if (await patch(row, { status: next })) {
      toast.success(next === 'CONNECTED' ? `${row.name} connected` : `${row.name} disconnected`)
    }
  }

  const sync = async (row: Integration) => {
    setSyncingKey(row.id)
    const ok = await patch(row, { lastSyncAt: new Date().toISOString() })
    setSyncingKey(null)
    if (ok) toast.success(`${row.name} synced`, { description: 'Last sync updated to just now.' })
  }

  const openConfigure = (row: Integration) => {
    setConfiguring(row)
    setForm({ provider: row.provider, category: row.category, configJson: prettyJson(row.configJson) })
  }

  const saveConfig = async () => {
    if (!configuring) return
    try { JSON.parse(form.configJson || '{}') } catch {
      toast.error('Config must be valid JSON')
      return
    }
    setSaving(true)
    try {
      const ok = await patch(configuring, {
        provider: form.provider,
        category: form.category,
        configJson: JSON.stringify(JSON.parse(form.configJson || '{}')),
      })
      if (ok) {
        toast.success('Configuration saved', { description: `${configuring.name} updated.` })
        setConfiguring(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const connected = items.filter(i => i.status === 'CONNECTED').length
  const errored = items.filter(i => i.status === 'ERROR').length
  const filtered = category === 'ALL' ? items : items.filter(i => i.category === category)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        subtitle="Connect NIS ERP with payment gateways, messaging, GPS, biometrics and more."
        breadcrumbs={['System', 'Integrations']}
        actions={<Badge variant="outline" className="h-9 px-3 text-xs">{connected}/{items.length} connected</Badge>}
      />

      {errored > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p><span className="font-medium">{errored} integration{errored > 1 ? 's' : ''} reporting errors.</span>{' '}
            <span className="text-muted-foreground">Open the card to review the device config or reconnect.</span></p>
        </div>
      )}

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c} value={c} className="text-xs">
              {c === 'ALL' ? 'All' : titleCase(c)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <CardGridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No integrations in this category" description="Try another category tab." icon={<Plug className="h-7 w-7" />} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(row => {
            const icon = CATEGORY_ICONS[row.category] || <Globe className="h-5 w-5" />
            return (
              <div key={row.id} className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3 border-b p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${CATEGORY_TONES[row.category] || 'bg-muted text-foreground'}`}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{row.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">by {row.provider}</p>
                  </div>
                  <StatusBadge value={row.status} map={STATUS_MAP} />
                </div>
                <div className="flex-1 space-y-2.5 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-[10px]">{titleCase(row.category)}</Badge>
                    <span className="text-muted-foreground">
                      {row.lastSyncAt ? `Synced ${timeAgo(row.lastSyncAt)}` : 'Never synced'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5 shrink-0" />
                    <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{prettyJson(row.configJson).slice(0, 60)}{prettyJson(row.configJson).length > 60 ? '…' : ''}</code>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 border-t p-3">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openConfigure(row)}>
                    <Settings2 className="mr-1 h-3.5 w-3.5" /> Configure
                  </Button>
                  <Button
                    size="sm"
                    className={`h-8 text-xs ${row.status === 'CONNECTED' ? 'bg-muted text-foreground hover:bg-muted/70' : ''}`}
                    variant={row.status === 'CONNECTED' ? 'secondary' : 'default'}
                    disabled={busyId === row.id}
                    onClick={() => toggleConnect(row)}
                  >
                    {busyId === row.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      : row.status === 'CONNECTED' ? <Unplug className="mr-1 h-3.5 w-3.5" /> : <PlugZap className="mr-1 h-3.5 w-3.5" />}
                    {row.status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busyId === row.id || syncingKey === row.id} onClick={() => sync(row)}>
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncingKey === row.id ? 'animate-spin' : ''}`} /> Sync
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* API Gateway card */}
      <SectionCard
        title="API Gateway"
        description="REST endpoints exposed by the ERP for approved integrations"
        actions={<Badge variant="outline" className="text-[10px]">Base URL · /api</Badge>}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {API_ENDPOINTS.map(ep => (
            <div key={ep.path} className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2">
              <Badge className={`shrink-0 text-[10px] font-mono ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'}`}>
                {ep.method}
              </Badge>
              <div className="min-w-0">
                <code className="block truncate text-xs font-semibold">{ep.path}</code>
                <p className="truncate text-[11px] text-muted-foreground">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Server className="h-3.5 w-3.5" /> All endpoints require the ERP session cookie or a Bearer token. Rate limit: 600 req/min per client.
        </p>
      </SectionCard>

      {/* Configure dialog */}
      <Dialog open={!!configuring} onOpenChange={(o) => !o && setConfiguring(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure — {configuring?.name}</DialogTitle>
            <DialogDescription>Provider details and JSON credentials for this integration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="int-provider">Provider</Label>
              <Input id="int-provider" value={form.provider} onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Razorpay" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c !== 'ALL').map(c => <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="int-config">Config (JSON)</Label>
              <Textarea
                id="int-config"
                rows={7}
                className="font-mono text-xs"
                value={form.configJson}
                onChange={(e) => setForm(f => ({ ...f, configJson: e.target.value }))}
                placeholder='{"apiKey": "…"}'
              />
              <p className="text-xs text-muted-foreground">Stored encrypted at rest. Secrets are masked in exports.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Save configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
