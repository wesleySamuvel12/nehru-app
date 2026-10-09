import { NextRequest } from 'next/server'
import { json, err, defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { withStudentNames } from '../_crud'


const crud = defineCrud({
  model: 'certificate',
  module: 'certificates',
  searchFields: ['certificateNo', 'title', 'verifyCode'],
  filterFields: ['type', 'studentId'],
  defaultSort: { field: 'issuedAt', dir: 'desc' },
})

const SORTABLE = ['issuedAt', 'createdAt', 'certificateNo', 'type']

/**
 * GET /api/certificates/issued — issued certificates with student display names
 * resolved server-side (no Prisma relation between Certificate and Student).
 */
export async function GET(req: NextRequest) {
  const g = await crud.guard(req)
  if (g.error) return g.error
  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10')))
    const all = sp.get('all') === '1'
    const sortByRaw = sp.get('sortBy')
    const sortBy = sortByRaw && SORTABLE.includes(sortByRaw) ? sortByRaw : 'issuedAt'
    const sortDir = (sp.get('sortDir') || 'desc') as 'asc' | 'desc'
    const where: any = {}
    const type = sp.get('type')
    if (type && type !== 'ALL') where.type = type
    const studentId = sp.get('studentId')
    if (studentId) where.studentId = studentId
    const q = sp.get('q')
    if (q) where.OR = [{ certificateNo: { contains: q } }, { title: { contains: q } }, { verifyCode: { contains: q } }]

    const findManyArgs: any = {
      where,
      orderBy: { [sortBy]: sortDir },
      ...(all ? { take: 5000 } : { skip: (page - 1) * pageSize, take: pageSize }),
    }
    const [rows, total] = await Promise.all([
      db.certificate.findMany(findManyArgs),
      db.certificate.count({ where }),
    ])
    const data = await withStudentNames(rows)
    return json({
      data,
      meta: { page, pageSize: all ? rows.length : pageSize, total, totalPages: all ? 1 : Math.ceil(total / pageSize) },
    })
  } catch (e) {
    console.error('[certificatesIssued:list]', e)
    return err(500, 'Unable to load issued certificates right now. Please try again.')
  }
}
