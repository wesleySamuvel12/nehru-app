'use client'

/**
 * Invoices tab — DataTable with derived balance/overdue rendering, plus the
 * "Collect Payment" dialog that posts to /api/fees/payments.
 */
import * as React from 'react'
import { DataTable, FormFields, validateForm, Column, FormField } from '@/components/erp/DataTable'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, IndianRupee, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { createOne, ApiError } from '@/lib/api-client'
import { inr, fmtDate } from '@/lib/format'
import { useStudents, deriveInvoiceStatusClient, METHOD_LABELS } from './helpers'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TERM_OPTIONS = [
  { label: 'Term 1 (Apr–Sep)', value: 'Term 1' },
  { label: 'Term 2 (Oct–Mar)', value: 'Term 2' },
]

const STATUS_OPTIONS = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'].map(s => ({ label: s, value: s }))

export default function InvoicesTable({ refreshKey }: { refreshKey?: number }) {
  const { options, nameOf } = useStudents()
  const [collectRow, setCollectRow] = React.useState<any | null>(null)
  const [version, setVersion] = React.useState(0)

  const fields: FormField[] = React.useMemo(() => [
    { name: 'studentId', label: 'Student', type: 'select', required: true, options, colSpan: 2, help: options.length ? undefined : 'Loading students…' },
    { name: 'title', label: 'Invoice Title', type: 'text', required: true, placeholder: 'Term 1 Fee (Apr–Sep)' },
    { name: 'term', label: 'Term', type: 'select', options: TERM_OPTIONS },
    { name: 'totalAmount', label: 'Total Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
    { name: 'itemsJson', label: 'Line Items (JSON, optional)', type: 'textarea', colSpan: 2, placeholder: '[{"name":"Tuition","amount":18000},{"name":"Activity & Lab","amount":6000}]', help: 'Optional breakdown of the invoice total.' },
  ], [options])

  const columns: Column[] = [
    { key: 'invoiceNo', label: 'Invoice #', render: row => <span className="font-medium">{row.invoiceNo}</span> },
    { key: 'studentName', label: 'Student', sortable: false, render: row => <span className="block max-w-[170px] truncate" title={nameOf(row.studentId)}>{nameOf(row.studentId)}</span> },
    { key: 'title', label: 'Title', hideOnMobile: true },
    { key: 'totalAmount', label: 'Total', money: true },
    { key: 'paidAmount', label: 'Paid', money: true },
    {
      key: 'balance', label: 'Balance', sortable: false,
      render: row => {
        const bal = (Number(row.totalAmount) || 0) - (Number(row.paidAmount) || 0)
        return <span className={`font-medium tabular-nums ${bal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{inr(Math.max(0, bal))}</span>
      },
    },
    {
      key: 'dueDate', label: 'Due Date', date: true,
      render: row => {
        const past = row.dueDate && new Date(row.dueDate).getTime() < Date.now()
        const unpaid = (Number(row.paidAmount) || 0) < (Number(row.totalAmount) || 0) && row.status !== 'PAID' && row.status !== 'CANCELLED'
        return (
          <span className={`whitespace-nowrap text-muted-foreground ${past && unpaid ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
            {fmtDate(row.dueDate)}{past && unpaid ? ' · OVERDUE' : ''}
          </span>
        )
      },
    },
    { key: 'term', label: 'Term', hideOnMobile: true, badge: true, sortable: false },
    { key: 'status', label: 'Status', badge: true },
  ]

  return (
    <>
      <DataTable
        endpoint="api/fees/invoices"
        columns={columns}
        fields={fields}
        filters={[{ key: 'status', label: 'statuses', options: STATUS_OPTIONS }]}
        searchPlaceholder="Search invoice # or title…"
        defaultSort={{ sortBy: 'createdAt', sortDir: 'desc' }}
        exportEntity="invoices"
        refreshKey={(refreshKey || 0) + version}
        createLabel="New Invoice"
        emptyTitle="No invoices yet"
        emptyDescription="Generate the first fee invoice for a student — invoice numbers are assigned automatically."
        transformSave={(values, mode) => {
          const payload: any = {
            ...values,
            itemsJson: typeof values.itemsJson === 'string' && values.itemsJson.trim() ? values.itemsJson : null,
          }
          if (mode === 'create') {
            payload.paidAmount = 0
            payload.status = deriveInvoiceStatusClient(Number(values.totalAmount) || 0, 0, values.dueDate)
          }
          return payload
        }}
        rowActions={(row) => (
          <Button
            size="icon" variant="outline" className="h-8 w-8" title="Collect Payment" aria-label={`Collect payment for ${row.invoiceNo}`}
            disabled={row.status === 'PAID' || row.status === 'CANCELLED'}
            onClick={() => setCollectRow(row)}
          >
            <IndianRupee className="h-4 w-4" />
          </Button>
        )}
      />
      <CollectPaymentDialog invoice={collectRow} onClose={() => { setCollectRow(null); setVersion(v => v + 1) }} />
    </>
  )
}

/* ── Collect Payment dialog ── */
function CollectPaymentDialog({ invoice, onClose }: { invoice: any | null; onClose: () => void }) {
  const { nameOf } = useStudents()
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const balance = invoice ? Math.max(0, (Number(invoice.totalAmount) || 0) - (Number(invoice.paidAmount) || 0)) : 0

  React.useEffect(() => {
    if (invoice) {
      setValues({ amount: String(balance), method: 'ONLINE', reference: '', remarks: '' })
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id])

  if (!invoice) return null

  const fields: FormField[] = [
    { name: 'amount', label: `Amount (₹) — balance ${inr(balance)}`, type: 'number', required: true, min: 1 },
    { name: 'method', label: 'Payment Method', type: 'select', required: true, options: Object.entries(METHOD_LABELS).map(([value, label]) => ({ label, value })) },
    { name: 'reference', label: 'Reference / Txn ID', type: 'text', placeholder: 'UTR / cheque no. (optional)' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2, placeholder: 'Optional note stored against the receipt' },
  ]

  const submit = async () => {
    const errs = validateForm(fields, values)
    const amt = Number(values.amount)
    if (!errs.amount && amt > balance) errs.amount = `Amount cannot exceed the balance (${inr(balance)})`
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const res = await createOne('api/fees/payments', {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: amt,
        method: values.method,
        reference: values.reference || undefined,
        remarks: values.remarks || undefined,
      })
      toast.success(`Payment of ${inr(amt)} recorded — Receipt ${res?.data?.receiptNo || 'issued'}.`)
      onClose()
    } catch (e) {
      toast.error((e as ApiError).message || 'Could not record the payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={open => { if (!open && !saving) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" /> Collect Payment</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNo} · {invoice.title} — total {inr(invoice.totalAmount)}, paid {inr(invoice.paidAmount)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-sm">Student</Label>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">{nameOf(invoice.studentId)}</p>
        </div>
        <FormFields fields={fields} values={values} setValues={setValues} errors={errors} mode="create" />
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record {inr(Number(values.amount) || 0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
