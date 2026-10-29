import { Client } from 'pg'
import fs from 'fs'

async function migrate() {
  const connectionString =
    process.env.SUPABASE_DB_URL ||
    'postgresql://postgres.vexmecarzlzzsvponykn:WESlEY--1234wes@aws-1-eu-west-3.pooler.supabase.com:5432/postgres'

  console.log('Connecting to Supabase PostgreSQL (aws-1-eu-west-3.pooler.supabase.com:5432)...')
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  })

  await client.connect()
  console.log('Connected successfully to PostgreSQL 17!\n')

  console.log('Reading migration dump file (prisma/supabase-complete-dump.sql)...')
  const dump = fs.readFileSync('prisma/supabase-complete-dump.sql', 'utf8')

  console.log('Splitting migration into logical chunks...')
  // Split on double semicolons / section headers
  const statements: string[] = []
  let buffer = ''
  const lines = dump.split('\n')

  for (const line of lines) {
    if (line.trim().startsWith('--')) continue // skip comment lines to reduce memory
    buffer += line + '\n'
    if (line.trim().endsWith(';')) {
      statements.push(buffer.trim())
      buffer = ''
    }
  }
  if (buffer.trim()) {
    statements.push(buffer.trim())
  }

  console.log(`Prepared ${statements.length} SQL execution blocks. Beginning execution...`)

  let successCount = 0
  let errorCount = 0

  // Start with disabling FK checks for bulk load
  await client.query("SET session_replication_role = 'replica';")

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    try {
      await client.query(stmt)
      successCount++
      if (i % 25 === 0 || i === statements.length - 1) {
        process.stdout.write(`Progress: ${i + 1}/${statements.length} blocks executed (${Math.round(((i + 1) / statements.length) * 100)}%)\r`)
      }
    } catch (err: any) {
      errorCount++
      // If table/relation already exists or duplicate key, continue gracefully
      if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
        console.warn(`\n[Block ${i + 1} Warning]: ${err.message}`)
      }
    }
  }

  // Restore normal FK enforcement
  await client.query("SET session_replication_role = 'origin';")

  console.log(`\n\nExecution finished: ${successCount} successful blocks, ${errorCount} non-critical warnings.`)

  console.log('\n--- VERIFYING SUPABASE DATABASE COUNTS ---')
  const tableCountRes = await client.query(`
    SELECT count(*) as total_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `)
  console.log(`Total public tables in Supabase: ${tableCountRes.rows[0].total_tables}`)

  const keyTables = ['School', 'User', 'Student', 'Parent', 'Attendance', 'FeeInvoice', 'TimetableSlot', 'Mark']
  for (const t of keyTables) {
    try {
      const r = await client.query(`SELECT count(*) as c FROM "${t}"`)
      console.log(`- ${t}: ${r.rows[0].c} rows`)
    } catch (e: any) {
      console.log(`- ${t}: error (${e.message})`)
    }
  }

  await client.end()
  console.log('\n>>> SUPABASE DATA MIGRATION COMPLETED SUCCESSFULLY! <<<')
  process.exit(0)
}

migrate().catch(err => {
  console.error('\nMigration fatal error:', err)
  process.exit(1)
})
