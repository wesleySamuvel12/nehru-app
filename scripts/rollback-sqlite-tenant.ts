import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const dbPath = path.join(process.cwd(), 'db/custom.db')
const backupPath = path.join(process.cwd(), 'db/custom.db.backup-final')

function rollback() {
  console.log('--- Starting SQLite Multi-Tenant Rollback ---')
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`)
  }

  // Restore
  fs.copyFileSync(backupPath, dbPath)
  console.log(`Restored ${dbPath} from ${backupPath}`)

  const integrity = execFileSync('sqlite3', [dbPath, 'PRAGMA integrity_check;'], { encoding: 'utf-8' }).trim()
  const studentCount = execFileSync('sqlite3', [dbPath, 'SELECT count(*) FROM Student;'], { encoding: 'utf-8' }).trim()
  console.log(`Rollback verified: integrity=${integrity}, studentCount=${studentCount}`)

  if (integrity !== 'ok') {
    throw new Error('Rollback integrity check failed!')
  }

  console.log('--- Rollback Completed Successfully ---')
}

rollback()
