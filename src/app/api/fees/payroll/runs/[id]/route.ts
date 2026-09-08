import { NextRequest } from 'next/server'
import { getId } from '@/lib/crud'
import { runsCrud } from '../_shared'

/** GET /api/fees/payroll/runs/[id] */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runsCrud.detail(req, await getId(ctx))
}

/** PATCH /api/fees/payroll/runs/[id] — e.g. Mark Paid */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runsCrud.update(req, await getId(ctx))
}

/** DELETE /api/fees/payroll/runs/[id] — also removes its payslips */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runsCrud.remove(req, await getId(ctx))
}
