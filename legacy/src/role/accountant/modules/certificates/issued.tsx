'use client'

import * as React from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/erp/DataTable'
import { titleCase } from '@/lib/format'
import CertificatePrintDialog from './certificate-print'


const TYPE_MAP: Record<string, string> = {
  TRANSFER: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  BONAFIDE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  STUDY: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  CONDUCT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CHARACTER: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  TRANSCRIPT: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  BIRTH: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  REPORT_CARD: 'bg-primary/10 text-primary border-primary/20',
}

const columns: Column[] = [
  { key: 'certificateNo', label: 'Certificate No.', render: row => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.certificateNo}</code> },
  { key: 'title', label: 'Title' },
  { key: 'studentName', label: 'Student', sortable: false, className: 'min-w-[150px]', render: row => <span className="font-medium">{row.studentName}</span> },
  { key: 'type', label: 'Type', badge: true, badgeMap: TYPE_MAP },
  { key: 'issuedBy', label: 'Issued By', hideOnMobile: true, render: row => row.issuedBy || <span className="text-muted-foreground">—</span> },
  { key: 'issuedAt', label: 'Issued On', date: true },
  { key: 'verifyCode', label: 'Verify Code', hideOnMobile: true, render: row => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.verifyCode}</code> },
]

export default function IssuedTab() {
  const [tick, setTick] = React.useState(0)
  const [printing, setPrinting] = React.useState<any | null>(null)

  return (
    <>
      <DataTable
        endpoint="api/certificates/issued"
        columns={columns}
        defaultSort={{ sortBy: 'issuedAt', sortDir: 'desc' }}
        searchPlaceholder="Search certificate no. or title…"
        filters={[{ key: 'type', label: 'Types', options: Object.keys(TYPE_MAP).map(t => ({ label: titleCase(t), value: t })) }]}
        refreshKey={tick}
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        emptyTitle="No certificates issued yet"
        emptyDescription="Approve and issue a certificate request — it will appear here with a printable copy and QR verification code."
        rowActions={(row) => (
          <Button variant="outline" size="sm" className="h-8" title="Print / QR" onClick={() => setPrinting(row)}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / QR
          </Button>
        )}
      />
      <CertificatePrintDialog
        open={!!printing}
        onOpenChange={(v) => { if (!v) { setPrinting(null); setTick(t => t + 1) } }}
        cert={printing}
      />
    </>
  )
}
