import { NextRequest } from 'next/server'
import { examCrud } from './_crud'
import { requireAuth } from '@/lib/auth'
import { err } from '@/lib/crud'

export const GET = examCrud.list

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  // Subject teachers cannot create school-wide examination cycles
  if (session.role === 'TEACHER') {
    return err(403, 'Teachers do not have permission to create school-wide examinations. Please contact an administrator.')
  }

  return examCrud.create(req)
}
