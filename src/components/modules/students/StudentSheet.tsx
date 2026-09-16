'use client'

import * as React from 'react'
import { api, updateOne, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, EmptyState } from '@/components/erp/ui'
import { initials, fmtDate, titleCase } from '@/lib/format'
import { toast } from 'sonner'
import { Upload, Loader2, Wallet, CalendarCheck, FileText, UserRound, Phone, Mail, MapPin, ExternalLink, Save, RefreshCw } from 'lucide-react'


export interface StudentDoc { name: string; url: string; type?: string; uploadedAt?: string }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="truncate text-sm font-medium">{value ?? '—'}</div>
    </div>
  )
}

/** Student profile drawer — shared by the Students and Parents modules. */
export default function StudentSheet({ studentId, open, onOpenChange, onSaved }: {
  studentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { setModule } = useErp()
  const [student, setStudent] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState('')
  const [savingNotes, setSavingNotes] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const reload = React.useCallback(() => {
    if (!studentId || !open) return
    let alive = true
    setLoading(true)
    setError(null)
    api<{ data: any }>(`/api/students/${studentId}`)
      .then(res => {
        if (!alive) return
        setStudent(res.data)
        setNotes(res.data?.notes || '')
      })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [studentId, open])

  React.useEffect(() => { reload() }, [reload])
  React.useEffect(() => { if (!open) setStudent(null) }, [open])

  const docs: StudentDoc[] = React.useMemo(() => {
    try {
      const p = JSON.parse(student?.documents || '[]')
      return Array.isArray(p) ? p : []
    } catch { return [] }
  }, [student])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !student) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Upload failed. Please try again.')
      const doc: StudentDoc = { name: body.data.name, url: body.data.url, type: body.data.type, uploadedAt: new Date().toISOString() }
      await updateOne('api/students', student.id, { documents: JSON.stringify([...docs, doc]) })
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

  const saveNotes = async () => {
    if (!student) return
    setSavingNotes(true)
    try {
      await updateOne('api/students', student.id, { notes })
      toast.success('Notes saved.')
      reload()
      onSaved?.()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSavingNotes(false)
    }
  }

  const fullName = student ? `${student.firstName} ${student.lastName}` : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {loading && !student ? (
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
            <EmptyState title="Unable to load student" description={error} />
            <div className="flex justify-center"><Button variant="outline" size="sm" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>
          </div>
        ) : student ? (
          <>
            <SheetHeader className="border-b pr-12">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 border">
                  {student.photoUrl && <AvatarImage src={student.photoUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                    {initials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">{fullName}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{student.admissionNo}</span>
                    {student.klass && <span>· {student.klass.name}{student.section ? ` — ${student.section.name}` : ''}</span>}
                  </SheetDescription>
                  <div className="mt-1.5"><StatusBadge value={student.status} /></div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 p-4 sm:p-5">
              {/* Quick links */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={() => setModule('fees')}>
                  <Wallet className="mr-1.5 h-4 w-4" /> View Fees
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setModule('attendance')}>
                  <CalendarCheck className="mr-1.5 h-4 w-4" /> View Attendance
                </Button>
              </div>

              {/* Academic info */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Academic</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Class" value={student.klass?.name} />
                  <Field label="Section" value={student.section?.name} />
                  <Field label="Roll No" value={student.rollNo} />
                  <Field label="Gender" value={titleCase(student.gender)} />
                  <Field label="Date of Birth" value={fmtDate(student.dob)} />
                  <Field label="Admitted On" value={fmtDate(student.admissionDate)} />
                  <Field label="Blood Group" value={student.bloodGroup} />
                  <Field label="House" value={student.house} />
                  <Field label="Club" value={student.club} />
                  <Field label="Class Teacher" value={student.section?.teacherName} />
                </div>
              </div>

              <Separator />

              {/* Parent & contact */}
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" /> Parent & Contact
                </h4>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-sm font-semibold">{student.parent?.name || 'No parent linked'}</p>
                  {student.parent ? (
                    <p className="text-xs text-muted-foreground">{titleCase(student.parent.relation)}{student.parent.occupation ? ` · ${student.parent.occupation}` : ''}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Link a parent from the edit form.</p>
                  )}
                  <div className="mt-2 flex flex-col gap-1.5 text-sm">
                    {student.parent?.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{student.parent.phone}</span>
                    )}
                    {student.parent?.email && (
                      <span className="flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{student.parent.email}</span>
                    )}
                    {student.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{student.phone} <span className="text-xs text-muted-foreground">(student)</span></span>
                    )}
                    {student.email && (
                      <span className="flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{student.email}</span>
                    )}
                    {student.address && (
                      <span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{student.address}</span>
                    )}
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
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No documents yet — upload birth certificate, transfer certificate, reports…</p>
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

              <Separator />

              {/* Notes */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h4>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Counsellor remarks, achievements, special care instructions…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" className="h-8" onClick={saveNotes} disabled={savingNotes}>
                    {savingNotes ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
