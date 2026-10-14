'use client'

/**
 * HR module shared helpers: employee lookups, payslip printing, star ratings.
 */
import * as React from 'react'
import { openPrintWindow } from '../fees/helpers'
import { MONTHS, monthYearLabel } from '../fees/helpers'

export { MONTHS, monthYearLabel }

/* eslint-disable @typescript-eslint/no-explicit-any */

const cache: { employees: any[] | null } = { employees: null }
let inflight: Promise<any[]> | null = null
const subs = new Set<(rows: any[]) => void>()

/** Cached employee list (endpoint owned by the Teachers & Staff agent — degrades gracefully). */
export function useEmployees() {
  const [rows, setRows] = React.useState<any[]>(cache.employees || [])
  const [loading, setLoading] = React.useState(!cache.employees)

  React.useEffect(() => {
    let alive = true
    const fn = (r: any[]) => { if (alive) setRows(r) }
    subs.add(fn)
    if (cache.employees) {
      setRows(cache.employees)
      setLoading(false)
    } else {
      if (!inflight) {
        inflight = import('@/lib/api-client')
          .then(({ list }) => list('api/employees', { all: 1 }))
          .then(res => {
            cache.employees = res.data
            subs.forEach(f => f(res.data))
            return res.data
          })
          .catch(() => [] as any[])
          .finally(() => { inflight = null })
      }
      inflight.finally(() => alive && setLoading(false))
    }
    return () => { alive = false; subs.delete(fn) }
  }, [])

  const nameOf = React.useCallback((id?: string | null) => {
    const e = rows.find((x: any) => x.id === id)
    return e ? `${e.firstName} ${e.lastName}` : '—'
  }, [rows])

  const options = React.useMemo(
    () => rows
      .filter((e: any) => e.status === 'ACTIVE')
      .map((e: any) => ({ label: `${e.firstName} ${e.lastName} · ${e.designation}`, value: e.id })),
    [rows],
  )

  return { employees: rows, loading, nameOf, options }
}

export function stars(score: number | null | undefined): string {
  const n = Math.max(0, Math.min(5, Math.round(Number(score) || 0)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

/* ── Printable payslip ── */
export function printPayslip(input: {
  employeeName: string; employeeNo?: string; designation?: string; department?: string
  period: string; basic: number; allowances: number; deductions: number; tax: number
  netPay: number; daysPresent?: number; daysPaid?: number; status?: string
  bankAccount?: string | null
}) {
  const sub = `<div class="doc-title">Salary Payslip</div>
    <div class="doc-no">${input.period} · ${input.status ? input.status.charAt(0) + input.status.slice(1).toLowerCase() : ''}</div>`
  const gross = input.basic + input.allowances
  const body = `
    <table class="kv">
      <tr><td>Employee</td><td>${esc(input.employeeName)}</td></tr>
      ${input.employeeNo ? `<tr><td>Employee No.</td><td>${esc(input.employeeNo)}</td></tr>` : ''}
      ${input.designation ? `<tr><td>Designation</td><td>${esc(input.designation)}</td></tr>` : ''}
      ${input.department ? `<tr><td>Department</td><td>${esc(input.department)}</td></tr>` : ''}
      ${input.bankAccount ? `<tr><td>Bank Account</td><td>•••• ${esc(String(input.bankAccount).slice(-4))}</td></tr>` : ''}
      <tr><td>Days Present / Paid</td><td>${input.daysPresent ?? '—'} / ${input.daysPaid ?? 30} days</td></tr>
    </table>
    <table class="kv" style="margin-top:14px">
      <tr><td>Basic Salary</td><td>₹ ${Number(input.basic).toLocaleString('en-IN')}</td></tr>
      <tr><td>Allowances (HRA, conveyance, special)</td><td>₹ ${Number(input.allowances).toLocaleString('en-IN')}</td></tr>
      <tr><td>Gross Earnings</td><td>₹ ${Number(gross).toLocaleString('en-IN')}</td></tr>
      <tr><td>Provident Fund & Other Deductions</td><td>− ₹ ${Number(input.deductions).toLocaleString('en-IN')}</td></tr>
      <tr><td>Income Tax (TDS)</td><td>− ₹ ${Number(input.tax).toLocaleString('en-IN')}</td></tr>
    </table>
    <div class="amount-box"><span class="lbl">Net Pay</span><span class="val">₹ ${Number(input.netPay).toLocaleString('en-IN')}</span></div>
    <div class="sign">
      <div class="line"><div class="rule"></div>Employee Signature</div>
      <div class="line"><div class="rule"></div>Authorised Signatory, HR & Accounts</div>
    </div>`
  openPrintWindow(`Payslip ${input.period}`, body, sub)
}

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}
