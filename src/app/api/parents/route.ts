import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'

const crud = defineCrud({
  model: 'parent',
  module: 'parents',
  searchFields: ['name', 'phone', 'email'],
  filterFields: ['relation'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['name', 'phone'],
  include: { _count: { select: { students: true } } },
  scope: async (session) => {
    // Teachers are strictly scoped to parents whose children belong to their assigned classes/sections
    if (session.role === 'TEACHER') {
      let teacher: any = null
      if (session.employeeId) {
        teacher = await db.employee.findFirst({
          where: { id: session.employeeId, schoolId: session.schoolId || undefined },
        })
      }
      if (!teacher && session.sub) {
        const user = await db.user.findUnique({
          where: { id: session.sub },
          select: { linkedEmployeeId: true },
        })
        if (user?.linkedEmployeeId) {
          teacher = await db.employee.findFirst({
            where: { id: user.linkedEmployeeId, schoolId: session.schoolId || undefined },
          })
        }
      }
      if (!teacher && session.email) {
        teacher = await db.employee.findFirst({
          where: { email: session.email, schoolId: session.schoolId || undefined },
        })
      }

      if (!teacher) {
        return { id: '__unassociated_teacher__' }
      }

      const [homeroomSections, taughtSubjects] = await Promise.all([
        db.section.findMany({
          where: { teacherId: teacher.id, ...(session.schoolId ? { schoolId: session.schoolId } : {}) },
          select: { id: true, classId: true },
        }),
        db.subject.findMany({
          where: { teacherId: teacher.id, ...(session.schoolId ? { schoolId: session.schoolId } : {}) },
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

      if (classIds.length || sectionIds.length) {
        return {
          students: {
            some: {
              OR: [
                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                ...(classIds.length ? [{ classId: { in: classIds } }] : []),
              ],
            },
          },
        }
      }
      return { id: '__none__' }
    }
    return null
  },
  beforeSave: async (data: any, _session, mode) => {
    const b = { ...data }
    for (const k of ['name', 'occupation', 'phone', 'altPhone', 'email', 'emergencyContact']) {
      if (typeof b[k] === 'string') b[k] = b[k].trim()
    }
    if (mode === 'create' && !b.relation) b.relation = 'FATHER'
    if (b.relation && !['FATHER', 'MOTHER', 'GUARDIAN'].includes(b.relation)) delete b.relation
    if (b.phone === '') delete b.phone
    for (const k of ['occupation', 'altPhone', 'email', 'address', 'emergencyContact']) {
      if (b[k] === '') b[k] = null
    }
    return b
  },
})

export const GET = crud.list
export const POST = crud.create
