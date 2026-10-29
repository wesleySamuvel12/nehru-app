import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

function setupDatabaseUrl(): string | undefined {
  const currentUrl = process.env.DATABASE_URL
  if (currentUrl && !currentUrl.startsWith('file:')) {
    return currentUrl
  }

  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL ||
    process.env.LAMBDA_TASK_ROOT
  )

  if (isServerless) {
    const tmpDbPath = path.join('/tmp', 'custom.db')
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'db', 'custom.db'),
        path.join(process.cwd(), '..', 'db', 'custom.db'),
        path.join(process.cwd(), 'prisma', 'custom.db'),
        path.join(__dirname, '..', '..', '..', 'db', 'custom.db'),
        path.join('/var/task', 'db', 'custom.db'),
        path.join('/var/task', 'custom.db'),
      ]
      for (const candidate of candidates) {
        if (fs.existsSync(/* turbopackIgnore: true */ candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath)
            console.log(`[db] Copied SQLite database from ${candidate} to ${tmpDbPath}`)
            break
          } catch (e) {
            console.error(`[db] Failed to copy database from ${candidate}:`, e)
          }
        }
      }
    }
    if (fs.existsSync(tmpDbPath)) {
      return `file:${tmpDbPath}`
    }
  }

  // Local development: resolve absolute path to custom.db
  const localCandidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), '..', 'db', 'custom.db'),
    path.join(__dirname, '..', '..', '..', 'db', 'custom.db'),
  ]
  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      return `file:${candidate.replace(/\\/g, '/')}`
    }
  }

  return process.env.DATABASE_URL
}

const resolvedUrl = setupDatabaseUrl()
if (resolvedUrl) {
  process.env.DATABASE_URL = resolvedUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaUrl: string | undefined
}

function initPrisma(url?: string): PrismaClient {
  const isDebug = process.env.DEBUG_PRISMA === '1'
  const client = new PrismaClient({
    log: isDebug ? ['query', 'error', 'warn'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  })

  // Fast SQLite PRAGMAs: WAL mode, memory cache, and concurrent read throughput
  if (!url || url.startsWith('file:')) {
    client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`).catch(() => {})
    client.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`).catch(() => {})
    client.$queryRawUnsafe(`PRAGMA cache_size = -64000;`).catch(() => {})
    client.$queryRawUnsafe(`PRAGMA temp_store = MEMORY;`).catch(() => {})
    client.$queryRawUnsafe(`PRAGMA mmap_size = 268435456;`).catch(() => {})
    client.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`).catch(() => {})
  }

  return client
}

export const db =
  (globalForPrisma.prisma && globalForPrisma.prismaUrl === resolvedUrl)
    ? globalForPrisma.prisma
    : initPrisma(resolvedUrl)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.prismaUrl = resolvedUrl
}

/**
 * Case-insensitive substring filter that works across providers.
 * SQLite's LIKE is already case-insensitive (ASCII) and rejects Prisma's `mode`;
 * PostgreSQL requires `mode: 'insensitive'`.
 */
export function containsText(q: string): any {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('file:') ? { contains: q } : { contains: q, mode: 'insensitive' }
}