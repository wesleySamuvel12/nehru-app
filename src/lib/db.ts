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

  return process.env.DATABASE_URL
}

const resolvedUrl = setupDatabaseUrl()
if (resolvedUrl) {
  process.env.DATABASE_URL = resolvedUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    ...(resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db