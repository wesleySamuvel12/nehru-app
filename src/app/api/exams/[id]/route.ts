import type { NextRequest } from 'next/server'
import { examCrud } from '../_crud'
import { getId, err } from '@/lib/crud'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return examCrud.detail(req, await getId(ctx))
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  if (session.role === 'TEACHER') {
    return err(403, 'Teachers do not have permission to modify school-wide examination definitions.')
  }

  return examCrud.update(req, await getId(ctx))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  if (session.role === 'TEACHER') {
    return err(403, 'Teachers do not have permission to delete school examinations.')
  }

  return examCrud.remove(req, await getId(ctx))
}
