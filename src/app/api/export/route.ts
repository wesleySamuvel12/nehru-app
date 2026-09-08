import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** CSV export for any entity: /api/export?entity=students — respects RBAC + scoping */
const ENTITIES: Record<string, { model: string; searchFields?: string[] }> = {
  students: { model: 'student', searchFields: ['firstName', 'lastName', 'admissionNo'] },
  parents: { model: 'parent', searchFields: ['name', 'phone'] },
  employees: { model: 'employee', searchFields: ['firstName', 'lastName', 'employeeNo'] },
  attendance: { model: 'attendance' },
  invoices: { model: 'feeInvoice' },
  payments: { model: 'payment' },
  expenses: { model: 'expense' },
  leads: { model: 'lead' },
  applications: { model: 'application' },
  books: { model: 'book' },
  libraryTxns: { model: 'libraryTransaction' },
  assets: { model: 'asset' },
  vehicles: { model: 'vehicle' },
  visitors: { model: 'visitor' },
  clinicVisits: { model: 'clinicVisit' },
  events: { model: 'event' },
  certificates: { model: 'certificate' },
  payslips: { model: 'payslip' },
  notifications: { model: 'notification' },
}

const MODULE_OF: Record<string, string> = {
  students: 'students', parents: 'parents', employees: 'teachers', attendance: 'attendance',
  invoices: 'fees', payments: 'fees', expenses: 'fees', leads: 'admissions', applications: 'admissions',
  books: 'library', libraryTxns: 'library', assets: 'assets', vehicles: 'transport', visitors: 'security',
  clinicVisits: 'health', events: 'events', certificates: 'certificates', payslips: 'hr', notifications: 'settings',
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = v instanceof Date ? v.toISOString() : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const entity = req.nextUrl.searchParams.get('entity') || ''
  const def = ENTITIES[entity]
  if (!def) return NextResponse.json({ error: 'Unknown export entity.' }, { status: 400 })
  if (!can(session.role, MODULE_OF[entity] || 'dashboard')) {
    return NextResponse.json({ error: 'You do not have permission to export this data.' }, { status: 403 })
  }
  try {
    const rows: any[] = await (db as any)[def.model].findMany({ take: 10000, orderBy: { createdAt: 'desc' as any } })
    if (!rows.length) return NextResponse.json({ error: 'No data to export.' }, { status: 404 })
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n')
    await audit({ userId: session.sub, userName: session.name, userRole: session.role, action: 'EXPORT', entity, details: { rows: rows.length } })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    console.error('[export]', e)
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}
