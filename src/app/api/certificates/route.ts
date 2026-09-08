import { NextRequest } from 'next/server'
import { json, err } from '@/lib/crud'
import { db } from '@/lib/db'
import { certificateRequestCrud, withStudentNames } from './_crud'


const SORTABLE = ['createdAt', 'status', 'type', 'requestedBy', 'studentId']

/**
 * GET /api/certificates — paginated list with student display names resolved
 * server-side (no Prisma relation exists between CertificateRequest and Student).
 */
export async function GET(req: NextRequest) {
  const g = await certificateRequestCrud.guard(req)
  if (g.error) return g.error
  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10')))
    const all = sp.get('all') === '1'
    const sortByRaw = sp.get('sortBy')
    const sortBy = sortByRaw && SORTABLE.includes(sortByRaw) ? sortByRaw : 'createdAt'
    const sortDir = (sp.get('sortDir') || 'desc') as 'asc' | 'desc'
    const where: any = {}
    const status = sp.get('status')
    if (status && status !== 'ALL') where.status = status
    const type = sp.get('type')
    if (type && type !== 'ALL') where.type = type
    const studentId = sp.get('studentId')
    if (studentId) where.studentId = studentId
    const q = sp.get('q')
    if (q) where.OR = [{ purpose: { contains: q } }, { type: { contains: q } }, { requestedBy: { contains: q } }]

    const [rows, total] = await Promise.all([
      db.certificateRequest.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        ...(all ? { take: 5000 } : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
      db.certificateRequest.count({ where }),
    ])
    const data = await withStudentNames(rows)
    return json({
      data,
      meta: { page, pageSize: all ? rows.length : pageSize, total, totalPages: all ? 1 : Math.ceil(total / pageSize) },
    })
  } catch (e) {
    console.error('[certificates:list]', e)
    return err(500, 'Unable to load certificate requests right now. Please try again.')
  }
}

export const POST = certificateRequestCrud.create
