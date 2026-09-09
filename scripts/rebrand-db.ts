/**
 * One-off: rebrand the live SQLite database from Greenwood → Nehru International School (NIS).
 * Preserves all existing data; only names, codes, emails and text blobs are rewritten.
 */
import { Database } from 'bun:sqlite'

const DB_PATH = '/home/z/my-project/db/custom.db'
const db = new Database(DB_PATH)

const statements = [
  `UPDATE School SET name = REPLACE(name, 'Greenwood International School', 'Nehru International School')`,
  `UPDATE School SET name = REPLACE(name, 'Greenwood International', 'Nehru International')`,
  `UPDATE School SET name = REPLACE(name, 'Greenwood', 'Nehru International')`,
  `UPDATE School SET code = REPLACE(code, 'GRW', 'NIS')`,
  `UPDATE School SET email = REPLACE(email, 'greenwood.edu.in', 'nis.edu.in')`,
  `UPDATE SchoolSetting SET schoolName = 'Nehru International School', logoUrl = '/nis-logo.png'`,
  `UPDATE SchoolSetting SET email = REPLACE(email, 'greenwood.edu.in', 'nis.edu.in') WHERE email IS NOT NULL`,
  `UPDATE "User" SET email = REPLACE(email, 'greenwood.edu.in', 'nis.edu.in')`,
  `UPDATE Integration SET configJson = REPLACE(configJson, 'greenwood.edu.in', 'nis.edu.in') WHERE configJson IS NOT NULL`,
  `UPDATE Employee SET email = REPLACE(email, 'greenwood.edu.in', 'nis.edu.in') WHERE email IS NOT NULL`,
  `UPDATE Student SET email = REPLACE(email, 'greenwood.edu.in', 'nis.edu.in') WHERE email IS NOT NULL`,
]

for (const sql of statements) {
  try {
    const r = db.run(sql)
    if (r.changes > 0) console.log(`${r.changes} rows → ${sql.slice(0, 72)}…`)
  } catch (e) {
    console.log('skip:', (e as Error).message.slice(0, 90))
  }
}

// Sweep remaining tables for any text column still containing 'greenwood'
const tables = db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all() as { name: string }[]
for (const t of tables) {
  const cols = (db.query(`PRAGMA table_info("${t.name}")`).all() as { name: string; type: string }[])
    .filter(c => /TEXT|VARCHAR|CLOB/i.test(c.type))
  for (const c of cols) {
    try {
      const r = db.run(`UPDATE "${t.name}" SET "${c.name}" = REPLACE(REPLACE("${c.name}", 'Greenwood', 'Nehru International'), 'greenwood.edu.in', 'nis.edu.in') WHERE "${c.name}" LIKE '%reenwood%'`)
      if (r.changes > 0) console.log(`sweep ${t.name}.${c.name}: ${r.changes} rows`)
    } catch { /* read-only or blob column */ }
  }
}

// Verify nothing remains
const left = db.query(`SELECT COUNT(*) AS n FROM "User" WHERE email LIKE '%greenwood%'`).get() as { n: number }
const schools = db.query(`SELECT name, code, email FROM School`).all()
const setting = db.query(`SELECT schoolName, logoUrl, email FROM SchoolSetting LIMIT 1`).get()
console.log('remaining user emails w/ greenwood:', left.n)
console.log('schools:', schools)
console.log('setting:', setting)
db.close()
