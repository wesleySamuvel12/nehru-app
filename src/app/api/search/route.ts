import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { resolveTenantContext } from '@/lib/tenant'

/** Global search across students, parents, employees, admissions, fees, books, assets, visitors, certificates — strictly scoped to tenant */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  try {
    const [students, parents, employees, applications, invoices, books, assets, visitors, certs] = await Promise.all([
      db.student.findMany({
        where: {
          ...schoolWhere,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } },
            { admissionNo: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { barcode: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { klass: true, section: true },
        take: 6,
      }),
      db.parent.findMany({
        where: {
          ...schoolWhere,
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.employee.findMany({
        where: {
          ...schoolWhere,
          OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { employeeNo: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.application.findMany({
        where: {
          ...schoolWhere,
          OR: [{ studentName: { contains: q, mode: 'insensitive' } }, { applicationNo: { contains: q, mode: 'insensitive' } }, { parentPhone: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.feeInvoice.findMany({
        where: {
          ...schoolWhere,
          OR: [{ invoiceNo: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.book.findMany({
        where: {
          ...schoolWhere,
          OR: [{ title: { contains: q, mode: 'insensitive' } }, { author: { contains: q, mode: 'insensitive' } }, { isbn: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.asset.findMany({
        where: {
          ...schoolWhere,
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { assetTag: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.visitor.findMany({
        where: {
          ...schoolWhere,
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { passNo: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
      db.certificate.findMany({
        where: {
          ...schoolWhere,
          OR: [{ certificateNo: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }, { verifyCode: { contains: q, mode: 'insensitive' } }],
        },
        take: 5,
      }),
    ])

    const results = [
      ...students.map(s => ({ type: 'Student', id: s.id, title: `${s.firstName} ${s.lastName}`, subtitle: `${s.admissionNo}${s.klass ? ' · ' + s.klass.name : ''}${s.section ? '-' + s.section.name : ''}`, module: 'students', entityId: s.id })),
      ...parents.map(p => ({ type: 'Parent', id: p.id, title: p.name, subtitle: `${p.relation} · ${p.phone}`, module: 'parents', entityId: p.id })),
      ...employees.map(e => ({ type: 'Staff', id: e.id, title: `${e.firstName} ${e.lastName}`, subtitle: `${e.employeeNo} · ${e.designation}`, module: 'teachers', entityId: e.id })),
      ...applications.map(a => ({ type: 'Application', id: a.id, title: `${a.studentName} — ${a.applicationNo}`, subtitle: `${a.classApplied} · ${a.status}`, module: 'admissions', entityId: a.id })),
      ...invoices.map(i => ({ type: 'Invoice', id: i.id, title: `${i.invoiceNo} — ${i.title}`, subtitle: `₹${Math.round(i.totalAmount)} · ${i.status}`, module: 'fees', entityId: i.id })),
      ...books.map(b => ({ type: 'Book', id: b.id, title: b.title, subtitle: `${b.author}${b.isbn ? ' · ISBN ' + b.isbn : ''}`, module: 'library', entityId: b.id })),
      ...assets.map(a => ({ type: 'Asset', id: a.id, title: `${a.name} (${a.assetTag})`, subtitle: `${a.category} · ${a.status}`, module: 'assets', entityId: a.id })),
      ...visitors.map(v => ({ type: 'Visitor', id: v.id, title: v.name, subtitle: `${v.purpose} · ${v.status}`, module: 'security', entityId: v.id })),
      ...certs.map(c => ({ type: 'Certificate', id: c.id, title: c.title, subtitle: `${c.certificateNo} · ${c.type}`, module: 'certificates', entityId: c.id })),
    ]
    return NextResponse.json({ data: results })
  } catch (e) {
    console.error('[search]', e)
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
