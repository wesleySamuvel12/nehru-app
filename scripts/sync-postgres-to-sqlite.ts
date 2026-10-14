/**
 * Nehru App / School ERP — Post-Cutover Rollback Tool
 *
 * Preserves any new records or updates written to PostgreSQL after cutover,
 * syncing them back into db/custom.db before restoring SQLite as the active provider.
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

// Tables likely to receive new records during production operation
const SYNC_MODELS = [
  'User',
  'Student',
  'Employee',
  'FeeInvoice',
  'Payment',
  'Attendance',
  'EmployeeAttendance',
  'LeaveRequest',
  'AuditLog',
  'LoginLog',
  'Notification',
  'Message',
  'Visitor',
  'SecurityAlert',
]

async function forwardSync() {
  console.log('=================================================================')
  console.log(' Post-Cutover Rollback: PostgreSQL to SQLite Forward Sync')
  console.log('=================================================================\n')

  const sinceArgIndex = process.argv.indexOf('--since')
  const sinceTime = sinceArgIndex !== -1 ? new Date(process.argv[sinceArgIndex + 1]) : new Date(0)

  console.log(`Syncing records created or modified since: ${sinceTime.toISOString()}`)

  const sqlite = new DatabaseSync(SQLITE_PATH)
  const prisma = new PrismaClient({ datasources: { db: { url: POSTGRES_URL } } })

  let totalSynced = 0

  try {
    for (const model of SYNC_MODELS) {
      const delegateName = model.charAt(0).toLowerCase() + model.slice(1)
      const delegate = (prisma as any)[delegateName]

      const whereClause: any = {}
      if (sinceTime.getTime() > 0) {
        whereClause.OR = [
          { createdAt: { gte: sinceTime } },
          { updatedAt: { gte: sinceTime } },
        ]
      }

      const pgRecords = await delegate.findMany({ where: whereClause })
      if (pgRecords.length === 0) continue

      let tableSynced = 0
      for (const rec of pgRecords) {
        const columns = Object.keys(rec)
        const placeholders = columns.map(() => '?').join(', ')
        const updateClause = columns.map(c => `"${c}" = excluded."${c}"`).join(', ')

        const values = columns.map(c => {
          const val = rec[c]
          if (val instanceof Date) return val.getTime()
          if (typeof val === 'boolean') return val ? 1 : 0
          return val
        })

        const sql = `
          INSERT INTO "${model}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
          ON CONFLICT(id) DO UPDATE SET ${updateClause};
        `
        sqlite.prepare(sql).run(...values)
        tableSynced++
      }

      console.log(`✔ Synced ${tableSynced} records for ${model}`)
      totalSynced += tableSynced
    }

    console.log(`\n✔ Forward sync complete: ${totalSynced} records synchronized to SQLite.`)
  } catch (err) {
    console.error('Forward sync error:', err)
    process.exit(1)
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

forwardSync()
