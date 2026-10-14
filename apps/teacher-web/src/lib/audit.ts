import { db } from './db'

export interface AuditEntry {
  userId?: string | null
  userName?: string | null
  userRole?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: unknown
  ip?: string | null
}

export async function audit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId || undefined,
        userName: entry.userName || undefined,
        userRole: entry.userRole || undefined,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || undefined,
        details: typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details ?? undefined),
        ip: entry.ip || undefined,
      },
    })
  } catch (e) {
    console.error('audit failed', e)
  }
}
