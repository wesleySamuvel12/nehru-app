import { NextRequest } from 'next/server'
import { json, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { withStudentNames } from '../_crud'

/** POST /api/certificates/verify { code } — verify a certificate by verifyCode or certificateNo. */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  try {
    const body = await req.json().catch(() => ({}))
    const clean = String(body?.code || '').trim().toUpperCase()
    if (!clean) return err(400, 'Enter a verification code or certificate number.')
    const cert = await db.certificate.findFirst({
      where: { OR: [{ verifyCode: clean }, { certificateNo: clean }] },
    })
    if (!cert) return json({ valid: false })
    const [withName] = await withStudentNames([cert])
    return json({
      valid: true,
      certificate: {
        id: withName.id,
        certificateNo: withName.certificateNo,
        title: withName.title,
        type: withName.type,
        studentName: withName.studentName,
        studentId: withName.studentId,
        issuedBy: withName.issuedBy,
        issuedAt: withName.issuedAt,
        verifyCode: withName.verifyCode,
      },
    })
  } catch (e) {
    console.error('[certificates:verify]', e)
    return err(500, 'Verification failed. Please try again.')
  }
}
