'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/erp/DataTable'
import { toast } from 'sonner'
import { createOne, updateOne, ApiError } from '@/lib/api-client'
import { Loader2, Plus, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react'
import { useBooks, loadPersonOptions, USER_TYPE_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReservationsTab() {
  const bookDir = useBooks()

  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [bookId, setBookId] = React.useState('')
  const [userType, setUserType] = React.useState<'STUDENT' | 'EMPLOYEE'>('STUDENT')
  const [userId, setUserId] = React.useState('')
  const [people, setPeople] = React.useState<any[]>([])
  const [peopleLoading, setPeopleLoading] = React.useState(true)

  /* Reservation row-action busy state */
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)

  React.useEffect(() => {
    let alive = true
    setPeopleLoading(true)
    loadPersonOptions(userType).then((opts) => { if (alive) { setPeople(opts); setPeopleLoading(false) } })
    return () => { alive = false }
  }, [userType])

  const openDialog = () => {
    setBookId(''); setUserType('STUDENT'); setUserId('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!bookId) { toast.error('Select the book to reserve.'); return }
    if (!userId) { toast.error('Select who is reserving.'); return }
    const person = people.find((p) => p.value === userId)
    setSaving(true)
    try {
      await createOne('api/library/reservations', {
        bookId,
        userType,
        userId,
        userName: person?.label || '',
        status: 'PENDING',
      })
      toast.success('Reservation placed — the member will be notified when the copy is ready.')
      setOpen(false)
      refresh()
    } catch (e) { toast.error((e as ApiError).message) } finally { setSaving(false) }
  }

  const setReservationStatus = async (row: any, status: string, successMsg: string) => {
    setBusyId(row.id)
    try {
      await updateOne('api/library/reservations', row.id, { status })
      toast.success(successMsg)
      refresh()
    } catch (e) { toast.error((e as ApiError).message) } finally { setBusyId(null) }
  }

  return (
    <>
      <DataTable
        endpoint="api/library/reservations"
        searchPlaceholder="Search member…"
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        exportEntity={undefined}
        refreshKey={refreshKey}
        defaultSort={{ sortBy: 'reservedAt', sortDir: 'desc' }}
        emptyTitle="No reservations yet"
        emptyDescription="Members can reserve a title that is fully checked out — track the queue here."
        toolbar={() => (
          <Button size="sm" className="h-9" onClick={openDialog}><Plus className="mr-1.5 h-4 w-4" /> New Reservation</Button>
        )}
        columns={[
          { key: 'bookId', label: 'Book', render: (row) => <span className="font-medium">{bookDir.loading ? '…' : bookDir.titleOf(row.bookId)}</span> },
          { key: 'userName', label: 'Member' },
          { key: 'userType', label: 'Type', badge: true, badgeMap: USER_TYPE_BADGE_MAP, hideOnMobile: true },
          { key: 'reservedAt', label: 'Reserved On', date: true },
          { key: 'expiresAt', label: 'Expires', date: true, hideOnMobile: true },
          { key: 'status', label: 'Status', badge: true },
        ]}
        rowActions={(row) => {
          const busy = busyId === row.id
          if (row.status === 'PENDING') {
            return (
              <Button size="sm" variant="outline" className="h-8" disabled={busy}
                title="Copy is available — hold it at the desk"
                onClick={() => setReservationStatus(row, 'READY', `Reservation for ${row.userName || 'member'} marked ready — notification sent.`)}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                <span className="ml-1.5 hidden sm:inline">Mark Ready</span>
              </Button>
            )
          }
          if (row.status === 'READY') {
            return (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8" disabled={busy}
                  title="Hand over the book"
                  onClick={() => setReservationStatus(row, 'FULFILLED', `Reservation fulfilled for ${row.userName || 'member'}.`)}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span className="ml-1.5 hidden sm:inline">Fulfil</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-rose-600 hover:text-rose-600" disabled={busy}
                  title="Cancel reservation"
                  onClick={() => setReservationStatus(row, 'CANCELLED', 'Reservation cancelled.')}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              </div>
            )
          }
          return null
        }}
      />

      {/* New reservation dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) setOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>Reserve a title for a member. They are notified when you mark it ready.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="res-book">Book *</Label>
              <Select value={bookId} onValueChange={setBookId}>
                <SelectTrigger id="res-book" className="w-full">
                  <SelectValue placeholder={bookDir.loading ? 'Loading books…' : 'Select a book'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {bookDir.books.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No books in catalogue.</div>}
                  {bookDir.books.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} — {b.availableCopies}/{b.totalCopies} free
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="res-type">Member type</Label>
                <Select value={userType} onValueChange={(v) => { setUserType(v as any); setUserId('') }}>
                  <SelectTrigger id="res-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-user">{userType === 'STUDENT' ? 'Student' : 'Employee'} *</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger id="res-user" className="w-full"><SelectValue placeholder={peopleLoading ? 'Loading…' : 'Select member'} /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {people.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{peopleLoading ? 'Loading…' : 'Directory unavailable.'}</div>}
                    {people.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
