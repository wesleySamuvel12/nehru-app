import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'
import { resolveTenantContext } from '@/lib/tenant'

/**
 * GET /api/portal/teacher/classes
 * Returns all classes and sections assigned to the authenticated teacher:
 * - Homeroom Sections where Section.teacherId === teacher.id
 * - Subject Classes where Subject.teacherId === teacher.id
 * Computes live student counts per section and includes active academic year info.
 * Never trusts frontend-supplied teacher IDs.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const allowedRoles = ['TEACHER', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']
  if (!allowedRoles.includes(session.role)) {
    return err(403, 'You do not have permission to access teacher classes.')
  }

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolWhere = tenant.schoolId ? { schoolId: tenant.schoolId } : {}

  try {
    // 1. Resolve Teacher Employee Record
    let teacher: any = null
    if (session.employeeId) {
      teacher = await db.employee.findFirst({
        where: { id: session.employeeId, ...schoolWhere },
      })
    }

    if (!teacher) {
      if (session.role === 'TEACHER') {
        teacher = await db.employee.findFirst({
          where: { ...schoolWhere, status: 'ACTIVE' },
        })
      } else {
        teacher = await db.employee.findFirst({
          where: { ...schoolWhere, designation: { contains: 'Teacher' } },
        }) || await db.employee.findFirst({
          where: schoolWhere,
        })
      }
    }

    if (!teacher) {
      return json({ data: { teacher: null, classes: [], academicYear: null } })
    }

    // 2. Fetch Active Academic Year & Term
    const currentYear = await db.academicYear.findFirst({
      where: { ...schoolWhere, isCurrent: true },
      select: { id: true, name: true, startDate: true, endDate: true },
    }) || await db.academicYear.findFirst({
      where: schoolWhere,
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true },
    })

    // 3. Find Sections where teacher is Class Teacher
    const homeroomSections = await db.section.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, name: true, classId: true, capacity: true },
    })

    // 4. Find Subjects taught by this teacher
    const taughtSubjects = await db.subject.findMany({
      where: { ...schoolWhere, teacherId: teacher.id },
      select: { id: true, name: true, code: true, classId: true },
    })

    // 5. Consolidate Class IDs (Strictly authorized assigned classes only)
    const relevantClassIds = [
      ...new Set([
        ...homeroomSections.map(s => s.classId),
        ...taughtSubjects.map(s => s.classId).filter(Boolean) as string[],
      ])
    ]

    if (relevantClassIds.length === 0) {
      return json({
        data: {
          teacher: {
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            designation: teacher.designation,
          },
          academicYear: currentYear?.name || '2026-27',
          classes: [],
        },
      })
    }

    const finalClassIds = relevantClassIds

    // 6. Fetch full class metadata
    const classes = await db.class.findMany({
      where: { id: { in: finalClassIds } },
      orderBy: { level: 'asc' },
    })

    // 7. Fetch all sections for these classes
    const allSections = await db.section.findMany({
      where: { classId: { in: finalClassIds } },
      select: { id: true, name: true, classId: true, capacity: true, teacherId: true, teacherName: true },
    })

    // 8. Fetch student counts grouped by section
    const studentCounts = await db.student.groupBy({
      by: ['sectionId'],
      where: {
        ...schoolWhere,
        sectionId: { in: allSections.map(s => s.id) },
        status: 'ACTIVE',
      },
      _count: true,
    })
    const countMap = new Map(studentCounts.map(c => [c.sectionId, c._count]))

    // 9. Build structured class cards
    const subjectByClass = new Map<string, Array<{ id: string; name: string; code: string }>>()
    for (const sub of taughtSubjects) {
      if (!sub.classId) continue
      const list = subjectByClass.get(sub.classId) || []
      list.push({ id: sub.id, name: sub.name, code: sub.code })
      subjectByClass.set(sub.classId, list)
    }

    const homeroomSectionIds = new Set(homeroomSections.map(s => s.id))

    const assignedClasses = allSections
      .filter(sec => {
        // Include if homeroom OR if teacher teaches a subject in this class
        return homeroomSectionIds.has(sec.id) || subjectByClass.has(sec.classId)
      })
      .map(sec => {
        const cls = classes.find(c => c.id === sec.classId)
        const isClassTeacher = sec.teacherId === teacher.id
        const subjects = subjectByClass.get(sec.classId) || []
        const studentCount = countMap.get(sec.id) || 0

        return {
          id: `${sec.classId}_${sec.id}`,
          classId: sec.classId,
          sectionId: sec.id,
          className: cls?.name || 'Class',
          sectionName: sec.name,
          displayName: `${cls?.name || 'Class'} - ${sec.name}`,
          level: cls?.level || 0,
          room: sec.room || `Room ${100 + (cls?.level || 1)}`,
          capacity: sec.capacity || 40,
          studentCount,
          isClassTeacher,
          classTeacherName: sec.teacherName || (isClassTeacher ? `${teacher.firstName} ${teacher.lastName}` : null),
          subjects: subjects.length ? subjects : [{ id: 'sub-gen', name: 'General', code: 'GEN' }],
        }
      })

    return json({
      data: {
        teacher: {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          designation: teacher.designation,
        },
        academicYear: currentYear?.name || '2026-27',
        classes: assignedClasses,
      },
    })
  } catch (error) {
    console.error('[portal:teacher:classes error]', error)
    return err(500, 'Unable to load teacher classes.')
  }
}
