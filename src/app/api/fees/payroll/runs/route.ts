import { NextRequest } from 'next/server'
import { defineCrud, err, json } from '@/lib/crud'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { notifyRoles } from '@/lib/notify'
import { inr } from '@/lib/format'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { HR_ROLES, computePayroll, MONTH_LABELS } from './_shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET /api/fees/payroll/runs */
export const GET = defineCrud({
  model: 'payrollRun',
  module: 'hr',
  filterFields: ['status', 'year'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
}).list

/** POST /api/fees/payroll/runs — Run Payroll: generates payslips for all ACTIVE employees. */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!HR_ROLES.includes(session.role) && !can(session.role, 'hr')) {
    return err(403, 'Only HR managers and admins can run payroll.')
  }
  const body = await req.json().catch(() => ({}))
  const month = Math.round(Number(body?.month))
  const year = Math.round(Number(body?.year))
  if (!month || month < 1 || month > 12) return err(400, 'Select a valid payroll month (1–12).')
  if (!year || year < 2000 || year > 2100) return err(400, 'Enter a valid payroll year.')

  const existing = await db.payrollRun.findFirst({ where: { month, year }, select: { id: true } })
  if (existing) return err(409, `Payroll for ${MONTH_LABELS[month]} ${year} has already been processed.`)

  try {
    const { run, employees, total } = await computePayroll(month, year, session)
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'payrollRun', entityId: run.id,
      details: { month, year, employees, total }, ip: req.headers.get('x-forwarded-for'),
    })
    await notifyRoles(
      ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR'],
      'Payroll processed',
      `Payroll for ${MONTH_LABELS[month]} ${year} processed — ${employees} employees, net ${inr(total)}. Mark it paid once bank transfers complete.`,
      { type: 'SUCCESS' },
    )
    return json({ data: run, meta: { employees, total } }, 201)
  } catch (e: any) {
    if (String(e?.code) === 'P2002') return err(409, `Payroll for ${MONTH_LABELS[month]} ${year} has already been processed.`)
    console.error('[payroll:runs:create]', e)
    return err(500, 'Could not process payroll. Please try again.')
  }
}
