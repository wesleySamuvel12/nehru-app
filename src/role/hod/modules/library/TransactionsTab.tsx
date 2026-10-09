'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/erp/DataTable'
import { toast } from 'sonner'
import { updateOne, ApiError } from '@/lib/api-client'
import { Loader2, Undo2 } from 'lucide-react'
import { TXN_STATUSES, USER_TYPE_BADGE_MAP } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const USER_TYPE_OPTIONS = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Employee', value: 'EMPLOYEE' },
]

export default function TransactionsTab() {
  const [returningId, setReturningId] = React.useState<string | null>(null)

  const handleReturn = async (txn: any, refresh: () => void) => {
    setReturningId(txn.id)
    try {
      const res = await updateOne<any>('api/library/transactions', txn.id, { action: 'RETURN' })
      const fine = res?.data?.fine ?? 0
      toast.success(fine > 0
        ? `“${txn.bookTitle}” returned — fine ₹${fine} collected for late return.`
        : `“${txn.bookTitle}” returned on time. No fine.`)
      refresh()
    } catch (e) { toast.error((e as ApiError).message) } finally { setReturningId(null) }
  }

  return (
    <DataTable
      endpoint="api/library/transactions"
      searchPlaceholder="Search book or borrower…"
      exportEntity="libraryTxns"
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      defaultSort={{ sortBy: 'issueDate', sortDir: 'desc' }}
      emptyTitle="No circulation transactions yet"
      emptyDescription="Issue a book from the Issue & Return tab — every issue and return is logged here."
      filters={[
        { key: 'status', label: 'Statuses', options: TXN_STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })) },
        { key: 'userType', label: 'Borrower types', options: USER_TYPE_OPTIONS },
      ]}
      columns={[
        { key: 'bookTitle', label: 'Book', render: (row) => <span className="font-medium">{row.bookTitle || '—'}</span> },
        { key: 'userName', label: 'Borrower' },
        {
          key: 'userType', label: 'Type', badge: true, badgeMap: USER_TYPE_BADGE_MAP,
        },
        { key: 'issueDate', label: 'Issued', date: true },
        {
          key: 'dueDate', label: 'Due', date: true,
          render: (row) => {
            const overdue = row.dueDate && !row.returnDate && new Date(row.dueDate) < new Date()
            return (
              <span className={overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'whitespace-nowrap text-muted-foreground'}>
                {row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                {overdue ? ' · overdue' : ''}
              </span>
            )
          },
        },
        { key: 'returnDate', label: 'Returned', date: true, hideOnMobile: true },
        { key: 'renewals', label: 'Renewals', hideOnMobile: true },
        { key: 'fine', label: 'Fine', money: true },
        { key: 'status', label: 'Status', badge: true },
      ]}
      rowActions={(row, { refresh }) => (
        row.status === 'ISSUED' ? (
          <Button size="sm" variant="outline" className="h-8" title="Mark returned"
            onClick={() => handleReturn(row, refresh)} disabled={returningId === row.id}>
            {returningId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            <span className="ml-1.5 hidden sm:inline">Return</span>
          </Button>
        ) : null
      )}
    />
  )
}
