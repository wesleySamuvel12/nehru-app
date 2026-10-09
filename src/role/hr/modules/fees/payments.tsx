'use client'

/**
 * Payments tab — receipt ledger with invoice/student mapping and printable receipts.
 */
import * as React from 'react'
import { DataTable, Column } from '@/components/erp/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer } from 'lucide-react'
import { inr } from '@/lib/format'
import { useStudents, useInvoices, METHOD_LABELS, printReceipt } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

const METHOD_TONE: Record<string, string> = {
  ONLINE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  UPI: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CASH: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CARD: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  BANK_TRANSFER: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  CHEQUE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

export default function PaymentsTable() {
  const { nameOf } = useStudents()
  const { invoiceNoOf, invoices } = useInvoices()
  const titleOf = React.useCallback(
    (id?: string | null) => invoices.find((r: any) => r.id === id)?.title || '',
    [invoices],
  )

  const columns: Column[] = [
    { key: 'receiptNo', label: 'Receipt #', render: row => <span className="font-medium">{row.receiptNo}</span> },
    { key: 'invoiceNo', label: 'Invoice #', sortable: false, hideOnMobile: true, render: row => <span className="text-muted-foreground">{invoiceNoOf(row.invoiceId)}</span> },
    { key: 'studentName', label: 'Student', sortable: false, render: row => <span className="block max-w-[170px] truncate" title={nameOf(row.studentId)}>{nameOf(row.studentId)}</span> },
    { key: 'amount', label: 'Amount', money: true },
    {
      key: 'method', label: 'Method', sortable: false,
      render: row => <Badge variant="outline" className={METHOD_TONE[row.method] || ''}>{METHOD_LABELS[row.method] || row.method}</Badge>,
    },
    { key: 'status', label: 'Status', badge: true },
    { key: 'paidAt', label: 'Paid At', dateTime: true },
    { key: 'collectedBy', label: 'Collected By', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.collectedBy || '—'}</span> },
    { key: 'reference', label: 'Reference', hideOnMobile: true, render: row => <span className="text-muted-foreground">{row.reference || '—'}</span> },
  ]

  return (
    <DataTable
      endpoint="api/fees/payments"
      columns={columns}
      searchPlaceholder="Search receipt #, reference…"
      defaultSort={{ sortBy: 'paidAt', sortDir: 'desc' }}
      exportEntity="payments"
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      emptyTitle="No payments recorded"
      emptyDescription="Receipts appear here as soon as a payment is collected from an invoice."
      rowActions={(row) => (
        <Button
          size="icon" variant="outline" className="h-8 w-8" title="Print Receipt" aria-label={`Print receipt ${row.receiptNo}`}
          onClick={() => printReceipt({
            receiptNo: row.receiptNo,
            paidAt: row.paidAt,
            studentName: nameOf(row.studentId),
            invoiceNo: invoiceNoOf(row.invoiceId),
            invoiceTitle: titleOf(row.invoiceId),
            amount: row.amount,
            method: row.method,
            reference: row.reference,
            collectedBy: row.collectedBy,
            remarks: row.remarks,
          })}
        >
          <Printer className="h-4 w-4" />
        </Button>
      )}
    />
  )
}
