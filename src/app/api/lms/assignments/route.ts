import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { audit } from '@/lib/audit'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'
import { getTeacherLmsContext, getTeacherAssignmentScope } from '../_auth'

const VALID_TYPES = ['HOMEWORK', 'ASSIGNMENT', 'PROJECT']
const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED']

/**
 * GET /api/lms/assignments
 * Lists assignments with teacher scoping, search, filters, pagination, and enriched relations.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to access assignments.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10')))
    const all = sp.get('all') === '1'
    const sortBy = sp.get('sortBy') || 'dueDate'
    const sortDir = (sp.get('sortDir') || 'asc') as 'asc' | 'desc'

    const where: any = { ...schoolWhere }

    // Role-based teacher scoping
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, tenant.schoolId)
      if (!teacherCtx) {
        return json({ data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } })
      }
      const scopeWhere = getTeacherAssignmentScope(teacherCtx)
      where.AND = [scopeWhere]
    }

    // Exact filters
    for (const f of ['classId', 'sectionId', 'subjectId', 'type', 'status']) {
      const v = sp.get(f)
      if (v && v !== 'ALL') {
        where[f] = v
      }
    }

    // Search filter
    const q = sp.get('q')?.trim()
    if (q) {
      const searchClause = {
        OR: [
          { title: { contains: q } },
          { teacherName: { contains: q } },
          { description: { contains: q } },
        ],
      }
      if (where.AND) {
        where.AND.push(searchClause)
      } else {
        where.AND = [searchClause]
      }
    }

    const [assignments, total] = await Promise.all([
      db.assignment.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        ...(all ? { take: 5000 } : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
      db.assignment.count({ where }),
    ])

    if (!assignments.length) {
      return json({
        data: [],
        meta: { page, pageSize: all ? 0 : pageSize, total: 0, totalPages: 0 },
      })
    }

    // Lookups for Class, Section, and Subject
    const ids = (key: string) => [...new Set(assignments.map((r: any) => r[key]).filter(Boolean))]
    const classIds = ids('classId')
    const sectionIds = ids('sectionId')
    const subjectIds = ids('subjectId')
    const assignmentIds = assignments.map(a => a.id)

    const [classes, sections, subjects, submissionGroups] = await Promise.all([
      classIds.length ? db.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : [],
      sectionIds.length ? db.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }) : [],
      subjectIds.length ? db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, code: true } }) : [],
      db.submission.groupBy({
        by: ['assignmentId', 'status'],
        where: { assignmentId: { in: assignmentIds } },
        _count: true,
      }),
    ])

    const cMap = Object.fromEntries(classes.map(c => [c.id, c]))
    const secMap = Object.fromEntries(sections.map(s => [s.id, s]))
    const subMap = Object.fromEntries(subjects.map(s => [s.id, s]))

    // Aggregate submission stats per assignment
    const statsMap: Record<string, { total: number; graded: number; pending: number }> = {}
    for (const id of assignmentIds) {
      statsMap[id] = { total: 0, graded: 0, pending: 0 }
    }
    for (const group of submissionGroups) {
      const aId = group.assignmentId
      if (!statsMap[aId]) statsMap[aId] = { total: 0, graded: 0, pending: 0 }
      statsMap[aId].total += group._count
      if (group.status === 'GRADED') {
        statsMap[aId].graded += group._count
      } else {
        statsMap[aId].pending += group._count
      }
    }

    const data = assignments.map(r => ({
      ...r,
      class: cMap[r.classId] || null,
      section: secMap[r.sectionId] || null,
      subject: subMap[r.subjectId] || null,
      stats: statsMap[r.id] || { total: 0, graded: 0, pending: 0 },
    }))

    return json({
      data,
      meta: {
        page,
        pageSize: all ? data.length : pageSize,
        total,
        totalPages: all ? 1 : Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[api:lms:assignments:list]', error)
    return err(500, 'Unable to load assignments. Please try again.')
  }
}

/**
 * POST /api/lms/assignments
 * Creates an assignment with server-side validation and teacher authorization checks.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'lms')) return err(403, 'You do not have permission to create assignments.')

  const tenantRes = await resolveTenantContext(req, session, { isWrite: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolId = tenant.schoolId!

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    const classId = String(body.classId || '').trim()
    const sectionId = String(body.sectionId || '').trim()
    const subjectId = String(body.subjectId || '').trim()
    const dueDateStr = String(body.dueDate || '').trim()

    if (!title || !classId || !sectionId || !subjectId || !dueDateStr) {
      return err(400, 'Title, Class, Section, Subject, and Due Date are required.')
    }

    const dueDate = new Date(dueDateStr)
    if (isNaN(dueDate.getTime())) {
      return err(400, 'Invalid due date provided.')
    }

    let maxMarks = 20
    if (body.maxMarks !== undefined && body.maxMarks !== null && body.maxMarks !== '') {
      maxMarks = Number(body.maxMarks)
      if (isNaN(maxMarks) || maxMarks <= 0 || !Number.isInteger(maxMarks)) {
        return err(400, 'Maximum marks must be a positive whole number.')
      }
    }

    const type = VALID_TYPES.includes(body.type) ? body.type : 'HOMEWORK'
    const status = VALID_STATUSES.includes(body.status) ? body.status : 'PUBLISHED'

    let teacherId = body.teacherId || session.sub
    let teacherName = body.teacherName || session.name

    // Enforce teacher authorization
    if (session.role === 'TEACHER') {
      const teacherCtx = await getTeacherLmsContext(session, schoolId)
      if (!teacherCtx) {
        return err(403, 'Teacher profile not found.')
      }

      const isAuthorized =
        teacherCtx.teacherSubjectIds.includes(subjectId) ||
        teacherCtx.teacherSectionIds.includes(sectionId)

      if (!isAuthorized) {
        return err(403, 'You are not assigned to teach this class or subject.')
      }

      teacherId = teacherCtx.teacher.id
      teacherName = `${teacherCtx.teacher.firstName} ${teacherCtx.teacher.lastName}`.trim()
    }

    const assignment = await db.assignment.create({
      data: {
        schoolId,
        title,
        description: body.description?.trim() || null,
        type,
        classId,
        sectionId,
        subjectId,
        teacherId,
        teacherName,
        dueDate,
        maxMarks,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        status,
      },
    })

    await audit({
      schoolId,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      entity: 'assignment',
      entityId: assignment.id,
      details: { title, classId, sectionId, subjectId, maxMarks },
      ip: req.headers.get('x-forwarded-for'),
    })

    return NextResponse.json({ data: assignment }, { status: 201 })
  } catch (error) {
    console.error('[api:lms:assignments:create]', error)
    return err(500, 'Could not create assignment. Please try again.')
  }
}
