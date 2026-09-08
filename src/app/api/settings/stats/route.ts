import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET /api/settings/stats — record counts + grading scales + current year for the Settings module */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to access settings.')
  try {
    const [
      students, parents, employees, classes, attendance, invoices,
      payments, expenses, leads, applications, books, vehicles,
      users, auditLogs, announcements, events, gradeConfigs, currentYear,
    ] = await Promise.all([
      db.student.count(), db.parent.count(), db.employee.count(), db.class.count(),
      db.attendance.count(), db.feeInvoice.count(), db.payment.count(), db.expense.count(),
      db.lead.count(), db.application.count(), db.book.count(), db.vehicle.count(),
      db.user.count(), db.auditLog.count(), db.announcement.count(), db.event.count(),
      db.gradeConfig.findMany({ orderBy: { minPercent: 'desc' } }),
      db.academicYear.findFirst({ where: { isCurrent: true }, include: { terms: { orderBy: { startDate: 'asc' } } } }),
    ])

    const counts = [
      { key: 'students', label: 'Students', count: students, exportable: 'students' },
      { key: 'parents', label: 'Parents', count: parents },
      { key: 'employees', label: 'Employees', count: employees, exportable: 'employees' },
      { key: 'classes', label: 'Classes', count: classes },
      { key: 'attendance', label: 'Attendance rows', count: attendance, exportable: 'attendance' },
      { key: 'invoices', label: 'Fee invoices', count: invoices, exportable: 'invoices' },
      { key: 'payments', label: 'Payments', count: payments, exportable: 'payments' },
      { key: 'expenses', label: 'Expenses', count: expenses, exportable: 'expenses' },
      { key: 'leads', label: 'Admission leads', count: leads, exportable: 'leads' },
      { key: 'applications', label: 'Applications', count: applications, exportable: 'applications' },
      { key: 'books', label: 'Library books', count: books, exportable: 'books' },
      { key: 'vehicles', label: 'Fleet vehicles', count: vehicles, exportable: 'vehicles' },
      { key: 'users', label: 'User accounts', count: users },
      { key: 'auditLogs', label: 'Audit events', count: auditLogs },
      { key: 'announcements', label: 'Announcements', count: announcements },
      { key: 'events', label: 'Events', count: events, exportable: 'events' },
    ]

    return json({
      counts,
      gradingScales: gradeConfigs,
      currentYear: currentYear || null,
    })
  } catch (e: any) {
    console.error('[settings:stats]', e)
    return err(500, 'Unable to load database stats right now.')
  }
}
