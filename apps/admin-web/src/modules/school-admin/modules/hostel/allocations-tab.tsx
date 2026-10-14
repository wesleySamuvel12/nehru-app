'use client'

import * as React from 'react'
import { updateOne } from '@/lib/api-client'
import { toast } from 'sonner'
import { DataTable } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LogOut } from 'lucide-react'
import { useStudents } from './use-students'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AllocationsTab() {
  const { map: studentMap, options: studentOptions, loading: studentsLoading } = useStudents()
  const [checkingOut, setCheckingOut] = React.useState<any | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), [])

  const confirmCheckOut = async () => {
    if (!checkingOut) return
    setBusy(true)
    try {
      await updateOne('api/hostel/allocations', checkingOut.id, {
        status: 'CHECKED_OUT',
        checkOutDate: new Date().toISOString(),
      })
      toast.success('Check-out recorded — the bed is free again and the parent has been notified.')
      setCheckingOut(null)
      setRefreshKey(k => k + 1)
    } catch (e: any) {
      toast.error(e?.message || 'Could not check out this student.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DataTable
        endpoint="api/hostel/allocations"
        refreshKey={refreshKey}
        columns={[
          {
            key: 'studentId', label: 'Student',
            render: r => <span className="font-medium">{studentMap[r.studentId]?.name || <span className="text-muted-foreground">Student #{String(r.studentId).slice(-4)}</span>}</span>,
          },
          { key: 'hostel', label: 'Hostel', sortable: false, hideOnMobile: true, render: r => r.bed?.room?.hostel?.name || <span className="text-muted-foreground">—</span> },
          { key: 'room', label: 'Room', sortable: false, render: r => r.bed?.room?.roomNo || <span className="text-muted-foreground">—</span> },
          { key: 'bed', label: 'Bed', sortable: false, render: r => r.bed?.bedNo || <span className="text-muted-foreground">—</span> },
          { key: 'checkInDate', label: 'Check-in', date: true },
          { key: 'checkOutDate', label: 'Check-out', date: true, hideOnMobile: true },
          { key: 'status', label: 'Status', badge: true },
          { key: 'monthlyFee', label: 'Monthly Fee', money: true },
          { key: 'notes', label: 'Notes', defaultHidden: true },
        ]}
        fields={[
          {
            name: 'bedId', label: 'Bed (free only)', type: 'select', required: true,
            optionsLoader: async () => {
              const res = await (await import('@/lib/api-client')).list<any>('api/hostel/beds', { status: 'FREE', all: 1 })
              return (res.data || []).map((b: any) => ({
                label: `${b.bedNo} · Room ${b.room?.roomNo || '?'} (${b.room?.hostel?.name || 'hostel'})`,
                value: b.id,
              }))
            },
            help: 'Only beds currently marked FREE are listed',
          },
          { name: 'studentId', label: 'Student', type: 'select', required: true, options: studentOptions, help: studentsLoading ? 'Loading students…' : undefined },
          { name: 'checkInDate', label: 'Check-in Date', type: 'date', defaultValue: today },
          { name: 'monthlyFee', label: 'Monthly Fee (₹)', type: 'number', min: 0, defaultValue: 9500 },
          { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, placeholder: 'Lower berth, vegetarian mess…' },
        ]}
        transformSave={(values) => ({ ...values, status: 'ACTIVE' })}
        filters={[
          { key: 'status', label: 'Statuses', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Checked Out', value: 'CHECKED_OUT' }] },
        ]}
        defaultSort={{ sortBy: 'id', sortDir: 'desc' }}
        searchPlaceholder="Search allocations…"
        createLabel="Allocate Bed"
        emptyTitle="No hostel allocations"
        emptyDescription="Allocate a free bed to a boarder — check-in and parent notification are automatic."
        rowActions={(row) => row.status === 'ACTIVE' ? (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-rose-600 hover:text-rose-600 dark:text-rose-400"
            onClick={() => setCheckingOut(row)}>
            <LogOut className="h-3.5 w-3.5" /> Check Out
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Checked out</span>
        )}
      />

      <AlertDialog open={!!checkingOut} onOpenChange={(open) => !open && !busy && setCheckingOut(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check out of the hostel?</AlertDialogTitle>
            <AlertDialogDescription>
              {checkingOut && (
                <>
                  <b>{studentMap[checkingOut.studentId]?.name || 'This student'}</b> will be checked out of bed{' '}
                  <b>{checkingOut.bed?.bedNo}</b> (Room {checkingOut.bed?.room?.roomNo}) with today&apos;s date. The bed returns to{' '}
                  <b>FREE</b> and the parent is notified automatically.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              disabled={busy}
              onClick={(e) => { e.preventDefault(); confirmCheckOut() }}
            >
              {busy && <LogOut className="mr-2 h-4 w-4 animate-pulse" />}
              Confirm Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
