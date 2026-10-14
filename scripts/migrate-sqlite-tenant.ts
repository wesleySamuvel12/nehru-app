import { execFileSync } from 'node:child_process'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'db/custom.db')

function runSql(sql: string): string {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf-8' }).trim()
}

export const TENANT_TABLES = [
  'User', 'SchoolSetting', 'AcademicYear', 'Term', 'Department', 'Class', 'Section', 'Subject', 'House',
  'Student', 'Parent', 'Employee', 'Enrollment', 'Attendance', 'EmployeeAttendance', 'LeaveRequest',
  'TimetableSlot', 'Assignment', 'Submission', 'LearningMaterial', 'LessonPlan',
  'Exam', 'ExamSchedule', 'Question', 'Mark', 'GradeConfig', 'ReportCard',
  'FeeStructure', 'FeeInvoice', 'Payment', 'Expense', 'Budget', 'Discount', 'PayrollRun', 'Payslip',
  'PerformanceReview', 'Lead', 'LeadFollowUp', 'Application', 'Campaign',
  'Vehicle', 'Route', 'Stop', 'TransportAllocation',
  'Hostel', 'Room', 'Bed', 'HostelAllocation',
  'Visitor', 'PickupLog', 'SecurityAlert',
  'HealthRecord', 'ClinicVisit', 'Vaccination',
  'Book', 'LibraryTransaction', 'BookReservation',
  'Asset', 'AssetTransfer',
  'Event', 'EventRegistration',
  'Message', 'Announcement', 'Notification', 'NotificationTemplate',
  'Certificate', 'CertificateRequest', 'Complaint',
  'ApprovalWorkflow', 'ApprovalTask', 'IntegrationSetting',
  'AuditLog', 'LoginLog',
]

export const OBSOLETE_GLOBAL_INDEXES = [
  'DROP INDEX IF EXISTS "Student_admissionNo_key";',
  'DROP INDEX IF EXISTS "Employee_employeeNo_key";',
  'DROP INDEX IF EXISTS "Class_name_key";',
  'DROP INDEX IF EXISTS "Department_name_key";',
  'DROP INDEX IF EXISTS "Subject_code_key";',
  'DROP INDEX IF EXISTS "House_name_key";',
  'DROP INDEX IF EXISTS "FeeInvoice_invoiceNo_key";',
  'DROP INDEX IF EXISTS "Payment_receiptNo_key";',
  'DROP INDEX IF EXISTS "PayrollRun_month_year_key";',
  'DROP INDEX IF EXISTS "Application_applicationNo_key";',
  'DROP INDEX IF EXISTS "Certificate_certificateNo_key";',
  'DROP INDEX IF EXISTS "Asset_assetTag_key";',
]

export const COMPOSITE_INDEXES = [
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_student_school_adm ON Student(schoolId, admissionNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_employee_school_emp ON Employee(schoolId, employeeNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_class_school_name ON Class(schoolId, name);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_dept_school_name ON Department(schoolId, name);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_subject_school_code ON Subject(schoolId, code);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_house_school_name ON House(schoolId, name);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_invoice_school_no ON FeeInvoice(schoolId, invoiceNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_school_no ON Payment(schoolId, receiptNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_payroll_school_my ON PayrollRun(schoolId, month, year);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_app_school_no ON Application(schoolId, applicationNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_cert_school_no ON Certificate(schoolId, certificateNo);',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_asset_school_tag ON Asset(schoolId, assetTag);',
  'CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON Attendance(schoolId, date);',
  'CREATE INDEX IF NOT EXISTS idx_student_school ON Student(schoolId);',
  'CREATE INDEX IF NOT EXISTS idx_employee_school ON Employee(schoolId);',
  'CREATE INDEX IF NOT EXISTS idx_invoice_school ON FeeInvoice(schoolId);',
]

export async function migrate() {
  console.log('--- Starting Safe SQLite Multi-Tenant Migration ---')

  // 1. Pre-migration Baselines
  console.log('Recording pre-migration baseline numbers...')
  const preStudents = parseInt(runSql('SELECT count(*) FROM Student;'))
  const preInvoices = parseInt(runSql('SELECT count(*) FROM FeeInvoice;'))
  const prePayments = parseInt(runSql('SELECT count(*) FROM Payment;'))
  const preAttendance = parseInt(runSql('SELECT count(*) FROM Attendance;'))
  const preInvoiceSum = runSql("SELECT printf('%.2f', sum(totalAmount)) FROM FeeInvoice;")
  const prePaymentSum = runSql("SELECT printf('%.2f', sum(amount)) FROM Payment;")

  const masterSchoolId = runSql('SELECT id FROM School WHERE isMaster = 1 LIMIT 1;')
  if (!masterSchoolId) {
    throw new Error('Master school (isMaster = 1) was not found in the School table.')
  }
  console.log(`Master School ID found: ${masterSchoolId}`)

  // 2. Add columns
  console.log('Step 1: Adding schoolId columns where missing...')
  for (const table of TENANT_TABLES) {
    const tableInfo = runSql(`PRAGMA table_info("${table}");`)
    if (!tableInfo.includes('|schoolId|')) {
      runSql(`ALTER TABLE "${table}" ADD COLUMN schoolId TEXT REFERENCES School(id);`)
      console.log(`  + Added schoolId to ${table}`)
    } else {
      console.log(`  = Column schoolId already exists on ${table}`)
    }
  }

  // 3. Transactional Backfill
  console.log('Step 2: Executing transactional backfill...')
  const backfillStatements = [
    'BEGIN TRANSACTION;',
    ...TENANT_TABLES.map((table) => {
      if (table === 'User') {
        // Never identify Super Admins by email; identify by role != 'SUPER_ADMIN'
        return `UPDATE "${table}" SET schoolId = "${masterSchoolId}" WHERE role != "SUPER_ADMIN" AND schoolId IS NULL;`
      }
      return `UPDATE "${table}" SET schoolId = "${masterSchoolId}" WHERE schoolId IS NULL;`
    }),
    'COMMIT;',
  ]
  runSql(backfillStatements.join('\n'))
  console.log('  ✓ Backfill committed successfully.')

  // 4. Create Composite Unique Indexes and Drop Obsolete Global Indexes
  console.log('Step 3: Replacing obsolete global unique indexes with composite unique indexes...')
  for (const dropSql of OBSOLETE_GLOBAL_INDEXES) {
    runSql(dropSql)
  }
  for (const indexSql of COMPOSITE_INDEXES) {
    runSql(indexSql)
  }
  console.log('  ✓ Composite indexes created and obsolete global unique indexes dropped.')

  // 5. Verification
  console.log('Step 4: Performing post-migration verification...')
  const postStudents = parseInt(runSql('SELECT count(*) FROM Student;'))
  const postInvoices = parseInt(runSql('SELECT count(*) FROM FeeInvoice;'))
  const postPayments = parseInt(runSql('SELECT count(*) FROM Payment;'))
  const postAttendance = parseInt(runSql('SELECT count(*) FROM Attendance;'))
  const postInvoiceSum = runSql("SELECT printf('%.2f', sum(totalAmount)) FROM FeeInvoice;")
  const postPaymentSum = runSql("SELECT printf('%.2f', sum(amount)) FROM Payment;")

  const unassignedStudents = parseInt(runSql('SELECT count(*) FROM Student WHERE schoolId IS NULL;'))
  const unassignedInvoices = parseInt(runSql('SELECT count(*) FROM FeeInvoice WHERE schoolId IS NULL;'))
  const unassignedStaff = parseInt(runSql('SELECT count(*) FROM Employee WHERE schoolId IS NULL;'))

  const fkCheck = runSql('PRAGMA foreign_key_check;')
  const integrity = runSql('PRAGMA integrity_check;')

  console.log(`Verification Metrics:`)
  console.log(`- Students: ${preStudents} -> ${postStudents} (unassigned: ${unassignedStudents})`)
  console.log(`- Invoices: ${preInvoices} -> ${postInvoices} (unassigned: ${unassignedInvoices})`)
  console.log(`- FeeInvoice Sum: INR ${preInvoiceSum} -> INR ${postInvoiceSum}`)
  console.log(`- Payment Sum: INR ${prePaymentSum} -> INR ${postPaymentSum}`)
  console.log(`- Foreign Key Check: ${fkCheck || 'PASS (0 errors)'}`)
  console.log(`- SQLite Integrity: ${integrity}`)

  if (
    preStudents !== postStudents ||
    preInvoices !== postInvoices ||
    prePayments !== postPayments ||
    preAttendance !== postAttendance ||
    preInvoiceSum !== postInvoiceSum ||
    prePaymentSum !== postPaymentSum ||
    unassignedStudents !== 0 ||
    unassignedInvoices !== 0 ||
    unassignedStaff !== 0 ||
    integrity !== 'ok'
  ) {
    throw new Error('Post-migration verification failed! Inconsistencies detected.')
  }

  console.log('--- Migration Successfully Verified with 100% Data Fidelity ---')
}

if (process.argv[1] && process.argv[1].endsWith('migrate-sqlite-tenant.ts')) {
  migrate().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
