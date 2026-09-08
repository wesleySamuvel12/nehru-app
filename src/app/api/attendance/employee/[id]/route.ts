import type { NextRequest } from 'next/server'
import { employeeAttendanceCrud } from '../_crud'
import { getId } from '@/lib/crud'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return employeeAttendanceCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return employeeAttendanceCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return employeeAttendanceCrud.remove(req, await getId(ctx))
}
