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
import { GraduationCap, Bus, Building2, RefreshCw, UserPlus2, Eye } from 'lucide-react'


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
  { name: 'admissionNo', label: 'Admission No', type: 'text', placeholder: 'GWS00001', help: 'Leave blank to auto-generate' },
  { name: 'rollNo', label: 'Roll No', type: 'text', placeholder: '01' },
  {
    name: 'classId', label: 'Class', type: 'select',
    optionsLoader: async () => (await api<{ data: any }>('/api/lookups')).data.classes.map((c: any) => ({ label: c.name, value: c.id })),
  },
  {
    name: 'sectionId', label: 'Section', type: 'select',
    optionsLoader: async () => (await api<{ data: any }>('/api/lookups')).data.classes.flatMap((c: any) => c.sections.map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id }))),
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
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'textarea', colSpan: 2, placeholder: 'House / street, area, Mumbai' },
  { name: 'status', label: 'Status', type: 'select', options: STUDENT_STATUSES.map(s => ({ label: titleCase(s), value: s })), defaultValue: 'ACTIVE' },
]

const rowToForm = (row: any): Record<string, any> => ({
  firstName: row.firstName ?? '', lastName: row.lastName ?? '', gender: row.gender ?? 'MALE',
  dob: row.dob ? String(row.dob).slice(0, 10) : '', admissionNo: row.admissionNo ?? '', rollNo: row.rollNo ?? '',
  classId: row.classId ?? '', sectionId: row.sectionId ?? '', parentId: row.parentId ?? '',
  bloodGroup: row.bloodGroup ?? '', house: row.house ?? '', club: row.club ?? '',
  phone: row.phone ?? '', email: row.email ?? '', address: row.address ?? '', status: row.status ?? 'ACTIVE',
})

export default function StudentsModule() {
  const { setModule } = useErp()
  const [stats, setStats] = React.useState<any>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [lookups, setLookups] = React.useState<any>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [sheetId, setSheetId] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

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
    api<{ data: any }>('/api/lookups')
      .then(res => { if (alive) setLookups(res.data) })
      .catch(() => { if (alive) setLookups(null) })
    return () => { alive = false }
  }, [])

  const refreshAll = React.useCallback(() => setRefreshKey(k => k + 1), [])

  const filters: FilterDef[] = React.useMemo(() => {
    const classOpts = (lookups?.classes || []).map((c: any) => ({ label: c.name, value: c.id }))
    const sectionOpts = (lookups?.classes || []).flatMap((c: any) => c.sections.map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id })))
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
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px] w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
