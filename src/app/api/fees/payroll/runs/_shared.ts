/**
 * Payroll Runs — shared config (used by route.ts and [id]/route.ts).
 * Note: POST /api/fees/payroll/runs is a custom handler (computes payslips transactionally).
 */
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { inr } from '@/lib/format'
import { MONTH_LABELS } from '../../invoices/_shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const HR_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR']

export const runsCrud = defineCrud({
  model: 'payrollRun',
  module: 'hr',
  filterFields: ['status', 'year'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  afterUpdate: async (row: any, _session, before: any) => {
    // Mark Paid → payslip rows become PAID too
    if (before.status !== row.status && row.status === 'PAID') {
      await db.payslip.updateMany({ where: { payrollRunId: row.id, status: { not: 'PAID' } }, data: { status: 'PAID' } })
    }
  },
  afterDelete: async (row: any) => {
    await db.payslip.deleteMany({ where: { payrollRunId: row.id } })
  },
})

export interface RunPayrollResult {
  run: any
  employees: number
  total: number
}

/** Compute a payroll run: payslip per ACTIVE employee (allowances 18%, deductions 6%, tax 10%). */
export async function computePayroll(month: number, year: number, session: { sub: string; name: string }): Promise<RunPayrollResult> {
  const employees = await db.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true, salary: true } })
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  const present = await db.employeeAttendance.groupBy({
    by: ['employeeId'],
    where: { date: { gte: from, lte: to }, status: 'PRESENT' },
    _count: { _all: true },
  })
  const presentMap = new Map<string, number>(present.map((p: any) => [p.employeeId, p._count._all]))

  const rows = employees.map((e: any) => {
    const basic = Math.max(0, e.salary || 0)
    const allowances = Math.round(basic * 0.18)
    const deductions = Math.round(basic * 0.06)
    const tax = Math.round(basic * 0.1)
    return {
      employeeId: e.id,
      basic,
      allowances,
      deductions,
      tax,
      netPay: basic + allowances - deductions - tax,
      daysPresent: presentMap.get(e.id) || 0,
      daysPaid: 30,
      status: 'GENERATED',
    }
  })
  const totalAmount = rows.reduce((s: number, r: any) => s + r.netPay, 0)

  const run = await db.payrollRun.create({
    data: {
      month, year,
      status: 'PROCESSED',
      totalAmount,
      processedBy: session.name,
      processedById: session.sub,
      processedAt: new Date(),
    },
  })
  if (rows.length) {
    await db.payslip.createMany({ data: rows.map((r: any) => ({ ...r, payrollRunId: run.id })) })
  }
  return { run, employees: rows.length, total: totalAmount }
}

export { MONTH_LABELS, inr }
