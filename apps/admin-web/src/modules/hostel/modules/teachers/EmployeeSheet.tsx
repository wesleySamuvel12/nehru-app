'use client'

import * as React from 'react'
import { api, updateOne, ApiError } from '@/lib/api-client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, EmptyState } from '@/components/erp/ui'
import { initials, fmtDate, titleCase, inr } from '@/lib/format'
import { toast } from 'sonner'
import { Upload, Loader2, FileText, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react'


export interface EmployeeDoc { name: string; url: string; type?: string; uploadedAt?: string }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="truncate text-sm font-medium">{value ?? '—'}</div>
    </div>
  )
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null
  const ms = new Date(d).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

function ExpiryBadge({ label, date }: { label: string; date: string | null | undefined }) {
  const days = daysUntil(date)
  if (days === null) return null
  const expired = days < 0
  const soon = days <= 90
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${expired ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400' : soon ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300'}`}>
      <AlertTriangle className="h-3 w-3" />
      {label}: {expired ? `expired ${Math.abs(days)}d ago` : soon ? `expires in ${days}d` : fmtDate(date)}
    </span>
  )
}

/** Staff profile drawer with documents upload and document-expiry alerts. */
export default function EmployeeSheet({ employeeId, open, onOpenChange, onSaved }: {
  employeeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [employee, setEmployee] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const reload = React.useCallback(() => {
    if (!employeeId || !open) return
    let alive = true
    setLoading(true)
    setError(null)
    api<{ data: any }>(`/api/employees/${employeeId}`)
      .then(res => { if (alive) setEmployee(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [employeeId, open])

  React.useEffect(() => { reload() }, [reload])
  React.useEffect(() => { if (!open) setEmployee(null) }, [open])

  const docs: EmployeeDoc[] = React.useMemo(() => {
    try {
      const p = JSON.parse(employee?.documents || '[]')
      return Array.isArray(p) ? p : []
    } catch { return [] }
  }, [employee])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !employee) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Upload failed. Please try again.')
      const doc: EmployeeDoc = { name: body.data.name, url: body.data.url, type: body.data.type, uploadedAt: new Date().toISOString() }
      await updateOne('api/employees', employee.id, { documents: JSON.stringify([...docs, doc]) })
      toast.success('Document uploaded.')
      reload()
      onSaved?.()
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {loading && !employee ? (
          <div className="space-y-4 p-5 pt-12">
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="p-5 pt-12">
            <EmptyState title="Unable to load staff member" description={error} />
            <div className="flex justify-center"><Button variant="outline" size="sm" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>
          </div>
        ) : employee ? (
          <>
            <SheetHeader className="border-b pr-12">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 border">
                  {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">{initials(fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">{fullName}</SheetTitle>
                  <SheetDescription className="truncate">
                    {employee.designation}{employee.department ? ` · ${employee.department.name}` : ''}
                  </SheetDescription>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge value={employee.status} />
                    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {employee.isTeacher ? 'Teaching' : 'Non-teaching'}
                    </span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 p-4 sm:p-5">
              {/* Expiry alerts */}
              {(employee.visaExpiry || employee.licenseExpiry || employee.certExpiry) && (
                <div className="flex flex-wrap gap-1.5">
                  <ExpiryBadge label="Visa" date={employee.visaExpiry} />
                  <ExpiryBadge label="License" date={employee.licenseExpiry} />
                  <ExpiryBadge label="Certificate" date={employee.certExpiry} />
                </div>
              )}

              {/* Employment */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employment</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Employee No" value={employee.employeeNo} />
                  <Field label="Type" value={employee.isTeacher ? 'Teaching' : 'Non-teaching'} />
                  <Field label="Employment" value={titleCase(employee.employmentType)} />
                  <Field label="Department" value={employee.department?.name} />
                  <Field label="Joining Date" value={fmtDate(employee.joiningDate)} />
                  <Field label="Monthly Salary" value={employee.salary ? inr(employee.salary) : '—'} />
                  <Field label="Qualification" value={employee.qualification} />
                  <Field label="Specialization" value={employee.specialization} />
                  <Field label="Bank Account" value={employee.bankAccount} />
                </div>
              </div>

              <Separator />

              {/* Personal & contact */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal & Contact</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Gender" value={titleCase(employee.gender)} />
                  <Field label="Date of Birth" value={fmtDate(employee.dob)} />
                  <Field label="Phone" value={employee.phone} />
                  <Field label="Email" value={employee.email} />
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{employee.address || '—'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Documents ({docs.length})
                  </h4>
                  <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                  <Button variant="outline" size="sm" className="h-8" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
                {docs.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No documents yet — upload contracts, certificates, ID proofs…</p>
                ) : (
                  <ul className="space-y-1.5">
                    {docs.map((d, i) => (
                      <li key={`${d.url}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                        <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
