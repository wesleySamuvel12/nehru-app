'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard, EmptyState, ErrorState, StatusBadge } from '@/components/erp/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { BookOpen, CalendarIcon, ClipboardList, Loader2, RefreshCw, Undo2, TriangleAlert } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { list, createOne, updateOne, ApiError } from '@/lib/api-client'
import { fmtDate } from '@/lib/format'
import { useErp } from '@/lib/store'
import { loadPersonOptions, plusDaysISO, USER_TYPE_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function IssueReturnTab() {
  const session = useErp((s) => s.session)

  /* Books for the issue picker */
  const [books, setBooks] = React.useState<any[]>([])
  const [booksLoading, setBooksLoading] = React.useState(true)
  const loadBooks = React.useCallback(() => {
    let alive = true
    setBooksLoading(true)
    list<any>('api/library/books', { all: 1, sortBy: 'title', sortDir: 'asc' })
      .then((res) => { if (alive) setBooks(res.data) })
      .catch(() => { if (alive) setBooks([]) })
      .finally(() => { if (alive) setBooksLoading(false) })
    return () => { alive = false }
  }, [])
  React.useEffect(() => loadBooks(), [loadBooks])

  /* People */
  const [userType, setUserType] = React.useState<'STUDENT' | 'EMPLOYEE'>('STUDENT')
  const [people, setPeople] = React.useState<any[]>([])
  const [peopleLoading, setPeopleLoading] = React.useState(true)
  React.useEffect(() => {
    let alive = true
    setPeopleLoading(true)
    loadPersonOptions(userType).then((opts) => { if (alive) { setPeople(opts); setPeopleLoading(false) } })
    return () => { alive = false }
  }, [userType])

  /* Issue form state */
  const [bookId, setBookId] = React.useState('')
  const [userId, setUserId] = React.useState('')
  const [dueDate, setDueDate] = React.useState<string>(plusDaysISO(14))
  const [issuing, setIssuing] = React.useState(false)

  /* Issued list */
  const [issued, setIssued] = React.useState<any[]>([])
  const [issuedLoading, setIssuedLoading] = React.useState(true)
  const [issuedError, setIssuedError] = React.useState<string | null>(null)
  const [returningId, setReturningId] = React.useState<string | null>(null)

  const loadIssued = React.useCallback(() => {
    let alive = true
    setIssuedLoading(true)
    setIssuedError(null)
    list<any>('api/library/transactions', { all: 1, status: 'ISSUED', sortBy: 'dueDate', sortDir: 'asc' })
      .then((res) => { if (alive) setIssued(res.data) })
      .catch((e: ApiError) => { if (alive) setIssuedError(e.message) })
      .finally(() => { if (alive) setIssuedLoading(false) })
    return () => { alive = false }
  }, [])
  React.useEffect(() => loadIssued(), [loadIssued])

  const availableBooks = books.filter((b) => (b.availableCopies ?? 0) > 0 && b.status !== 'ARCHIVED')
  const selectedBook = books.find((b) => b.id === bookId)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const overdueCount = issued.filter((t) => t.dueDate && new Date(t.dueDate) < today).length

  const handleIssue = async () => {
    if (!bookId) { toast.error('Select a book to issue.'); return }
    if (!userId) { toast.error('Select the borrower.'); return }
    if (!dueDate) { toast.error('Pick a due date.'); return }
    const person = people.find((p) => p.value === userId)
    setIssuing(true)
    try {
      await createOne('api/library/transactions', {
        bookId,
        bookTitle: selectedBook?.title || '',
        userType,
        userId,
        userName: person?.label || '',
        dueDate: new Date(`${dueDate}T23:59:59.999Z`).toISOString(),
        status: 'ISSUED',
        issuedBy: session?.name || '',
      })
      toast.success(`Issued “${selectedBook?.title}” — due ${fmtDate(dueDate)}.`)
      setBookId(''); setUserId('')
      setDueDate(plusDaysISO(14))
      loadBooks(); loadIssued()
    } catch (e) { toast.error((e as ApiError).message) } finally { setIssuing(false) }
  }

  const handleReturn = async (txn: any) => {
    setReturningId(txn.id)
    try {
      const res = await updateOne<any>('api/library/transactions', txn.id, { action: 'RETURN' })
      const fine = res?.data?.fine ?? 0
      toast.success(fine > 0
        ? `“${txn.bookTitle}” returned — fine ₹${fine} collected for late return.`
        : `“${txn.bookTitle}” returned on time. No fine.`)
      loadIssued(); loadBooks()
    } catch (e) { toast.error((e as ApiError).message) } finally { setReturningId(null) }
  }

  const peopleEmpty = !peopleLoading && people.length === 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Issue panel */}
      <SectionCard
        className="lg:col-span-2"
        title="Issue Book"
        description="Lend an available copy to a student or employee"
        actions={<Badge variant="secondary">{availableBooks.length} titles available</Badge>}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-book">Book *</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger id="issue-book" className="w-full"><SelectValue placeholder={booksLoading ? 'Loading books…' : 'Select a book'} /></SelectTrigger>
              <SelectContent className="max-h-64">
                {availableBooks.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {booksLoading ? 'Loading…' : 'No copies available right now.'}
                  </div>
                )}
                {availableBooks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} — {b.availableCopies}/{b.totalCopies} free · {b.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="issue-user-type">Borrower type</Label>
              <Select value={userType} onValueChange={(v) => { setUserType(v as any); setUserId('') }}>
                <SelectTrigger id="issue-user-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-user">{userType === 'STUDENT' ? 'Student' : 'Employee'} *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="issue-user" className="w-full"><SelectValue placeholder={peopleLoading ? 'Loading…' : 'Select borrower'} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {people.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {peopleLoading ? 'Loading…' : 'Directory unavailable — try refreshing.'}
                    </div>
                  )}
                  {people.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-due">Due date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="issue-due" variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? fmtDate(dueDate) : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate ? new Date(dueDate) : undefined}
                  onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Standard loan period is 14 days. Fine ₹2/day (max ₹100) after the due date.</p>
          </div>

          {peopleEmpty && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="h-3.5 w-3.5" />
              Student/employee directory could not be loaded. It may still be rolling out — retry shortly.
            </p>
          )}

          <Button className="w-full" onClick={handleIssue} disabled={issuing || booksLoading || peopleLoading}>
            {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
            Issue Book
          </Button>
        </div>
      </SectionCard>

      {/* Return panel */}
      <SectionCard
        className="lg:col-span-3"
        title="Return Book"
        description="Currently issued books awaiting return"
        actions={
          <div className="flex items-center gap-2">
            {overdueCount > 0 && <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">{overdueCount} overdue</Badge>}
            <Button variant="outline" size="sm" className="h-8" onClick={() => { loadIssued(); loadBooks() }} aria-label="Refresh issued list">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
        contentClassName="p-0"
      >
        {issuedLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
        ) : issuedError ? (
          <ErrorState message={issuedError} onRetry={loadIssued} />
        ) : issued.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="No books are currently issued"
            description="Use the Issue Book panel to lend a copy — it will appear here for return."
          />
        ) : (
          <div className="max-h-[460px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Book</TableHead>
                  <TableHead className="hidden md:table-cell">Borrower</TableHead>
                  <TableHead className="hidden sm:table-cell">Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issued.map((t) => {
                  const overdue = t.dueDate && new Date(t.dueDate) < today
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[180px]">
                        <p className="truncate font-medium">{t.bookTitle || '—'}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{t.userName || '—'}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="whitespace-nowrap">{t.userName || '—'}</span>
                          <StatusBadge value={t.userType} map={USER_TYPE_BADGE_MAP} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">{fmtDate(t.issueDate)}</TableCell>
                      <TableCell>
                        <span className={overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'whitespace-nowrap text-muted-foreground'}>
                          {fmtDate(t.dueDate)}{overdue ? ' · overdue' : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleReturn(t)} disabled={returningId === t.id}>
                          {returningId === t.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1.5 h-3.5 w-3.5" />}
                          Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
