'use client'

import * as React from 'react'
import { createOne, list, updateOne, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard, StatCard } from '@/components/erp/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { fmtDateTime } from '@/lib/format'
import { Check, CheckCircle2, ChevronsUpDown, QrCode, ScanLine, ShieldCheck } from 'lucide-react'
import { useStudents } from './use-students'

/* eslint-disable @typescript-eslint/no-explicit-any */

const METHOD_MAP: Record<string, string> = {
  QR: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  MANUAL: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  OTP: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}
const TYPE_MAP: Record<string, string> = {
  PICKUP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  DROP: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
}

/** Deterministic pseudo-barcode SVG from a text seed (visual only). */
function BarcodeSvg({ seed }: { seed: string }) {
  const bars = React.useMemo(() => {
    let state = 2166136261
    for (let i = 0; i < seed.length; i++) { state ^= seed.charCodeAt(i); state = Math.imul(state, 16777619) }
    const out: { x: number; w: number }[] = []
    let x = 0
    let tick = 0
    while (x < 190) {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5
      const r1 = ((state >>> 0) % 1000) / 1000
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5
      const r2 = ((state >>> 0) % 1000) / 1000
      tick++
      const w = 2 + Math.floor(r1 * 5)
      if (r2 > 0.42) out.push({ x, w })
      x += w + 2
    }
    void tick
    return out
  }, [seed])
  return (
    <svg viewBox="0 0 200 56" className="h-14 w-full" role="img" aria-label="Barcode-style QR placeholder">
      <rect x="0" y="0" width="200" height="56" rx="6" className="fill-muted/60" />
      {bars.map((b, i) => <rect key={i} x={5 + b.x} y="6" width={b.w} height="44" rx="1" className="fill-foreground" />)}
      <rect x="0" y="0" width="200" height="56" rx="6" fill="none" stroke="currentColor" strokeDasharray="4 4" className="text-muted-foreground/40" />
    </svg>
  )
}

export default function StudentPickup() {
  const { students, map: studentMap, loading: studentsLoading } = useStudents()
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [studentId, setStudentId] = React.useState('')
  const [personName, setPersonName] = React.useState('')
  const [relation, setRelation] = React.useState('')
  const [method, setMethod] = React.useState('QR')
  const [type, setType] = React.useState('PICKUP')
  const [logging, setLogging] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [todayCount, setTodayCount] = React.useState<number | null>(null)

  const student = studentMap[studentId] || null

  React.useEffect(() => {
    let alive = true
    list<any>('api/security/pickups', { pageSize: 1 })
      .then(res => { if (alive) setTodayCount(res.meta?.total ?? 0) })
      .catch(() => { if (alive) setTodayCount(null) })
    return () => { alive = false }
  }, [refreshKey])

  const verifyAndLog = async () => {
    if (!studentId) { toast.error('Select the student being picked up.'); return }
    if (!personName.trim()) { toast.error('Enter the name of the person collecting the student.'); return }
    setLogging(true)
    try {
      await createOne('api/security/pickups', {
        studentId,
        personName: personName.trim(),
        relation: relation.trim() || null,
        method,
        type,
        status: method === 'QR' ? 'VERIFIED' : 'PENDING',
      })
      toast.success(method === 'QR'
        ? `QR verified — ${type === 'DROP' ? 'drop' : 'pickup'} of ${student?.name} logged for ${personName.trim()}.`
        : `${type === 'DROP' ? 'Drop' : 'Pickup'} logged as PENDING — a staff member must verify it below.`)
      setPersonName('')
      setRelation('')
      setRefreshKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Could not log the pickup.')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Verify & log */}
        <SectionCard
          className="lg:col-span-2"
          title="Verify & Log"
          description="Scan the student QR or log a manual/OTP handover"
        >
          <div className="space-y-4">
            {/* Student picker (searchable) */}
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={pickerOpen}
                    className="h-10 w-full justify-between font-normal">
                    {student
                      ? `${student.name} · ${student.className || '—'} (${student.admissionNo})`
                      : studentsLoading ? 'Loading students…' : 'Search student by name or admission no…'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search students…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map(s => (
                          <CommandItem key={s.id} value={`${s.name} ${s.admissionNo}`}
                            onSelect={() => { setStudentId(s.id); setPickerOpen(false) }}>
                            <Check className={cn('mr-2 h-4 w-4', studentId === s.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{s.name} · {s.className || '—'} ({s.admissionNo})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* QR placeholder */}
            <div className="rounded-xl border-2 border-dashed p-4 text-center">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ScanLine className="h-3.5 w-3.5" /> Scan student QR
              </p>
              {student ? (
                <>
                  <BarcodeSvg seed={student.barcode || student.admissionNo || student.id} />
                  <p className="mt-2 font-mono text-xs tracking-[0.2em] text-muted-foreground">
                    {student.barcode || `STU-${student.admissionNo}`}
                  </p>
                  <p className="mt-1 text-sm font-medium">{student.name} <span className="font-normal text-muted-foreground">· {student.className || '—'}</span></p>
                </>
              ) : (
                <div className="flex h-20 items-center justify-center text-muted-foreground">
                  <QrCode className="h-8 w-8 opacity-40" />
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground/70">QR visual is a placeholder — the gate log below is real</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="personName">Person Name</Label>
                <Input id="personName" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Collector's full name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="relation">Relation</Label>
                <Input id="relation" value={relation} onChange={e => setRelation(e.target.value)} placeholder="Father / Mother / Guardian" />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger aria-label="Verification method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QR">QR Scan — instant verify</SelectItem>
                    <SelectItem value="MANUAL">Manual — needs verification</SelectItem>
                    <SelectItem value="OTP">OTP — needs verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger aria-label="Log type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP">Pickup (going home)</SelectItem>
                    <SelectItem value="DROP">Drop (arriving)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="h-11 w-full" onClick={verifyAndLog} disabled={logging}>
              {logging ? <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify &amp; Log
            </Button>
          </div>
        </SectionCard>

        {/* Recent logs */}
        <div className="space-y-3 lg:col-span-3">
          <StatCard
            label="Logged Handovers"
            value={todayCount ?? '—'}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="success"
            hint="All pickup/drop logs on record"
          />
          <DataTable
            endpoint="api/security/pickups"
            refreshKey={refreshKey}
            allowCreate={false}
            allowEdit={false}
            columns={[
              { key: 'studentId', label: 'Student', render: r => <span className="font-medium">{studentMap[r.studentId]?.name || <span className="text-muted-foreground">Student #{String(r.studentId).slice(-4)}</span>}</span> },
              { key: 'personName', label: 'Person' },
              { key: 'relation', label: 'Relation', hideOnMobile: true, render: r => r.relation || <span className="text-muted-foreground">—</span> },
              { key: 'method', label: 'Method', badge: true, badgeMap: METHOD_MAP },
              { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
              { key: 'status', label: 'Status', badge: true },
              { key: 'time', label: 'Time', dateTime: true, hideOnMobile: true },
            ]}
            filters={[{ key: 'status', label: 'Statuses', options: [{ label: 'Verified', value: 'VERIFIED' }, { label: 'Pending', value: 'PENDING' }, { label: 'Rejected', value: 'REJECTED' }] }]}
            defaultSort={{ sortBy: 'time', sortDir: 'desc' }}
            searchPlaceholder="Search person…"
            emptyTitle="No pickup logs yet"
            emptyDescription="Use “Verify & Log” to record the first handover."
            rowActions={(row) => row.status === 'PENDING' ? (
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
                onClick={async () => {
                  try {
                    await updateOne('api/security/pickups', row.id, { status: 'VERIFIED' })
                    toast.success(`Verified — ${studentMap[row.studentId]?.name || 'student'} handed over to ${row.personName} at ${fmtDateTime(new Date())}.`)
                    setRefreshKey(k => k + 1)
                  } catch (e) {
                    toast.error((e as ApiError)?.message || 'Could not verify the log.')
                  }
                }}>
                <ShieldCheck className="h-3.5 w-3.5" /> Verify
              </Button>
            ) : null}
          />
        </div>
      </div>
    </div>
  )
}
