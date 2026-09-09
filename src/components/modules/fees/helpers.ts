'use client'

/**
 * Fees module shared helpers: cached lookups, print engine, label maps.
 * Fetches degrade gracefully — cross-module endpoints (students/classes/years)
 * may be shipped by parallel agents; missing data renders as em-dashes.
 */
import * as React from 'react'
import { list } from '@/lib/api-client'
import { toast } from 'sonner'

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── Cached entity loaders (module-level, shared across tabs) ── */
const cache: Record<string, any[] | null> = {}
const subscribers = new Map<string, Set<(rows: any[]) => void>>()

function cachedGet(key: string, endpoint: string, params: Record<string, unknown> = { all: 1 }) {
  if (cache[key]) return Promise.resolve(cache[key]!)
  return list(endpoint, params).then(res => {
    cache[key] = res.data
    subscribers.get(key)?.forEach(fn => fn(res.data))
    return res.data
  })
}

/** Subscribe to a cached entity list (single fetch shared by all consumers). */
export function useEntity(key: string, endpoint: string): { rows: any[]; loading: boolean } {
  const [rows, setRows] = React.useState<any[]>(cache[key] || [])
  const [loading, setLoading] = React.useState(!cache[key])
  React.useEffect(() => {
    let alive = true
    const fn = (r: any[]) => alive && setRows(r)
    if (!subscribers.has(key)) subscribers.set(key, new Set())
    subscribers.get(key)!.add(fn)
    if (cache[key]) {
      setRows(cache[key]!)
      setLoading(false)
    } else {
      cachedGet(key, endpoint)
        .catch(() => { /* endpoint may not exist yet — names stay em-dash */ })
        .finally(() => alive && setLoading(false))
    }
    return () => { alive = false; subscribers.get(key)?.delete(fn) }
  }, [key, endpoint])
  return { rows, loading }
}

export function useStudents() {
  const { rows, loading } = useEntity('students', 'api/students')
  const nameOf = React.useCallback((id?: string | null) => {
    const s = rows.find((x: any) => x.id === id)
    return s ? `${s.firstName} ${s.lastName}` : '—'
  }, [rows])
  const options = React.useMemo(
    () => rows.map((s: any) => ({ label: `${s.firstName} ${s.lastName} · ${s.admissionNo}`, value: s.id })),
    [rows],
  )
  return { students: rows, loading, nameOf, options }
}

export function useInvoices() {
  const { rows, loading } = useEntity('invoices', 'api/fees/invoices')
  const invoiceNoOf = React.useCallback((id?: string | null) => rows.find((r: any) => r.id === id)?.invoiceNo || '—', [rows])
  return { invoices: rows, loading, invoiceNoOf }
}

export function useClasses() {
  const { rows, loading } = useEntity('classes', 'api/academics/classes')
  const nameOf = React.useCallback((id?: string | null) => rows.find((r: any) => r.id === id)?.name || '—', [rows])
  const options = React.useMemo(() => rows.map((c: any) => ({ label: c.name, value: c.id })), [rows])
  return { classes: rows, loading, nameOf, options }
}

export function useAcademicYears() {
  const { rows, loading } = useEntity('years', 'api/academics/years')
  const nameOf = React.useCallback((id?: string | null) => rows.find((r: any) => r.id === id)?.name || '—', [rows])
  const options = React.useMemo(() => rows.map((y: any) => ({ label: y.name, value: y.id })), [rows])
  return { years: rows, loading, nameOf, options }
}

/* ── Label maps ── */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthLabel = (m: number) => MONTHS[(m - 1 + 12) % 12] || '—'
export const monthYearLabel = (m: number, y: number) => `${monthLabel(m)} ${y}`

export const METHOD_LABELS: Record<string, string> = {
  ONLINE: 'Online', UPI: 'UPI', CASH: 'Cash', CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque',
}

export const CATEGORY_LABELS: Record<string, string> = {
  SALARIES: 'Salaries', UTILITIES: 'Utilities', MAINTENANCE: 'Maintenance', SUPPLIES: 'Supplies',
  TRANSPORT: 'Transport', EVENTS: 'Events', LIBRARY: 'Library', OTHER: 'Other',
}

export const DISCOUNT_TYPE_LABELS: Record<string, string> = { PERCENT: 'Percent off', FIXED: 'Flat amount' }
export const APPLIES_TO_LABELS: Record<string, string> = { ALL: 'All students', STUDENT_ID: 'Specific student', CLASS: 'Whole class' }

/* ── Printable documents (receipts / payslips) ── */
const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c1917; background: #f5f5f4; padding: 24px; }
  .doc { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e7e5e4; border-radius: 10px; padding: 36px 40px; }
  .letterhead { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #047857; padding-bottom: 16px; }
  .crest { width: 54px; height: 54px; border-radius: 12px; background: #047857; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
  .school { font-size: 21px; font-weight: 700; }
  .school-sub { font-size: 12px; color: #78716c; margin-top: 2px; }
  .doc-title { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; margin: 22px 0 4px; color: #047857; }
  .doc-no { text-align: center; font-size: 12px; color: #78716c; margin-bottom: 20px; }
  table.kv { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.kv td { padding: 7px 10px; border-bottom: 1px dashed #e7e5e4; font-size: 13px; }
  table.kv td:first-child { color: #78716c; width: 190px; }
  table.kv td:last-child { font-weight: 600; }
  .amount-box { margin: 18px 0; padding: 14px 18px; border: 1.5px solid #047857; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
  .amount-box .lbl { font-size: 12px; color: #78716c; text-transform: uppercase; letter-spacing: 1px; }
  .amount-box .val { font-size: 24px; font-weight: 700; color: #047857; }
  .note { font-size: 11px; color: #a8a29e; margin-top: 16px; }
  .sign { display: flex; justify-content: space-between; margin-top: 56px; }
  .sign .line { text-align: center; font-size: 12px; color: #57534e; }
  .sign .line .rule { width: 180px; border-top: 1.5px solid #1c1917; margin-bottom: 6px; }
  .foot { margin-top: 26px; border-top: 1px solid #e7e5e4; padding-top: 10px; text-align: center; font-size: 10.5px; color: #a8a29e; }
  @media print { body { padding: 0; background: #fff; } .doc { border: none; } }
`

export function openPrintWindow(title: string, bodyHtml: string, subHtml = '') {
  const w = window.open('', '_blank', 'width=860,height=920')
  if (!w) {
    toast.error('Pop-up blocked — please allow pop-ups to print.')
    return
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>
    <div class="doc">
      <div class="letterhead">
        <div class="crest">G</div>
        <div><div class="school">Greenwood International School</div>
        <div class="school-sub">MG Road, Andheri West, Mumbai 400058 · +91 22 4567 8900 · fees@greenwood.edu.in</div></div>
      </div>
      ${subHtml}
      ${bodyHtml}
      <div class="foot">This is a computer-generated document from Greenwood ERP and does not require a physical stamp.</div>
    </div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); }<\/script>
  </body></html>`)
  w.document.close()
}

export function printReceipt(input: {
  receiptNo: string; paidAt: string | Date; studentName: string; invoiceNo: string
  invoiceTitle?: string; amount: number; method: string; reference?: string | null; collectedBy?: string | null; remarks?: string | null
}) {
  const sub = `<div class="doc-title">Fee Payment Receipt</div>
    <div class="doc-no">Receipt ${input.receiptNo}</div>`
  const body = `
    <table class="kv">
      <tr><td>Receipt No.</td><td>${input.receiptNo}</td></tr>
      <tr><td>Payment Date</td><td>${fmtDateStr(input.paidAt)}</td></tr>
      <tr><td>Student</td><td>${esc(input.studentName)}</td></tr>
      <tr><td>Invoice</td><td>${esc(input.invoiceNo)}${input.invoiceTitle ? ` — ${esc(input.invoiceTitle)}` : ''}</td></tr>
      <tr><td>Payment Method</td><td>${esc(METHOD_LABELS[input.method] || input.method)}</td></tr>
      ${input.reference ? `<tr><td>Reference</td><td>${esc(input.reference)}</td></tr>` : ''}
      ${input.remarks ? `<tr><td>Remarks</td><td>${esc(input.remarks)}</td></tr>` : ''}
      ${input.collectedBy ? `<tr><td>Collected By</td><td>${esc(input.collectedBy)}</td></tr>` : ''}
    </table>
    <div class="amount-box"><span class="lbl">Amount Received</span><span class="val">₹ ${Number(input.amount).toLocaleString('en-IN')}</span></div>
    <div class="sign">
      <div class="line"><div class="rule"></div>Payer Signature</div>
      <div class="line"><div class="rule"></div>Authorised Signatory, Accounts</div>
    </div>`
  openPrintWindow(`Receipt ${input.receiptNo}`, body, sub)
}

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

function fmtDateStr(d: string | Date): string {
  const date = new Date(d)
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** status derived for the invoice form preview / transformSave */
export function deriveInvoiceStatusClient(total: number, paid: number, dueDate: string | Date | null): string {
  if (paid >= total && total > 0) return 'PAID'
  if (paid > 0) return 'PARTIAL'
  const due = dueDate ? new Date(dueDate) : null
  return due && !isNaN(due.getTime()) && due.getTime() < Date.now() ? 'OVERDUE' : 'PENDING'
}
