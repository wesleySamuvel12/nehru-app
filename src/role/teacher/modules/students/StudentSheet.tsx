'use client'

import * as React from 'react'
import { api, updateOne, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, EmptyState } from '@/components/erp/ui'
import { initials, fmtDate, titleCase } from '@/lib/format'
import { toast } from 'sonner'
import {
  Upload, Loader2, Wallet, CalendarCheck, FileText, UserRound, Phone,
  Mail, MapPin, ExternalLink, Save, RefreshCw, GraduationCap, ClipboardCheck, BookOpen
} from 'lucide-react'

export interface StudentDoc { name: string; url: string; type?: string; uploadedAt?: string }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="truncate text-sm font-medium">{value ?? '—'}</div>
    </div>
  )
}

/** Enhanced Student Profile Drawer with Live Academic Performance */
export default function StudentSheet({ studentId, open, onOpenChange, onSaved }: {
  studentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { setModule } = useErp()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState('')
  const [savingNotes, setSavingNotes] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setData(null)
    } else {
      setLoading(true)
    }
    onOpenChange(nextOpen)
  }

  const reload = React.useCallback(() => {
    setLoading(true)
    setError(null)
    setRefreshKey(k => k + 1)
  }, [])

  React.useEffect(() => {
    if (!studentId || !open) return
    let alive = true

    // Attempt specialized teacher portal detail route with fallback
    api<{ data: any }>(`/api/portal/teacher/students/${studentId}`)
      .then(res => {
        if (!alive) return
        setData(res.data)
        setNotes(res.data?.student?.notes || '')
      })
      .catch(() => {
        // Fallback to basic student detail endpoint
        return api<{ data: any }>(`/api/students/${studentId}`).then(res => {
          if (!alive) return
          setData({ student: res.data, academicPerformance: null })
          setNotes(res.data?.notes || '')
        })
      })
      .catch((e: ApiError) => {
        if (alive) setError(e.message || 'Unable to load student profile.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [studentId, open, refreshKey])

  const student = data?.student
  const academic = data?.academicPerformance

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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
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
            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" onClick={reload}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          </div>
        ) : student ? (
          <>
            <SheetHeader className="border-b p-5 pr-12 bg-muted/20">
              <div className="flex items-start gap-3.5">
                <Avatar className="h-14 w-14 border border-border/80 shadow-xs">
                  {student.photoUrl && <AvatarImage src={student.photoUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                    {initials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg font-bold">{fullName}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-foreground">{student.admissionNo}</span>
                    {student.klass && (
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {student.klass.name}{student.section ? ` - ${student.section.name}` : ''}
                      </Badge>
                    )}
                    {student.rollNo && <span className="text-xs text-muted-foreground">Roll: {student.rollNo}</span>}
                  </SheetDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge value={student.status} />
                    {academic?.attendance && (
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {academic.attendance.attendanceRate}% Attendance
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="p-5 space-y-5">
              {/* Quick Module Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    onOpenChange(false)
                    setModule('attendance')
                  }}
                >
                  <CalendarCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> Attendance Records
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    onOpenChange(false)
                    setModule('examinations')
                  }}
                >
                  <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-primary" /> Marks & Gradebook
                </Button>
              </div>

              {/* Tabbed Profile Views */}
              <Tabs defaultValue="academic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger value="academic" className="text-xs">Academic</TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs">Bio & Contact</TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs">Docs & Notes</TabsTrigger>
                </TabsList>

                {/* Tab 1: Academic Performance */}
                <TabsContent value="academic" className="space-y-4 mt-4">
                  {/* Attendance Performance */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" /> Attendance Overview
                      </h4>
                      <span className="text-sm font-bold text-foreground">
                        {academic?.attendance?.attendanceRate ?? 100}%
                      </span>
                    </div>
                    <Progress value={academic?.attendance?.attendanceRate ?? 100} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="font-semibold text-foreground">{academic?.attendance?.totalSessions ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Recorded Days</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
                        <p className="font-semibold">{academic?.attendance?.presentCount ?? 0}</p>
                        <p className="text-[10px]">Present</p>
                      </div>
                      <div className="rounded-lg bg-rose-500/10 p-2 text-rose-700 dark:text-rose-400">
                        <p className="font-semibold">{academic?.attendance?.absentCount ?? 0}</p>
                        <p className="text-[10px]">Absent</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Exam Marks */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Examination Marks
                    </h4>
                    {academic?.examinations?.recentMarks?.length ? (
                      <div className="space-y-2">
                        {academic.examinations.recentMarks.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{m.subjectName}</p>
                              <p className="text-[11px] text-muted-foreground">{m.examName}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-foreground">{m.isAbsent ? 'Absent' : `${m.marksObtained}/${m.maxMarks}`}</span>
                              <Badge variant="outline" className="ml-2 text-[10px] py-0 font-bold">
                                {m.grade}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No exam mark records found for this student.</p>
                    )}
                  </div>

                  {/* Subject-Wise Performance Breakdown */}
                  {academic?.examinations?.subjectPerformance?.length ? (
                    <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-600" /> Subject Academic Performance
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {academic.examinations.subjectPerformance.map((sp: any) => (
                          <div key={sp.subject} className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between">
                            <div className="min-w-0 pr-1">
                              <p className="font-semibold text-foreground truncate">{sp.subject}</p>
                              <p className="text-[10px] text-muted-foreground">{sp.assessmentsCount} assessment{sp.assessmentsCount > 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-foreground">{sp.averagePercentage}%</span>
                              <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 font-semibold">
                                {sp.latestGrade}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Assignment Submissions */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-amber-600" /> LMS & Assignments
                    </h4>
                    {academic?.assignments?.recent?.length ? (
                      <div className="space-y-2">
                        {academic.assignments.recent.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-foreground truncate">{s.title}</p>
                              <p className="text-[10px] text-muted-foreground">Submitted: {fmtDate(s.submittedAt)}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {s.marks !== null && (
                                <span className="font-medium text-foreground">{s.marks}/{s.maxMarks}</span>
                              )}
                              <StatusBadge value={s.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No homework or assignment submissions on record.</p>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 2: Bio & Contact */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  {/* Academic Profile */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolled Details</h4>
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

                  {/* Parent & Contact */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" /> Guardian Information
                    </h4>
                    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{student.parent?.name || 'No guardian linked'}</p>
                        {student.parent?.relation && (
                          <Badge variant="secondary" className="text-[10px]">{titleCase(student.parent.relation)}</Badge>
                        )}
                      </div>
                      {student.parent?.occupation && (
                        <p className="text-xs text-muted-foreground">Occupation: {student.parent.occupation}</p>
                      )}
                      <div className="space-y-1.5 pt-1 text-xs">
                        {student.parent?.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {student.parent.phone}
                          </span>
                        )}
                        {student.parent?.email && (
                          <span className="flex items-center gap-1.5 break-all">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {student.parent.email}
                          </span>
                        )}
                        {student.address && (
                          <span className="flex items-start gap-1.5 pt-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" /> {student.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Documents & Notes */}
                <TabsContent value="docs" className="space-y-4 mt-4">
                  {/* Documents */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Attachments ({docs.length})
                      </h4>
                      <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
                        {uploading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Upload className="mr-1.5 h-3 w-3" />}
                        {uploading ? 'Uploading…' : 'Upload File'}
                      </Button>
                    </div>

                    {docs.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                        No documents attached. You can upload student identification, medical certificates, or academic forms.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {docs.map((d, i) => (
                          <li key={`${d.url}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                            <span className="truncate flex-1 font-medium">{d.name}</span>
                            <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline font-semibold">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Teacher Notes */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faculty & Counsellor Remarks</h4>
                    <textarea
                      className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Special learning instructions, classroom remarks, student achievements..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" className="h-8 text-xs rounded-lg" onClick={saveNotes} disabled={savingNotes}>
                        {savingNotes ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                        Save Remarks
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
