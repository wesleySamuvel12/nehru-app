import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

interface CachedStats {
  at: number
  data: any
}

const statsCache = new Map<string, CachedStats>()
const STATS_CACHE_TTL = 30_000 // 30 seconds

/** Live counters for the Students module header. GET /api/students/stats */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'students')) return err(403, 'You do not have permission to access this module.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  const cacheKey = `${tenant.schoolId || 'ALL'}::${session.role}::${session.employeeId || session.sub}`
  const cached = statsCache.get(cacheKey)
  const isNoCache = req.headers.get('cache-control') === 'no-cache'
  if (!isNoCache && cached && Date.now() - cached.at < STATS_CACHE_TTL) {
    return json({ data: cached.data })
  }

  try {
    const term = await db.term.findFirst({ where: { ...schoolWhere, isCurrent: true } })
    const termStart = term
      ? term.startDate
      : (() => { const d = new Date(); d.setDate(d.getDate() - 90); d.setHours(0, 0, 0, 0); return d })()

    let studentWhere: any = schoolWhere
    let isTeacherScoped = false
    let studentIdList: string[] = []

    if (session.role === 'TEACHER') {
      let teacher: any = null
      if (session.employeeId) {
        teacher = await db.employee.findFirst({
          where: { id: session.employeeId, ...schoolWhere },
        })
      }
      if (!teacher && session.sub) {
        const user = await db.user.findUnique({
          where: { id: session.sub },
          select: { linkedEmployeeId: true },
        })
        if (user?.linkedEmployeeId) {
          teacher = await db.employee.findFirst({
            where: { id: user.linkedEmployeeId, ...schoolWhere },
          })
        }
      }
      if (!teacher && session.email) {
        teacher = await db.employee.findFirst({
          where: { email: session.email, ...schoolWhere },
        })
      }

      if (!teacher) {
        return json({
          data: { active: 0, newThisTerm: 0, transportUsers: 0, boarders: 0, total: 0, termName: term?.name || 'Last 90 days' },
        })
      }

      const [homeroomSections, taughtSubjects] = await Promise.all([
        db.section.findMany({
          where: { teacherId: teacher.id, ...schoolWhere },
          select: { id: true, classId: true },
        }),
        db.subject.findMany({
          where: { teacherId: teacher.id, ...schoolWhere },
          select: { classId: true },
        }),
      ])

      const classIds = [
        ...new Set([
          ...homeroomSections.map(s => s.classId),
          ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
        ]),
      ]
      const sectionIds = homeroomSections.map(s => s.id)

      if (!classIds.length && !sectionIds.length) {
        return json({
          data: { active: 0, newThisTerm: 0, transportUsers: 0, boarders: 0, total: 0, termName: term?.name || 'Last 90 days' },
        })
      }

      studentWhere = {
        ...schoolWhere,
        OR: [
          ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
          ...(classIds.length ? [{ classId: { in: classIds } }] : []),
        ],
      }
      isTeacherScoped = true
    }

    const [active, newThisTerm, total] = await Promise.all([
      db.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
      db.student.count({ where: { ...studentWhere, status: 'ACTIVE', admissionDate: { gte: termStart } } }),
      db.student.count({ where: studentWhere }),
    ])

    let transportUsers = 0
    let boarders = 0

    if (isTeacherScoped) {
      const authorizedStudents = await db.student.findMany({ where: studentWhere, select: { id: true }, take: 500 })
      studentIdList = authorizedStudents.map(s => s.id)
      if (studentIdList.length > 0) {
        const [tCount, bCount] = await Promise.all([
          db.transportAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE', studentId: { in: studentIdList } } }),
          db.hostelAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE', studentId: { in: studentIdList } } }),
        ])
        transportUsers = tCount
        boarders = bCount
      }
    } else {
      // Direct indexed count without loading student IDs into node memory
      const [tCount, bCount] = await Promise.all([
        db.transportAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
        db.hostelAllocation.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      ])
      transportUsers = tCount
      boarders = bCount
    }

    const payload = {
      active,
      newThisTerm,
      transportUsers,
      boarders,
      total,
      termName: term?.name || 'Last 90 days',
    }

    statsCache.set(cacheKey, { at: Date.now(), data: payload })
    return json({ data: payload })
  } catch (e) {
    console.error('[students:stats]', e)
    return err(500, 'Unable to load student statistics right now.')
  }
}
