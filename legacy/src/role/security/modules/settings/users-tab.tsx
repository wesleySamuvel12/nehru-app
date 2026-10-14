'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard } from '@/components/erp/ui'
import { api, updateOne } from '@/lib/api-client'
import { fmtDateTime } from '@/lib/format'
import { ROLES, ROLE_LABELS, MODULE_ACCESS } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, ShieldCheck, Loader2, KeyRound } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLE_TONES: Record<string, string> = {
  SUPER_ADMIN: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  SCHOOL_ADMIN: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PRINCIPAL: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  TEACHER: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  ACCOUNTANT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  PARENT: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  STUDENT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

/** Curated module columns for the readable permission matrix */
const MATRIX_MODULES = [
  'dashboard', 'students', 'academics', 'attendance', 'examinations', 'fees',
  'hr', 'transport', 'hostel', 'health', 'library', 'communication', 'analytics', 'settings',
]
const MATRIX_LABELS: Record<string, string> = {
  dashboard: 'Dash', students: 'Students', academics: 'Academics', attendance: 'Attend.',
  examinations: 'Exams', fees: 'Fees', hr: 'HR', transport: 'Transport', hostel: 'Hostel',
  health: 'Health', library: 'Library', communication: 'Comm.', analytics: 'Analytics', settings: 'Settings',
}

function RoleCell({ role }: { role: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] ${ROLE_TONES[role] || ''}`}>
      {ROLE_LABELS[role] || role}
    </Badge>
  )
}

function EditUserDialog({ row, open, onOpenChange, onSaved }: {
  row: any | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void
}) {
  const [role, setRole] = React.useState('TEACHER')
  const [status, setStatus] = React.useState('ACTIVE')
  const [resetPw, setResetPw] = React.useState(false)
  const [password, setPassword] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (row) {
      setRole(row.role || 'TEACHER')
      setStatus(row.status || 'ACTIVE')
      setResetPw(false)
      setPassword('')
    }
  }, [row, open])

  const save = async () => {
    if (!row) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { role, status }
      if (resetPw && password.length >= 6) body.password = password
      await updateOne('api/settings/users', row.id, body)
      toast.success('User updated', { description: `${row.name} — role & status saved.` })
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user — {row?.name}</DialogTitle>
          <DialogDescription>Only role and status can be changed here. Profile data lives in its own module.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="reset-pw" className="text-sm">Reset password</Label>
              </div>
              <Switch id="reset-pw" checked={resetPw} onCheckedChange={setResetPw} />
            </div>
            {resetPw && (
              <Input
                type="password" placeholder="New password (min 6 chars)" className="mt-2.5"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UsersTab() {
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  const roleOptions = ROLES.map(r => ({ label: ROLE_LABELS[r], value: r }))

  return (
    <div className="space-y-4">
      <DataTable
        key={refreshKey}
        endpoint="api/settings/users"
        defaultPageSize={10}
        searchPlaceholder="Search name or email…"
        filters={[
          { key: 'role', label: 'Role', options: roleOptions },
          { key: 'status', label: 'Status', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Suspended', value: 'SUSPENDED' }, { label: 'Pending', value: 'PENDING' }] },
        ]}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (row) => <RoleCell role={row.role} /> },
          { key: 'status', label: 'Status', badge: true },
          { key: 'lastLoginAt', label: 'Last Login', date: true, sortable: true },
          {
            key: 'linked', label: 'Linked Profile', sortable: false,
            render: (row) => (
              <div className="flex gap-1">
                {row.linkedStudentId && <Badge variant="outline" className="text-[10px]">Student</Badge>}
                {row.linkedParentId && <Badge variant="outline" className="text-[10px]">Parent</Badge>}
                {row.linkedEmployeeId && <Badge variant="outline" className="text-[10px]">Staff</Badge>}
                {!row.linkedStudentId && !row.linkedParentId && !row.linkedEmployeeId && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            ),
          },
        ]}
        fields={[
          { name: 'name', label: 'Full Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Password (min 6 chars)', required: true },
          {
            name: 'role', label: 'Role', type: 'select', required: true,
            optionsLoader: async () => roleOptions,
          },
          { name: 'phone', label: 'Phone' },
        ]}
        createLabel="Add User"
        emptyTitle="No users match" emptyDescription="Try a different search or role filter."
        rowActions={(row, { refresh }) => (
          <Button
            variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => { setEditing(row); setEditOpen(true); }}
          >
            Edit
          </Button>
        )}
      />

      <EditUserDialog row={editing} open={editOpen} onOpenChange={setEditOpen} onSaved={() => setRefreshKey(k => k + 1)} />

      <SectionCard
        title="Permission Matrix"
        description="Module access per role — enforced by the API gateway (read-only view)"
        contentClassName="p-0"
      >
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/80 px-3 py-2 text-left text-xs font-semibold backdrop-blur">Role</th>
                {MATRIX_MODULES.map(m => (
                  <th key={m} className="px-2 py-2 text-center text-[10px] font-semibold text-muted-foreground">{MATRIX_LABELS[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROLES.map(role => (
                <tr key={role} className="hover:bg-muted/40">
                  <td className="sticky left-0 z-10 bg-card px-3 py-2">
                    <RoleCell role={role} />
                  </td>
                  {MATRIX_MODULES.map(m => {
                    const allowed = role === 'SUPER_ADMIN' || (MODULE_ACCESS[m] || []).includes(role)
                    return (
                      <td key={m} className="px-2 py-2 text-center">
                        {allowed
                          ? <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> SUPER_ADMIN implicitly holds every module. Changes require code-level RBAC updates.
        </p>
      </SectionCard>
    </div>
  )
}
