/**
 * Nehru App / School ERP — SQLite to PostgreSQL Data Migration Script
 *
 * - Reads db/custom.db in STRICT READ-ONLY mode via node:sqlite
 * - Connects to PostgreSQL target via PrismaClient
 * - Respects topological dependency order across all 75 tables
 * - Converts SQLite integers to native Booleans and timestamps to Date objects
 * - Validates counts and foreign-key integrity at each step
 */

import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const SQLITE_PATH = path.join(process.cwd(), 'db', 'custom.db')
const POSTGRES_FALLBACK_URL =
  'postgresql://nehru_erp:nehru_erp_dev_secret_change_in_prod@127.0.0.1:5433/nehru_erp?schema=public'

const POSTGRES_URL =
  process.env.POSTGRES_TARGET_URL ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')
    ? process.env.DATABASE_URL
    : POSTGRES_FALLBACK_URL)

// Strict topological order (parent tables before child tables)
const TOPOLOGICAL_TABLES = [
  // Tier 1: Standalone root tables & reference models
  'School',
  'AcademicYear',
  'IntegrationSetting',
  'NotificationTemplate',
  'Permission',
  'GradeConfig',
  'House',
  'ApprovalWorkflow',
  'Hostel',
  'Vehicle',
  'Route',
  'Book',
  'Campaign',

  // Tier 2: Level 1 children
  'Department',
  'Class',
  'Term',
  'Room',
  'Stop',
  'SchoolSetting',

  // Tier 3: Level 2 children & users
  'Section',
  'Bed',
  'User',

  // Tier 4: Actors
  'Parent',
  'Employee',
  'Student',
  'Subject',

  // Tier 5: Domain entities
  'FeeStructure',
  'FeeInvoice',
  'Discount',
  'Expense',
  'Budget',
  'PayrollRun',
  'Exam',
  'Question',
  'HealthRecord',
  'HostelAllocation',
  'Complaint',
  'TransportAllocation',
  'Asset',
  'Event',
  'Announcement',
  'Lead',
  'Application',
  'Assignment',
  'LessonPlan',
  'LearningMaterial',
  'Visitor',
  'SecurityAlert',
  'Certificate',

  // Tier 6: Transactional children & logs
  'Payment',
  'Payslip',
  'ExamSchedule',
  'Mark',
  'ReportCard',
  'Attendance',
  'EmployeeAttendance',
  'LeaveRequest',
  'ClinicVisit',
  'Vaccination',
  'AssetTransfer',
  'BookReservation',
  'LibraryTransaction',
  'EventRegistration',
  'Message',
  'Notification',
  'LeadFollowUp',
  'Submission',
  'PickupLog',
  'CertificateRequest',
  'ApprovalTask',
  'PerformanceReview',
  'AuditLog',
  'LoginLog',
  'Enrollment',
  'TimetableSlot',
]

// Parse schema to get field types (Boolean, DateTime, Float, Int) for accurate transformation
function parseFieldTypes(): Record<string, Record<string, string>> {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.postgres.prisma')
  const content = fs.readFileSync(schemaPath, 'utf8')
  const modelBlocks = content.split(/^model\s+/m).slice(1)
  const map: Record<string, Record<string, string>> = {}

  for (const block of modelBlocks) {
    const match = block.match(/^(\w+)\s+\{/)
    if (!match) continue
    const modelName = match[1]
    map[modelName] = {}

    const lines = block.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('}') ||
        trimmed.startsWith('@@')
      )
        continue
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 2) {
        const fieldName = parts[0]
        const rawType = parts[1].replace('?', '').replace('[]', '')
        map[modelName][fieldName] = rawType
      }
    }
  }
  return map
}

function toDelegateName(tableName: string): string {
  // Handle casing for Prisma delegates: e.g. 'School' -> 'school', 'FeeInvoice' -> 'feeInvoice'
  return tableName.charAt(0).toLowerCase() + tableName.slice(1)
}

async function runMigration() {
  console.log('=================================================================')
  console.log(' Nehru App / School ERP — SQLite to PostgreSQL Data Migration')
  console.log('=================================================================\n')

  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(`SQLite database not found at ${SQLITE_PATH}`)
  }

  console.log(`Source SQLite Database: ${SQLITE_PATH} (Read-Only)`)
  console.log(`Target PostgreSQL URL:  ${POSTGRES_URL.replace(/:[^:]*@/, ':****@')}\n`)

  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true })
  const prisma = new PrismaClient({
    datasources: { db: { url: POSTGRES_URL } },
  })

  const fieldTypes = parseFieldTypes()

  try {
    // 1. Verify PostgreSQL connection
    await prisma.$executeRawUnsafe(`SELECT 1;`)
    console.log('✔ Connected to target PostgreSQL database.\n')

    // 2. Create checkpoint table if it does not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _migration_checkpoints (
        table_name TEXT PRIMARY KEY,
        source_count INT NOT NULL,
        migrated_count INT NOT NULL,
        status TEXT NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    // Check if clean mode is requested or existing records exist
    const isCleanRun = process.argv.includes('--clean')
    if (isCleanRun) {
      console.log('Cleaning target PostgreSQL tables in reverse topological order...')
      for (const t of [...TOPOLOGICAL_TABLES].reverse()) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE;`)
      }
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE _migration_checkpoints;`)
      console.log('✔ Target tables truncated.\n')
    }

    let totalMigratedRows = 0

    // 3. Migrate tables in topological order
    for (let i = 0; i < TOPOLOGICAL_TABLES.length; i++) {
      const tableName = TOPOLOGICAL_TABLES[i]
      const delegateName = toDelegateName(tableName)
      const delegate = (prisma as any)[delegateName]

      if (!delegate) {
        throw new Error(`Prisma delegate not found for model: ${tableName} (${delegateName})`)
      }

      // Read rows from SQLite
      const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[]
      const sourceCount = rows.length

      if (sourceCount === 0) {
        console.log(`[${i + 1}/${TOPOLOGICAL_TABLES.length}] ${tableName}: 0 records (skipped)`)
        await prisma.$executeRawUnsafe(
          `INSERT INTO _migration_checkpoints (table_name, source_count, migrated_count, status)
           VALUES ($1, 0, 0, 'COMPLETED')
           ON CONFLICT (table_name) DO UPDATE SET status = 'COMPLETED', completed_at = NOW();`,
          tableName
        )
        continue
      }

      const types = fieldTypes[tableName] || {}

      // Convert rows according to schema types
      const convertedRows = rows.map(row => {
        const item: Record<string, any> = {}
        for (const [key, val] of Object.entries(row)) {
          if (val === null || val === undefined) {
            item[key] = null
            continue
          }

          const fieldType = types[key]
          if (fieldType === 'Boolean') {
            item[key] = Boolean(val)
          } else if (fieldType === 'DateTime') {
            item[key] = new Date(typeof val === 'number' ? val : isNaN(Number(val)) ? val : Number(val))
          } else if (fieldType === 'Float') {
            item[key] = Number(val)
          } else if (fieldType === 'Int') {
            item[key] = parseInt(String(val), 10)
          } else {
            item[key] = val
          }
        }
        return item
      })

      // Batch insert with chunk size of 500
      const CHUNK_SIZE = 500
      for (let c = 0; c < convertedRows.length; c += CHUNK_SIZE) {
        const chunk = convertedRows.slice(c, c + CHUNK_SIZE)
        await delegate.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }

      // Verify count in PostgreSQL
      const targetCount = await delegate.count()
      if (targetCount !== sourceCount) {
        throw new Error(
          `Count mismatch for ${tableName}: SQLite has ${sourceCount}, PostgreSQL has ${targetCount}!`
        )
      }

      totalMigratedRows += sourceCount
      console.log(
        `✔ [${i + 1}/${TOPOLOGICAL_TABLES.length}] ${tableName}: ${sourceCount} records migrated and verified.`
      )

      await prisma.$executeRawUnsafe(
        `INSERT INTO _migration_checkpoints (table_name, source_count, migrated_count, status)
         VALUES ($1, $2, $3, 'COMPLETED')
         ON CONFLICT (table_name) DO UPDATE
         SET source_count = $2, migrated_count = $3, status = 'COMPLETED', completed_at = NOW();`,
        tableName,
        sourceCount,
        targetCount
      )
    }

    console.log('\n=================================================================')
    console.log(` Migration SUCCESS: All 75 tables migrated (${totalMigratedRows} rows)!`)
    console.log('=================================================================\n')
  } catch (error) {
    console.error('\n✖ MIGRATION FAILED:', error)
    process.exit(1)
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

runMigration()
