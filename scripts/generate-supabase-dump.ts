import fs from 'fs'
import { execSync } from 'child_process'
import { db } from '../src/lib/db'

function escapeSqlString(str: string): string {
  return "'" + str.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'"
}

async function generateDump() {
  console.log('Generating PostgreSQL DDL...')
  let ddl = ''
  if (fs.existsSync('prisma/supabase-schema.sql')) {
    ddl = fs.readFileSync('prisma/supabase-schema.sql', 'utf8')
  } else {
    ddl = execSync(
      'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script',
      {
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://postgres:dummy@localhost:5432/postgres',
        },
        encoding: 'utf8',
      }
    )
    fs.writeFileSync('prisma/supabase-schema.sql', ddl, 'utf8')
  }

  // Parse table column types from DDL
  const tableColTypes: Record<string, Record<string, string>> = {}
  const createTableRegex = /CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g
  let match
  while ((match = createTableRegex.exec(ddl)) !== null) {
    const tableName = match[1]
    const body = match[2]
    tableColTypes[tableName] = {}

    const colLines = body.split('\n')
    for (const line of colLines) {
      const colMatch = line.trim().match(/^"([^"]+)"\s+([A-Z0-9_()]+)/i)
      if (colMatch) {
        const colName = colMatch[1]
        const colType = colMatch[2].toUpperCase()
        tableColTypes[tableName][colName] = colType
      }
    }
  }

  console.log(`Parsed schema for ${Object.keys(tableColTypes).length} tables.`)

  const tables = (await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations' ORDER BY name"
  )) as Array<{ name: string }>

  let outSql = `-- =========================================================================
-- NEHRU INTERNATIONAL SCHOOL ERP — SUPABASE POSTGRESQL COMPLETE MIGRATION
-- Generated: ${new Date().toISOString()}
-- Total Tables: ${tables.length}
-- =========================================================================

-- 1. Create Schema and DDL
${ddl}

-- 2. Data Migration
-- Temporarily disable FK constraints during bulk load
SET session_replication_role = 'replica';

`

  let totalRows = 0

  for (const t of tables) {
    const tableName = t.name
    const colTypes = tableColTypes[tableName] || {}
    const rows = (await db.$queryRawUnsafe(`SELECT * FROM "${tableName}"`)) as Array<Record<string, any>>

    if (!rows || rows.length === 0) continue

    console.log(`Exporting ${rows.length} rows from table ${tableName}...`)
    totalRows += rows.length
    outSql += `\n-- -----------------------------------------------------\n-- Table: ${tableName} (${rows.length} rows)\n-- -----------------------------------------------------\n`

    // Batch insert in groups of 100
    const batchSize = 100
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const sample = batch[0]
      const colNames = Object.keys(sample)

      const valuesLines: string[] = []
      for (const row of batch) {
        const rowVals: string[] = []
        for (const col of colNames) {
          const val = row[col]
          const type = (colTypes[col] || '').toUpperCase()

          if (val === null || val === undefined) {
            rowVals.push('NULL')
          } else if (val instanceof Date) {
            rowVals.push(escapeSqlString(val.toISOString()))
          } else if (type === 'BOOLEAN') {
            rowVals.push(val === 1 || val === true || val === 'true' ? 'TRUE' : 'FALSE')
          } else if (type.includes('INT') || type.includes('DOUBLE') || type.includes('DECIMAL')) {
            rowVals.push(String(val))
          } else if (type.includes('TIMESTAMP') || type.includes('DATE')) {
            if (typeof val === 'number' || (typeof val === 'string' && val)) {
              rowVals.push(escapeSqlString(new Date(val).toISOString()))
            } else {
              rowVals.push('NULL')
            }
          } else {
            rowVals.push(escapeSqlString(String(val)))
          }
        }
        valuesLines.push(`  (${rowVals.join(', ')})`)
      }

      outSql += `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')})\nVALUES\n${valuesLines.join(',\n')}\nON CONFLICT DO NOTHING;\n\n`
    }
  }

  outSql += `\n-- Re-enable normal foreign key and trigger enforcement\nSET session_replication_role = 'origin';\n\n`
  outSql += `-- Verification Query\nSELECT 'Migration Complete' as status, ${totalRows} as total_rows_migrated;\n`

  fs.writeFileSync('prisma/supabase-complete-dump.sql', outSql, 'utf8')
  console.log(`Successfully generated prisma/supabase-complete-dump.sql (${(outSql.length / 1024 / 1024).toFixed(2)} MB, ${totalRows} records).`)
  process.exit(0)
}

generateDump().catch(err => {
  console.error(err)
  process.exit(1)
})

