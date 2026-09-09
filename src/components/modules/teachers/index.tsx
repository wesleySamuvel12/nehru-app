'use client'

import * as React from 'react'
import { api, list } from '@/lib/api-client'
import { PageHeader, StatCard } from '@/components/erp/ui'
import { DataTable, Column, FormField, FilterDef } from '@/components/erp/DataTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/erp/ui'
import EmployeeSheet from './EmployeeSheet'
import { initials, fmtDate } from '@/lib/format'
import { RefreshCw, Users, GraduationCap, Building2, CalendarOff, FileWarning } from 'lucide-react'


const STAFF_STATUSES = ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']

const staffColumns: Column[] = [
  {
    key: 'employeeNo', label: 'Emp. No', sortable: true, className: 'font-mono text-xs',
  },
  {
    key: 'firstName', label: 'Name', sortable: true,
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
  { key: 'designation', label: 'Designation', sortable: true },
  { key: 'department', label: 'Department', sortable: false, render: (r: any) => r.department?.name || '—' },
  { key: 'phone', label: 'Phone', hideOnMobile: true, className: 'font-mono text-xs', render: (r: any) => r.phone || '—' },
  {
    key: 'isTeacher', label: 'Type', sortable: false,
    render: (r: any) => (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        {r.isTeacher ? 'Teaching' : 'Non-teaching'}
      </span>
    ),
  },
  { key: 'joiningDate', label: 'Joined', date: true, hideOnMobile: true },
  { key: 'status', label: 'Status', badge: true },
]

const staffFields: FormField[] = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }], defaultValue: 'MALE' },
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  { name: 'employeeNo', label: 'Employee No', type: 'text', placeholder: 'EMP0001', help: 'Leave blank to auto-generate' },
  { name: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'Senior Teacher — Physics' },
  {
    name: 'departmentId', label: 'Department', type: 'select',
    optionsLoader: async () => (await api<{ data: any }>('/api/lookups')).data.departments.map((d: any) => ({ label: d.name, value: d.id })),
  },
  { name: 'isTeacher', label: 'Teaching Staff', type: 'switch', help: 'Turn on if this employee teaches' },
  { name: 'qualification', label: 'Qualification', type: 'text', placeholder: 'M.Sc, B.Ed' },
  { name: 'specialization', label: 'Specialization', type: 'text', placeholder: 'Physics' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'joiningDate', label: 'Joining Date', type: 'date' },
  { name: 'employmentType', label: 'Employment Type', type: 'select', options: [{ label: 'Full Time', value: 'FULL_TIME' }, { label: 'Part Time', value: 'PART_TIME' }, { label: 'Contract', value: 'CONTRACT' }], defaultValue: 'FULL_TIME' },
  { name: 'salary', label: 'Monthly Salary (₹)', type: 'number', min: 0 },
  { name: 'status', label: 'Status', type: 'select', options: STAFF_STATUSES.map(s => ({ label: s.replace('_', ' '), value: s })), defaultValue: 'ACTIVE' },
]

const staffRowToForm = (row: any): Record<string, any> => ({
  firstName: row.firstName ?? '', lastName: row.lastName ?? '', gender: row.gender ?? 'MALE',
  dob: row.dob ? String(row.dob).slice(0, 10) : '', employeeNo: row.employeeNo ?? '', designation: row.designation ?? '',
  departmentId: row.departmentId ?? '', isTeacher: !!row.isTeacher, qualification: row.qualification ?? '',
  specialization: row.specialization ?? '', email: row.email ?? '', phone: row.phone ?? '',
  joiningDate: row.joiningDate ? String(row.joiningDate).slice(0, 10) : '', employmentType: row.employmentType ?? 'FULL_TIME',
  salary: row.salary ?? 0, status: row.status ?? 'ACTIVE',
})

const departmentColumns: Column[] = [
  { key: 'name', label: 'Department', sortable: true, render: (r: any) => <span className="font-medium">{r.name}</span> },
  { key: 'headName', label: 'Head', sortable: false, render: (r: any) => r.headName || '—' },
  { key: 'employees', label: 'Staff Count', sortable: false, render: (r: any) => r._count?.employees ?? 0 },
]

const departmentFields: FormField[] = [
  { name: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'Science' },
  { name: 'headName', label: 'Department Head', type: 'text', placeholder: 'Dr. Meera Iyer' },
]

export default function TeachersModule() {
  const [stats, setStats] = React.useState<any>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [lookups, setLookups] = React.useState<any>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [sheetId, setSheetId] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const loadStats = React.useCallback(() => {
    let alive = true
    setStatsLoading(true)
    list('api/employees/stats')
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

  const staffFilters: FilterDef[] = React.useMemo(() => [
    { key: 'departmentId', label: 'Departments', options: (lookups?.departments || []).map((d: any) => ({ label: d.name, value: d.id })) },
    { key: 'status', label: 'Statuses', options: STAFF_STATUSES.map(s => ({ label: s.replace('_', ' '), value: s })) },
  ], [lookups])

  const openSheet = React.useCallback((row: any) => { setSheetId(row.id); setSheetOpen(true) }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teachers & Staff"
        subtitle="Employee directory, teaching staff and departments."
        breadcrumbs={['Operations', 'Teachers & Staff']}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px] w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Staff" value={stats?.total ?? '—'} icon={<Users className="h-5 w-5" />} tone="info" hint="All employees on record" />
          <StatCard label="Teachers" value={stats?.teachers ?? '—'} icon={<GraduationCap className="h-5 w-5" />} tone="success" hint="Teaching staff" />
          <StatCard label="Departments" value={stats?.departments ?? '—'} icon={<Building2 className="h-5 w-5" />} tone="default" />
          <StatCard label="On Leave" value={stats?.onLeave ?? '—'} icon={<CalendarOff className="h-5 w-5" />} tone="warning" hint={stats?.expiringDocs ? `${stats.expiringDocs} with docs expiring ≤90d` : 'Active leave records'} />
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex w-full flex-wrap sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">All Staff</TabsTrigger>
          <TabsTrigger value="teaching" className="flex-1 sm:flex-none">Teaching Staff</TabsTrigger>
          <TabsTrigger value="departments" className="flex-1 sm:flex-none">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DataTable
            endpoint="api/employees"
            columns={staffColumns}
            fields={staffFields}
            rowToForm={staffRowToForm}
            filters={staffFilters}
            defaultSort={{ sortBy: 'employeeNo', sortDir: 'asc' }}
            searchPlaceholder="Search name, employee no or phone…"
            exportEntity="employees"
            createLabel="Add Staff"
            refreshKey={refreshKey}
            onRowClick={openSheet}
            emptyTitle="No staff members found"
            emptyDescription="Try a different search, or add a new employee to the directory."
            emptyAction={<Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4" /> Reset view</Button>}
          />
        </TabsContent>

        <TabsContent value="teaching" className="space-y-4">
          <DataTable
            endpoint="api/employees/teachers"
            columns={staffColumns}
            fields={staffFields}
            rowToForm={staffRowToForm}
            filters={staffFilters}
            defaultSort={{ sortBy: 'employeeNo', sortDir: 'asc' }}
            searchPlaceholder="Search teaching staff…"
            createLabel="Add Teacher"
            refreshKey={refreshKey}
            onRowClick={openSheet}
            emptyTitle="No teaching staff found"
            emptyDescription="Add a teacher with the “Teaching Staff” switch turned on."
            emptyAction={<Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4" /> Reset view</Button>}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DataTable
            endpoint="api/departments"
            columns={departmentColumns}
            fields={departmentFields}
            defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
            searchPlaceholder="Search departments…"
            createLabel="Add Department"
            refreshKey={refreshKey}
            emptyTitle="No departments yet"
            emptyDescription="Create departments to organise staff — e.g. Science, Humanities, Administration."
            emptyAction={<Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4" /> Reset view</Button>}
          />
        </TabsContent>
      </Tabs>

      <EmployeeSheet employeeId={sheetId} open={sheetOpen} onOpenChange={setSheetOpen} onSaved={refreshAll} />
    </div>
  )
}
