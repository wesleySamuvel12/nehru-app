'use client'

import * as React from 'react'
import { list, ApiError } from '@/lib/api-client'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui'
import { DataTable, Column, FormField } from '@/components/erp/DataTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import StudentSheet from '@/role/school-admin/modules/students/StudentSheet'
import { initials, titleCase } from '@/lib/format'
import { RefreshCw, Users, UserRound, UserRoundCheck, Mail, Loader2 } from 'lucide-react'


const columns: Column[] = [
  {
    key: 'name', label: 'Name', sortable: true,
    render: (row: any) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 border">
          {row.photoUrl && <AvatarImage src={row.photoUrl} alt={row.name} />}
          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initials(row.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate font-medium">{row.name}</span>
      </div>
    ),
  },
  { key: 'relation', label: 'Relation', render: (r: any) => titleCase(r.relation) },
  { key: 'phone', label: 'Phone', className: 'font-mono text-xs' },
  { key: 'email', label: 'Email', hideOnMobile: true, render: (r: any) => r.email || '—' },
  { key: 'occupation', label: 'Occupation', hideOnMobile: true, render: (r: any) => r.occupation || '—' },
  { key: 'children', label: 'Children', sortable: false, render: (r: any) => r._count?.students ?? '—' },
  {
    key: 'status', label: 'Status', sortable: false,
    render: (r: any) => <StatusBadge value={(r._count?.students ?? 0) > 0 ? 'ACTIVE' : 'PENDING'} />,
  },
]

const fields: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Rajesh Malhotra' },
  { name: 'relation', label: 'Relation', type: 'select', options: [{ label: 'Father', value: 'FATHER' }, { label: 'Mother', value: 'MOTHER' }, { label: 'Guardian', value: 'GUARDIAN' }], defaultValue: 'FATHER' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+919820012345' },
  { name: 'altPhone', label: 'Alternate Phone', type: 'tel' },
  { name: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Software Engineer' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'emergencyContact', label: 'Emergency Contact', type: 'tel' },
  { name: 'address', label: 'Address', type: 'textarea', colSpan: 2, placeholder: 'House / street, area, Mumbai' },
]

export default function ParentsModule() {
  const [stats, setStats] = React.useState<any>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [parent, setParent] = React.useState<any>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const loadStats = React.useCallback(() => {
    let alive = true
    setStatsLoading(true)
    list('api/parents/stats')
      .then(res => { if (alive) setStats(res.data) })
      .catch(() => { if (alive) setStats(null) })
      .finally(() => { if (alive) setStatsLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => { loadStats() }, [loadStats, refreshKey])

  const refreshAll = React.useCallback(() => setRefreshKey(k => k + 1), [])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Parents & Guardians"
        subtitle="Guardian contact directory linked to the student registry."
        breadcrumbs={['Operations', 'Parents']}
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
          <StatCard label="Total Parents" value={stats?.total ?? '—'} icon={<Users className="h-5 w-5" />} tone="info" hint={`${stats?.guardians ?? 0} guardians`} />
          <StatCard label="Fathers" value={stats?.fathers ?? '—'} icon={<UserRound className="h-5 w-5" />} tone="default" />
          <StatCard label="Mothers" value={stats?.mothers ?? '—'} icon={<UserRoundCheck className="h-5 w-5" />} tone="success" />
          <StatCard label="With Email" value={stats?.withEmail ?? '—'} icon={<Mail className="h-5 w-5" />} tone="warning" hint="Reachable via email" />
        </div>
      )}

      <DataTable
        endpoint="api/parents"
        columns={columns}
        fields={fields}
        defaultSort={{ sortBy: 'name', sortDir: 'asc' }}
        searchPlaceholder="Search name, phone or email…"
        exportEntity="parents"
        createLabel="Add Parent"
        refreshKey={refreshKey}
        onRowClick={(row) => { setParent(row); setSheetOpen(true) }}
        emptyTitle="No parents match your filters"
        emptyDescription="Try a different search term, or add a new parent to the directory."
        emptyAction={<Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4" /> Reset view</Button>}
      />

      <ParentSheet parent={parent} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}

/* ── Parent detail drawer with linked children ── */
function ParentSheet({ parent, open, onOpenChange }: {
  parent: any
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [children, setChildren] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [childId, setChildId] = React.useState<string | null>(null)
  const [childOpen, setChildOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open || !parent?.id) { setChildren(null); return }
    let alive = true
    setLoading(true)
    setError(null)
    list('api/students', { parentId: parent.id, all: true })
      .then(res => { if (alive) setChildren(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, parent?.id])

  const openChild = (id: string) => { setChildId(id); setChildOpen(true) }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {parent ? (
            <>
              <SheetHeader className="border-b pr-12">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 border">
                    {parent.photoUrl && <AvatarImage src={parent.photoUrl} alt={parent.name} />}
                    <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">{initials(parent.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base">{parent.name}</SheetTitle>
                    <SheetDescription>{titleCase(parent.relation)}{parent.occupation ? ` · ${parent.occupation}` : ''}</SheetDescription>
                    <div className="mt-1.5"><StatusBadge value={(parent._count?.students ?? 0) > 0 ? 'ACTIVE' : 'PENDING'} /></div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</p><p className="text-sm font-medium">{parent.phone || '—'}</p></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Alt. Phone</p><p className="text-sm font-medium">{parent.altPhone || '—'}</p></div>
                  <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</p><p className="truncate text-sm font-medium">{parent.email || '—'}</p></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Emergency</p><p className="text-sm font-medium">{parent.emergencyContact || '—'}</p></div>
                  <div className="col-span-2"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Address</p><p className="text-sm font-medium">{parent.address || '—'}</p></div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Children</h4>
                  {loading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading children…
                    </div>
                  ) : error ? (
                    <EmptyState title="Unable to load children" description={error} />
                  ) : !children?.length ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No students linked to this guardian yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {children.map((c: any) => (
                        <li key={c.id}>
                          <button
                            onClick={() => openChild(c.id)}
                            className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-muted/40"
                            aria-label={`Open profile of ${c.firstName} ${c.lastName}`}
                          >
                            <Avatar className="h-9 w-9 border">
                              {c.photoUrl && <AvatarImage src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} />}
                              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initials(`${c.firstName} ${c.lastName}`)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-muted-foreground">{c.admissionNo} · {c.klass?.name || '—'}{c.section ? ` — ${c.section.name}` : ''}</p>
                            </div>
                            <StatusBadge value={c.status} />
                          </button>
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

      <StudentSheet studentId={childId} open={childOpen} onOpenChange={setChildOpen} />
    </>
  )
}
