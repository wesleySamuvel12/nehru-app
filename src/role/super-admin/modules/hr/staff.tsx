'use client'

/**
 * Staff Attendance & Leave tab — link view over the Attendance and Staff modules
 * with a live headcount summary and pending-leave snapshot (when available).
 */
import * as React from 'react'
import { StatCard, SectionCard, EmptyState } from '@/components/erp/ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BadgeIndianRupee, CalendarCheck, CalendarClock, ChevronRight, Users, UserCheck, Coffee } from 'lucide-react'
import { list } from '@/lib/api-client'
import { useEmployees } from './helpers'
import { useErp } from '@/lib/store'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LeaveRow { id: string; status?: string; employeeName?: string; fromDate?: string; toDate?: string; leaveType?: string }

export default function StaffAttendanceView({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const { employees, loading } = useEmployees()
  const { setModule } = useErp()
  const [leaves, setLeaves] = React.useState<LeaveRow[] | null>(null)

  // Leave endpoint is owned by another agent — degrade to a link-only view if absent.
  React.useEffect(() => {
    let alive = true
    list<LeaveRow>('api/leaves', { all: 1 })
      .then(res => alive && setLeaves(res.data))
      .catch(() => alive && setLeaves(null))
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  const total = employees.length
  const active = employees.filter((e: any) => e.status === 'ACTIVE').length
  const onLeave = employees.filter((e: any) => e.status === 'ON_LEAVE').length
  const pendingLeaves = (leaves || []).filter(l => l.status === 'PENDING')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Staff" value={total} icon={<Users className="h-5 w-5" />} tone="info" hint="On the employee register" />
        <StatCard label="Active Today" value={active} icon={<UserCheck className="h-5 w-5" />} tone="success" hint="Status ACTIVE" />
        <StatCard label="On Leave" value={onLeave} icon={<Coffee className="h-5 w-5" />} tone="warning" hint="Currently marked ON_LEAVE" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Daily Operations" description="Jump into the linked operational views">
          <div className="space-y-2">
            <LinkRow
              icon={<CalendarCheck className="h-4 w-4" />}
              title="Staff Attendance Register"
              description="Mark and review daily check-ins in the Attendance module"
              onClick={() => setModule('attendance')}
            />
            <LinkRow
              icon={<Users className="h-4 w-4" />}
              title="Teachers & Staff Directory"
              description="Profiles, designations, contracts and documents"
              onClick={() => setModule('teachers')}
            />
            <LinkRow
              icon={<BadgeIndianRupee className="h-4 w-4" />}
              title="Run / Review Payroll"
              description="Generate monthly payslips from attendance data"
              onClick={() => onGoTo('payroll')}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Leave Requests"
          description={leaves ? `${pendingLeaves.length} awaiting approval` : 'Leave module not linked yet'}
          actions={leaves && (
            <Button variant="ghost" size="sm" onClick={() => setModule('attendance')}>
              Open <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        >
          {!leaves ? (
            <EmptyState
              title="Leave module is being connected"
              description="The leave workflow lives in the Attendance module — open it to manage leave requests."
              icon={<CalendarClock className="h-6 w-6" />}
              action={<Button size="sm" variant="outline" onClick={() => setModule('attendance')}>Go to Attendance</Button>}
            />
          ) : pendingLeaves.length === 0 ? (
            <EmptyState title="No pending leave requests" description="All leave applications have been actioned." icon={<CalendarCheck className="h-6 w-6" />} />
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {pendingLeaves.slice(0, 8).map(l => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.employeeName || 'Employee'}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.leaveType ? `${l.leaveType.replace(/_/g, ' ')} · ` : ''}{l.fromDate || ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function LinkRow({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
