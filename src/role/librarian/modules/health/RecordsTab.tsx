'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard, StatusBadge } from '@/components/erp/ui'
import { HeartPulse, Loader2, Syringe, Stethoscope } from 'lucide-react'
import { list, ApiError } from '@/lib/api-client'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { useStudents, BLOOD_GROUPS, SEVERITY_BADGE_MAP, DOSE_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const BLOOD_GROUP_BADGE: Record<string, string> = {
  'A+': 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  'B+': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'O+': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'AB+': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

export default function RecordsTab() {
  const dir = useStudents()
  const [profile, setProfile] = React.useState<any | null>(null)
  const [visits, setVisits] = React.useState<any[]>([])
  const [vaccinations, setVaccinations] = React.useState<any[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)

  const studentFilterOptions = React.useMemo(
    () => dir.students.slice(0, 200).map((s: any) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
    [dir.students],
  )

  const openProfile = (row: any) => {
    setProfile(row)
    setVisits([]); setVaccinations([])
    setHistoryLoading(true)
    Promise.all([
      list<any>('api/health/visits', { all: 1, studentId: row.studentId, sortBy: 'date', sortDir: 'desc' }).catch(() => ({ data: [] })),
      list<any>('api/health/vaccinations', { all: 1, studentId: row.studentId, sortBy: 'date', sortDir: 'desc' }).catch(() => ({ data: [] })),
    ]).then(([v, vx]) => { setVisits(v.data); setVaccinations(vx.data) })
      .finally(() => setHistoryLoading(false))
  }

  const student = profile ? dir.studentOf(profile.studentId) : null

  return (
    <>
      <DataTable
        endpoint="api/health/records"
        searchPlaceholder="Search blood group, allergy…"
        exportEntity={undefined}
        defaultSort={{ sortBy: 'id', sortDir: 'desc' }}
        emptyTitle="No health records yet"
        emptyDescription="Create a health record per student with vitals, allergies and emergency contacts."
        filters={[
          { key: 'bloodGroup', label: 'Blood groups', options: BLOOD_GROUPS.map((b) => ({ label: b, value: b })) },
        ]}
        onRowClick={openProfile}
        fields={[
          {
            name: 'studentId', label: 'Student', type: 'select', required: true, colSpan: 2,
            optionsLoader: async () => dir.students.map((s: any) => ({ label: `${s.firstName} ${s.lastName}${s.admissionNo ? ` · ${s.admissionNo}` : ''}`, value: s.id })),
            help: dir.error ? 'Student directory unavailable — records can still be edited.' : undefined,
          },
          { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS.map((b) => ({ label: b, value: b })) },
          { name: 'heightCm', label: 'Height (cm)', type: 'number', min: 0 },
          { name: 'weightKg', label: 'Weight (kg)', type: 'number', min: 0 },
          { name: 'allergies', label: 'Allergies', type: 'text', placeholder: 'e.g. Peanuts, Dust', help: 'Comma separated' },
          { name: 'chronicConditions', label: 'Chronic Conditions', type: 'text', placeholder: 'e.g. Mild Asthma' },
          { name: 'medications', label: 'Current Medications', type: 'text' },
          { name: 'emergencyContact', label: 'Emergency Contact', type: 'tel' },
          { name: 'familyDoctor', label: 'Family Doctor', type: 'text' },
          { name: 'insuranceNo', label: 'Insurance No.', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
        ]}
        columns={[
          { key: 'studentId', label: 'Student', render: (row) => <span className="font-medium">{dir.nameOf(row.studentId)}</span> },
          { key: 'bloodGroup', label: 'Blood', badge: true, badgeMap: BLOOD_GROUP_BADGE },
          { key: 'heightCm', label: 'Height (cm)', render: (row) => (row.heightCm ? <span className="tabular-nums">{row.heightCm}</span> : '—') },
          { key: 'weightKg', label: 'Weight (kg)', render: (row) => (row.weightKg ? <span className="tabular-nums">{row.weightKg}</span> : '—') },
          {
            key: 'allergies', label: 'Allergies',
            render: (row) => row.allergies
              ? <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">{row.allergies}</Badge>
              : <span className="text-muted-foreground">None</span>,
          },
          { key: 'chronicConditions', label: 'Chronic', render: (row) => row.chronicConditions || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
          { key: 'lastScreeningAt', label: 'Last Screening', date: true, hideOnMobile: true },
        ]}
      />

      {/* Student health profile sheet */}
      <Sheet open={!!profile} onOpenChange={(o) => !o && setProfile(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-500" />
              {dir.nameOf(profile?.studentId)}
            </SheetTitle>
            <SheetDescription>
              {student ? `${student.admissionNo || ''}${student.klass ? ` · ${student.klass.name}` : ''}${student.section ? `-${student.section.name}` : ''}` : 'Health profile'}
            </SheetDescription>
          </SheetHeader>

          {profile && (
            <div className="space-y-5 px-4 pb-8">
              {/* Vitals & flags */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Blood Group</p>
                  <p className="mt-1 text-lg font-semibold">{profile.bloodGroup || '—'}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Height / Weight</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {profile.heightCm ? `${profile.heightCm} cm` : '—'} / {profile.weightKg ? `${profile.weightKg} kg` : '—'}
                  </p>
                </div>
              </div>

              {(profile.allergies || profile.chronicConditions || profile.medications) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Medical flags</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.allergies && <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">Allergy: {profile.allergies}</Badge>}
                    {profile.chronicConditions && <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400">Chronic: {profile.chronicConditions}</Badge>}
                    {profile.medications && <Badge variant="secondary">{profile.medications}</Badge>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Emergency contact:</span> {profile.emergencyContact || '—'}</p>
                <p><span className="text-muted-foreground">Family doctor:</span> {profile.familyDoctor || '—'}</p>
                <p><span className="text-muted-foreground">Insurance no.:</span> {profile.insuranceNo || '—'}</p>
                <p><span className="text-muted-foreground">Last screening:</span> {fmtDate(profile.lastScreeningAt)}</p>
              </div>
              {profile.notes && <p className="rounded-lg bg-muted p-3 text-sm">{profile.notes}</p>}

              <Separator />

              {/* Visit history */}
              <SectionCard title="Clinic Visit History" description={`${visits.length} visit${visits.length === 1 ? '' : 's'} on record`} contentClassName="p-0">
                {historyLoading ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
                ) : visits.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No clinic visits recorded.</p>
                ) : (
                  <ul className="max-h-64 divide-y overflow-y-auto">
                    {visits.map((v: any) => (
                      <li key={v.id} className="flex items-start gap-3 px-4 py-3">
                        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{v.reason}</p>
                            <StatusBadge value={v.severity} map={SEVERITY_BADGE_MAP} />
                          </div>
                          <p className="text-xs text-muted-foreground">{fmtDate(v.date)} · {v.diagnosis || '—'}{v.attendedBy ? ` · ${v.attendedBy}` : ''}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Vaccination history */}
              <SectionCard title="Vaccination History" description={`${vaccinations.length} dose${vaccinations.length === 1 ? '' : 's'} administered`} contentClassName="p-0">
                {historyLoading ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
                ) : vaccinations.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No vaccinations recorded.</p>
                ) : (
                  <ul className="max-h-64 divide-y overflow-y-auto">
                    {vaccinations.map((v: any) => (
                      <li key={v.id} className="flex items-start gap-3 px-4 py-3">
                        <Syringe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{v.vaccine}</p>
                            <StatusBadge value={v.dose} map={DOSE_BADGE_MAP} />
                            <StatusBadge value={v.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(v.date)}{v.nextDueDate ? ` · next due ${fmtDate(v.nextDueDate)}` : ''}{v.administeredBy ? ` · ${v.administeredBy}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <p className="text-center text-xs text-muted-foreground">Visit history fetched live — {fmtDateTime(new Date())}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
