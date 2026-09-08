import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type. Upload images, PDF or Office documents.' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 })
    const dir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(dir, { recursive: true })
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, safeName), buf)
    return NextResponse.json({ data: { url: `/uploads/${safeName}`, name: file.name, size: file.size, type: file.type } })
  } catch (e) {
    console.error('[upload]', e)
    return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 })
  }
}
