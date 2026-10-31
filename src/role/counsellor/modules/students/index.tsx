'use client'

import * as React from 'react'
import { list, api, updateOne, ApiError } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge } from '@/components/erp/ui'
import { DataTable, Column, FormField, FilterDef } from '@/components/erp/DataTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import StudentSheet from './StudentSheet'
import { initials, fmtDate, titleCase } from '@/lib/format'
import { toast } from 'sonner'
import { GraduationCap, Bus, Building2, RefreshCw, UserPlus2, Eye, Upload, FileUp, Loader2 } from 'lucide-react'


const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const CLUBS = ['Robotics', 'Eco Club', 'Debate', 'Music', 'Chess', 'Photography', 'Art & Craft', 'Sports', 'Coding']
const STUDENT_STATUSES = ['ACTIVE', 'ALUMNI', 'WITHDRAWN', 'TRANSFERRED', 'GRADUATED']

const columns: Column[] = [
  {
    key: 'firstName', label: 'Student', sortable: true,
    render: (row: any) => {
      const name = `${row.firstName} ${row.lastName}`
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border">
            {row.photoUrl && <AvatarImage src={row.photoUrl} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate font-medium">{name}</span>
        </div>
      )
    },
  },
  { key: 'admissionNo', label: 'Admission No', sortable: true, className: 'font-mono text-xs' },
  { key: 'klass', label: 'Class', sortable: false, render: (r: any) => r.klass?.name || '—' },
  { key: 'section', label: 'Section', sortable: false, render: (r: any) => r.section?.name || '—' },
  { key: 'rollNo', label: 'Roll No', hideOnMobile: true },
  { key: 'gender', label: 'Gender', hideOnMobile: true, render: (r: any) => titleCase(r.gender) },
  { key: 'parent', label: 'Parent', sortable: false, hideOnMobile: true, render: (r: any) => r.parent?.name || '—' },
  { key: 'status', label: 'Status', badge: true },
  { key: 'dob', label: 'Date of Birth', date: true, hideOnMobile: true },
]

const fields: FormField[] = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }], defaultValue: 'MALE' },
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  { name: 'admissionNo', label: 'Admission No', type: 'text', placeholder: 'NIS00001', help: 'Leave blank to auto-generate' },
  { name: 'rollNo', label: 'Roll No', type: 'text', placeholder: '01' },
  {
    name: 'classId', label: 'Class', type: 'select',
    optionsLoader: async () => {
      try {
        const res = await api<{ data?: any; classes?: any[] }>('/api/lookups')
        const cls = res?.data?.classes || res?.classes || []
        if (cls.length) return cls.map((c: any) => ({ label: c.name, value: c.id }))
      } catch {}
      const res = await api<{ data: any[] }>('/api/academics/classes?all=1')
      return (res?.data || []).map((c: any) => ({ label: c.name, value: c.id }))
    },
  },
  {
    name: 'sectionId', label: 'Section', type: 'select',
    optionsLoader: async () => {
      try {
        const res = await api<{ data?: any; classes?: any[] }>('/api/lookups')
        const cls = res?.data?.classes || res?.classes || []
        if (cls.length) {
          return cls.flatMap((c: any) => (c.sections || []).map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id, classId: c.id })))
        }
      } catch {}
      const res = await api<{ data: any[] }>('/api/academics/sections?all=1')
      return (res?.data || []).map((s: any) => ({ label: s.name, value: s.id, classId: s.classId }))
    },
  },
  {
    name: 'parentId', label: 'Parent', type: 'select',
    optionsLoader: async () => (await list('api/parents', { all: true })).data.map((p: any) => ({ label: `${p.name} (${p.phone})`, value: p.id })),
  },
  { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS.map(b => ({ label: b, value: b })) },
  {
    name: 'house', label: 'House', type: 'select',
    optionsLoader: async () => (await api<{ data: any }>('/api/lookups')).data.houses.map((h: any) => ({ label: h.name, value: h.name })),
  },
  { name: 'club', label: 'Club', type: 'select', options: CLUBS.map(c => ({ label: c, value: c })) },
  { name: 'phone', label: 'Student Phone', type: 'tel' },
  { name: 'email', label: 'Student Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'textarea', colSpan: 2, placeholder: 'House / street, area, Mumbai' },
  { name: 'status', label: 'Status', type: 'select', options: STUDENT_STATUSES.map(s => ({ label: titleCase(s), value: s })), defaultValue: 'ACTIVE' },

  // Structured Parents & Guardian Details
  {
    name: 'primaryContact', label: 'Primary Emergency Contact', type: 'select',
    options: [{ label: 'Father', value: 'FATHER' }, { label: 'Mother', value: 'MOTHER' }, { label: 'Guardian', value: 'GUARDIAN' }],
    defaultValue: 'FATHER'
  },
  { name: 'fatherName', label: "Father's Full Name", type: 'text', placeholder: "Mr. Rajesh Sharma" },
  { name: 'fatherPhone', label: "Father's Mobile", type: 'tel', placeholder: "+91 98765 43210" },
  { name: 'fatherEmail', label: "Father's Email", type: 'email', placeholder: "father@example.com" },
  { name: 'fatherOccupation', label: "Father's Occupation", type: 'text', placeholder: "Software Architect" },
  { name: 'fatherAltPhone', label: "Father's Alternate Contact", type: 'tel', placeholder: "Office / Landline" },
  { name: 'fatherLanguage', label: "Father's Primary Language", type: 'text', placeholder: "English, Hindi" },

  { name: 'motherName', label: "Mother's Full Name", type: 'text', placeholder: "Mrs. Sunita Sharma" },
  { name: 'motherPhone', label: "Mother's Mobile", type: 'tel', placeholder: "+91 98765 43211" },
  { name: 'motherEmail', label: "Mother's Email", type: 'email', placeholder: "mother@example.com" },
  { name: 'motherOccupation', label: "Mother's Occupation", type: 'text', placeholder: "Doctor / Professor" },
  { name: 'motherAltPhone', label: "Mother's Alternate Contact", type: 'tel', placeholder: "Clinic / Landline" },
  { name: 'motherLanguage', label: "Mother's Primary Language", type: 'text', placeholder: "English, Marathi" },

  { name: 'guardianName', label: "Guardian's Name (if applicable)", type: 'text' },
  { name: 'guardianRelation', label: "Guardian's Relationship", type: 'text', placeholder: "Uncle / Grandparent" },
  { name: 'guardianPhone', label: "Guardian's Phone", type: 'tel' },
  { name: 'guardianEmail', label: "Guardian's Email", type: 'email' },
]

const rowToForm = (row: any): Record<string, any> => ({
  firstName: row.firstName ?? '', lastName: row.lastName ?? '', gender: row.gender ?? 'MALE',
  dob: row.dob ? String(row.dob).slice(0, 10) : '', admissionNo: row.admissionNo ?? '', rollNo: row.rollNo ?? '',
  classId: row.classId ?? '', sectionId: row.sectionId ?? '', parentId: row.parentId ?? '',
  bloodGroup: row.bloodGroup ?? '', house: row.house ?? '', club: row.club ?? '',
  phone: row.phone ?? '', email: row.email ?? '', address: row.address ?? '', status: row.status ?? 'ACTIVE',
  primaryContact: row.primaryContact ?? 'FATHER',
  fatherName: row.fatherName ?? (row.parent?.relation === 'FATHER' ? row.parent?.name : ''),
  fatherPhone: row.fatherPhone ?? (row.parent?.relation === 'FATHER' ? row.parent?.phone : ''),
  fatherEmail: row.fatherEmail ?? (row.parent?.relation === 'FATHER' ? row.parent?.email : ''),
  fatherOccupation: row.fatherOccupation ?? (row.parent?.relation === 'FATHER' ? row.parent?.occupation : ''),
  fatherAltPhone: row.fatherAltPhone ?? '',
  fatherLanguage: row.fatherLanguage ?? '',
  motherName: row.motherName ?? (row.parent?.relation === 'MOTHER' ? row.parent?.name : ''),
  motherPhone: row.motherPhone ?? (row.parent?.relation === 'MOTHER' ? row.parent?.phone : ''),
  motherEmail: row.motherEmail ?? (row.parent?.relation === 'MOTHER' ? row.parent?.email : ''),
  motherOccupation: row.motherOccupation ?? (row.parent?.relation === 'MOTHER' ? row.parent?.occupation : ''),
  motherAltPhone: row.motherAltPhone ?? '',
  motherLanguage: row.motherLanguage ?? '',
  guardianName: row.guardianName ?? '',
  guardianRelation: row.guardianRelation ?? '',
  guardianPhone: row.guardianPhone ?? '',
  guardianEmail: row.guardianEmail ?? '',
})

export default function StudentsModule() {
  const { setModule } = useErp()
  const [stats, setStats] = React.useState<any>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [lookups, setLookups] = React.useState<any>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [sheetId, setSheetId] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const importFileRef = React.useRef<HTMLInputElement>(null)
  const [importing, setImporting] = React.useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      toast.success(`Successfully imported ${data.imported} student records.`)
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} warnings/skipped: ${data.errors[0]}`)
      }
      refreshAll()
    } catch (err: any) {
      toast.error(err.message || 'CSV Import failed')
    } finally {
      setImporting(false)
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  const loadStats = React.useCallback(() => {
    let alive = true
    setStatsLoading(true)
    list('api/students/stats')
      .then(res => { if (alive) setStats(res.data) })
      .catch(() => { if (alive) setStats(null) })
      .finally(() => { if (alive) setStatsLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { loadStats() }, [loadStats, refreshKey])

  React.useEffect(() => {
    let alive = true
    api<{ data?: any; classes?: any[] }>('/api/lookups')
      .then(res => {
        if (!alive) return
        const data = res?.data || res
        if (data?.classes?.length) {
          setLookups(data)
        } else {
          api<{ data: any[] }>('/api/academics/classes?all=1')
            .then(clsRes => { if (alive && clsRes?.data) setLookups({ classes: clsRes.data }) })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!alive) return
        api<{ data: any[] }>('/api/academics/classes?all=1')
          .then(clsRes => { if (alive && clsRes?.data) setLookups({ classes: clsRes.data }) })
          .catch(() => { if (alive) setLookups(null) })
      })
    return () => { alive = false }
  }, [])

  const refreshAll = React.useCallback(() => setRefreshKey(k => k + 1), [])

  const filters: FilterDef[] = React.useMemo(() => {
    const classOpts = (lookups?.classes || []).map((c: any) => ({ label: c.name, value: c.id }))
    const sectionOpts = (lookups?.classes || []).flatMap((c: any) => (c.sections || []).map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id, classId: c.id })))
    return [
      { key: 'classId', label: 'Classes', options: classOpts },
      { key: 'sectionId', label: 'Sections', options: sectionOpts },
      { key: 'status', label: 'Statuses', options: STUDENT_STATUSES.map(s => ({ label: titleCase(s), value: s })) },
      { key: 'gender', label: 'Genders', options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }] },
    ]
  }, [lookups])

  const bulkActions = React.useMemo(() => [
    {
      label: 'Move to Alumni',
      icon: <GraduationCap className="mr-1.5 h-3.5 w-3.5" />,
      onClick: async (ids: string[], _rows: any[], refresh: () => void) => {
        await Promise.all(ids.map(id => updateOne('api/students', id, { status: 'ALUMNI' })))
        toast.success(`${ids.length} student${ids.length > 1 ? 's' : ''} moved to Alumni.`)
        refresh()
        refreshAll()
      },
    },
  ], [refreshAll])

  const openSheet = React.useCallback((row: any) => { setSheetId(row.id); setSheetOpen(true) }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle="Registry of enrolled students — profiles, class allocation, parents and documents."
        breadcrumbs={['Operations', 'Students']}
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => importFileRef.current?.click()}
            >
              {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileUp className="mr-1.5 h-4 w-4" />}
              {importing ? 'Importing…' : 'Import CSV'}
            </Button>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {statsLoading && !stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px] w-full rounded-xl" />)}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 transition-opacity ${statsLoading ? 'opacity-70' : ''}`}>
          <StatCard label="Total Active" value={stats?.active ?? '—'} icon={<GraduationCap className="h-5 w-5" />} tone="info" hint={`${stats?.total ?? 0} on record`} />
          <StatCard label="New This Term" value={stats?.newThisTerm ?? '—'} icon={<UserPlus2 className="h-5 w-5" />} tone="success" hint={`Admitted since ${stats?.termName || 'term'} start`} />
          <StatCard label="Transport Users" value={stats?.transportUsers ?? '—'} icon={<Bus className="h-5 w-5" />} tone="warning" hint="Active bus allocations" onClick={() => setModule('transport')} />
          <StatCard label="Hostel Boarders" value={stats?.boarders ?? '—'} icon={<Building2 className="h-5 w-5" />} tone="default" hint="Active hostel allocations" onClick={() => setModule('hostel')} />
        </div>
      )}

      <DataTable
        endpoint="api/students"
        columns={columns}
        fields={fields}
        rowToForm={rowToForm}
        filters={filters}
        defaultSort={{ sortBy: 'firstName', sortDir: 'asc' }}
        searchPlaceholder="Search name or admission no…"
        exportEntity="students"
        createLabel="Add Student"
        refreshKey={refreshKey}
        bulkActions={bulkActions}
        onRowClick={openSheet}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`View ${row.firstName} ${row.lastName}`} onClick={(e) => { e.stopPropagation(); openSheet(row) }}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        transformSave={(values, mode) => ({ ...values, ...(mode === 'create' ? { admissionDate: new Date().toISOString() } : {}) })}
        emptyTitle="No students match your filters"
        emptyDescription="Try clearing the class/section filters or search with a different name or admission number."
        emptyAction={<Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4" /> Reset view</Button>}
      />

      <StudentSheet studentId={sheetId} open={sheetOpen} onOpenChange={setSheetOpen} onSaved={refreshAll} />
    </div>
  )
}
