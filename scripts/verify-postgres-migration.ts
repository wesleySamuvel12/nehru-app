/**
 * Nehru App / School ERP — Comprehensive SQLite vs PostgreSQL Parity Verification
 */

import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const SQLITE_PATH = path.join(process.cwd(), 'db', 'custom.db')
const POSTGRES_URL =
  process.env.POSTGRES_TARGET_URL ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')
    ? process.env.DATABASE_URL
    : 'postgresql://nehru_erp:nehru_erp_dev_secret_change_in_prod@127.0.0.1:5433/nehru_erp?schema=public')

const TABLES = [
  'School', 'AcademicYear', 'IntegrationSetting', 'NotificationTemplate', 'Permission',
  'GradeConfig', 'House', 'ApprovalWorkflow', 'Hostel', 'Vehicle', 'Route', 'Book', 'Campaign',
  'Department', 'Class', 'Term', 'Room', 'Stop', 'SchoolSetting',
  'Section', 'Bed', 'User',
  'Parent', 'Employee', 'Student', 'Subject',
  'FeeStructure', 'FeeInvoice', 'Discount', 'Expense', 'Budget', 'PayrollRun',
  'Exam', 'Question', 'HealthRecord', 'HostelAllocation', 'Complaint', 'TransportAllocation',
  'Asset', 'Event', 'Announcement', 'Lead', 'Application', 'Assignment',
  'LessonPlan', 'LearningMaterial', 'Visitor', 'SecurityAlert', 'Certificate',
  'Payment', 'Payslip', 'ExamSchedule', 'Mark', 'ReportCard',
  'Attendance', 'EmployeeAttendance', 'LeaveRequest', 'ClinicVisit', 'Vaccination',
  'AssetTransfer', 'BookReservation', 'LibraryTransaction', 'EventRegistration',
  'Message', 'Notification', 'LeadFollowUp', 'Submission', 'PickupLog',
  'CertificateRequest', 'ApprovalTask', 'PerformanceReview', 'AuditLog', 'LoginLog',
  'Enrollment', 'TimetableSlot'
]

async function verify() {
  console.log('=================================================================')
  console.log(' SQLite vs PostgreSQL Comprehensive Parity Verification')
  console.log('=================================================================\n')

  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true })
  const prisma = new PrismaClient({
    datasources: { db: { url: POSTGRES_URL } },
  })

  let allChecksPassed = true

  try {
    // 1. Table-by-Table Row Count Parity
    console.log('--- 1. Table Row Counts Parity (75 Tables) ---')
    let totalSqliteRows = 0
    let totalPgRows = 0
    const countMismatches: string[] = []

    for (const t of TABLES) {
      const sqliteCount = (sqlite.prepare(`SELECT count(*) as cnt FROM "${t}"`).get() as any).cnt
      const pgCount = await (prisma as any)[t.charAt(0).toLowerCase() + t.slice(1)].count()

      totalSqliteRows += sqliteCount
      totalPgRows += pgCount

      if (sqliteCount !== pgCount) {
        countMismatches.push(`${t}: SQLite=${sqliteCount}, PG=${pgCount}`)
        allChecksPassed = false
      }
    }

    if (countMismatches.length === 0) {
      console.log(`✔ All 75 tables match perfectly! Total rows: ${totalPgRows} (SQLite: ${totalSqliteRows})\n`)
    } else {
      console.error(`✖ Count mismatches detected:`, countMismatches, '\n')
    }

    // 2. Missing & Duplicate IDs Check
    console.log('--- 2. ID Integrity & Uniqueness Audit ---')
    let idMismatches = 0
    let duplicates = 0

    for (const t of TABLES) {
      const delegate = (prisma as any)[t.charAt(0).toLowerCase() + t.slice(1)]
      const sqliteRows = sqlite.prepare(`SELECT id FROM "${t}"`).all() as any[]
      if (sqliteRows.length === 0) continue

      const pgRows = await delegate.findMany({ select: { id: true } })
      const pgIdSet = new Set(pgRows.map((r: any) => r.id))

      if (pgRows.length !== pgIdSet.size) {
        console.error(`✖ Duplicate IDs detected in PostgreSQL table ${t}!`)
        duplicates++
        allChecksPassed = false
      }

      for (const r of sqliteRows) {
        if (!pgIdSet.has(r.id)) {
          console.error(`✖ Missing ID in PostgreSQL table ${t}: ${r.id}`)
          idMismatches++
          allChecksPassed = false
        }
      }
    }

    if (idMismatches === 0 && duplicates === 0) {
      console.log('✔ Zero missing IDs. Zero duplicate IDs across all 75 tables.\n')
    }

    // 3. Foreign Key Integrity Audit in PostgreSQL
    console.log('--- 3. Foreign Key & Relational Integrity Audit ---')
    const fkChecks = [
      { child: 'feeInvoice', parent: 'student', fk: 'studentId' },
      { child: 'payment', parent: 'feeInvoice', fk: 'invoiceId' },
      { child: 'attendance', parent: 'student', fk: 'studentId' },
      { child: 'mark', parent: 'student', fk: 'studentId' },
      { child: 'mark', parent: 'exam', fk: 'examId' },
      { child: 'section', parent: 'class', fk: 'classId' },
      { child: 'student', parent: 'section', fk: 'sectionId' },
      { child: 'hostelAllocation', parent: 'student', fk: 'studentId' },
      { child: 'hostelAllocation', parent: 'bed', fk: 'bedId' },
      { child: 'libraryTransaction', parent: 'book', fk: 'bookId' },
      { child: 'submission', parent: 'assignment', fk: 'assignmentId' },
    ]

    let fkViolations = 0
    for (const check of fkChecks) {
      const childDelegate = (prisma as any)[check.child]
      const parentDelegate = (prisma as any)[check.parent]

      const children = await childDelegate.findMany({
        select: { id: true, [check.fk]: true }
      })

      const parentIds = new Set((await parentDelegate.findMany({ select: { id: true } })).map((p: any) => p.id))
      for (const c of children) {
        if (!c[check.fk]) continue
        if (!parentIds.has(c[check.fk])) {
          console.error(`✖ Orphaned foreign key: ${check.child}.${check.fk} = ${c[check.fk]}`)
          fkViolations++
          allChecksPassed = false
        }
      }
    }

    if (fkViolations === 0) {
      console.log('✔ All 11 major foreign key relationships verified with 0 orphaned references.\n')
    }

    // 4. Multi-Tenant Ownership Audit
    console.log('--- 4. Multi-Tenant School Ownership Audit ---')
    const nullUsers = await prisma.user.count({ where: { schoolId: null } })
    const superAdmin = await prisma.user.findFirst({ where: { schoolId: null } })
    console.log(`- Global Users with NULL schoolId: ${nullUsers} (${superAdmin?.email})`)

    const nullStudents = await prisma.student.count({ where: { schoolId: null } })
    const nullInvoices = await prisma.feeInvoice.count({ where: { schoolId: null } })
    const nullPayments = await prisma.payment.count({ where: { schoolId: null } })
    const nullEmployees = await prisma.employee.count({ where: { schoolId: null } })

    if (nullUsers === 1 && nullStudents === 0 && nullInvoices === 0 && nullPayments === 0 && nullEmployees === 0) {
      console.log('✔ Tenant isolation intact: Exactly 1 global Super Admin, 0 orphaned domain records.\n')
    } else {
      console.error('✖ Tenant isolation anomaly detected!')
      allChecksPassed = false
    }

    // 5. Financial Totals Audit
    console.log('--- 5. Financial Totals Parity Audit ---')
    const sqliteInvoices = sqlite.prepare('SELECT sum(totalAmount) as total, sum(paidAmount) as paid FROM FeeInvoice').get() as any
    const sqlitePayments = sqlite.prepare('SELECT sum(amount) as total FROM Payment').get() as any
    const sqliteExpenses = sqlite.prepare('SELECT sum(amount) as total FROM Expense').get() as any
    const sqliteSalaries = sqlite.prepare('SELECT sum(salary) as total FROM Employee').get() as any

    const pgInvoices = await prisma.feeInvoice.aggregate({ _sum: { totalAmount: true, paidAmount: true } })
    const pgPayments = await prisma.payment.aggregate({ _sum: { amount: true } })
    const pgExpenses = await prisma.expense.aggregate({ _sum: { amount: true } })
    const pgSalaries = await prisma.employee.aggregate({ _sum: { salary: true } })

    console.log(`- Invoices Total: SQLite = ₹${sqliteInvoices.total.toLocaleString()} | PG = ₹${pgInvoices._sum.totalAmount?.toLocaleString()}`)
    console.log(`- Invoices Paid:  SQLite = ₹${sqliteInvoices.paid.toLocaleString()} | PG = ₹${pgInvoices._sum.paidAmount?.toLocaleString()}`)
    console.log(`- Payments Total: SQLite = ₹${sqlitePayments.total.toLocaleString()} | PG = ₹${pgPayments._sum.amount?.toLocaleString()}`)
    console.log(`- Expenses Total: SQLite = ₹${sqliteExpenses.total.toLocaleString()} | PG = ₹${pgExpenses._sum.amount?.toLocaleString()}`)
    console.log(`- Salaries Total: SQLite = ₹${sqliteSalaries.total.toLocaleString()} | PG = ₹${pgSalaries._sum.salary?.toLocaleString()}\n`)

    if (
      sqliteInvoices.total === pgInvoices._sum.totalAmount &&
      sqliteInvoices.paid === pgInvoices._sum.paidAmount &&
      sqlitePayments.total === pgPayments._sum.amount &&
      sqliteExpenses.total === pgExpenses._sum.amount &&
      sqliteSalaries.total === pgSalaries._sum.salary
    ) {
      console.log('✔ All financial sums match 100% to the exact rupee!\n')
    } else {
      console.error('✖ Financial drift detected!')
      allChecksPassed = false
    }

    console.log('=================================================================')
    if (allChecksPassed) {
      console.log(' ALL VERIFICATION CHECKS PASSED (100% PARITY)')
    } else {
      console.log(' VERIFICATION FAILED (Anomalies detected)')
      process.exit(1)
    }
    console.log('=================================================================\n')
  } catch (err) {
    console.error('Verification error:', err)
    process.exit(1)
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

verify()
