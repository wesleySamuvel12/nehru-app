import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ data: session })
}
