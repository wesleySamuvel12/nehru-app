import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { err, json, getId } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET — follow-up history for a lead. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'admissions')) return err(403, 'You do not have permission to access this module.')
  const leadId = await getId(ctx)
  try {
    const rows = await db.leadFollowUp.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return json({ data: rows })
  } catch (e) {
    console.error('[followups:list]', e)
    return err(500, 'Unable to load follow-up history.')
  }
}

/** POST — log a follow-up: stores LeadFollowUp and patches the lead's nextFollowUp. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'admissions')) return err(403, 'You do not have permission to access this module.')
  const leadId = await getId(ctx)
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return err(404, 'Lead not found.')
    const body = await req.json()
    if (!body?.note || !String(body.note).trim()) {
      return err(400, 'Follow-up note is required.', { fields: ['note'] })
    }
    const nextAt = body.nextAt ? new Date(body.nextAt) : null
    const fu = await db.leadFollowUp.create({
      data: {
        leadId,
        note: String(body.note).trim(),
        outcome: body.outcome || 'FOLLOW_UP',
        nextAt,
        byId: session.sub,
        byName: session.name,
      },
    })
    // Keep the lead's next follow-up date in sync; outcome ENROLLED advances the pipeline stage.
    await db.lead.update({
      where: { id: leadId },
      data: {
        nextFollowUp: nextAt,
        ...(body.outcome === 'ENROLLED' ? { stage: 'ENROLLED' } : {}),
      },
    })
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'CREATE', entity: 'leadFollowUp', entityId: fu.id,
      details: { lead: lead.name, outcome: fu.outcome },
      ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: fu }, 201)
  } catch (e) {
    console.error('[followups:create]', e)
    return err(500, 'Could not save the follow-up. Please try again.')
  }
}
