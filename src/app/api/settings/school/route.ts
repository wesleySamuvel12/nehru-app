import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const EDITABLE = [
  'schoolName', 'logoUrl', 'address', 'phone', 'email', 'timezone', 'currency',
  'attendanceLockHours', 'mfaRequired', 'smsEnabled', 'emailEnabled', 'whatsappEnabled',
  'pushEnabled', 'dataEncryption', 'backupFrequency', 'sessionTimeoutMin',
]

async function ensureSingleton() {
  let row = await db.schoolSetting.findFirst()
  if (!row) {
    row = await db.schoolSetting.create({ data: { schoolName: 'Nehru International School' } })
  }
  return row
}

/** GET /api/settings/school — singleton school settings */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to access settings.')
  const row = await ensureSingleton()
  return json({ data: row })
}

/** PUT /api/settings/school — update editable fields */
export async function PUT(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'settings')) return err(403, 'You do not have permission to modify settings.')
  try {
    const body = await req.json()
    if (body.schoolName !== undefined && !String(body.schoolName).trim()) {
      return err(400, 'School name cannot be empty.')
    }
    const data: Record<string, unknown> = {}
    for (const key of EDITABLE) {
      if (body[key] === undefined) continue
      if (typeof body[key] === 'string' && ['schoolName', 'address', 'phone', 'email', 'timezone', 'currency', 'backupFrequency', 'logoUrl'].includes(key)) {
        data[key] = String(body[key]).trim() === '' && key === 'logoUrl' ? null : String(body[key]).trim() || null
      } else if (key === 'attendanceLockHours' || key === 'sessionTimeoutMin') {
        data[key] = Math.max(0, Number(body[key]) || 0)
      } else if (typeof body[key] === 'boolean') {
        data[key] = body[key]
      }
    }
    const current = await ensureSingleton()
    const row = await db.schoolSetting.update({ where: { id: current.id }, data })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'SchoolSetting', entityId: row.id,
      details: { changes: Object.keys(data) }, ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: row })
  } catch (e: any) {
    console.error('[settings:school]', e)
    return err(500, 'Could not save settings. Please try again.')
  }
}
