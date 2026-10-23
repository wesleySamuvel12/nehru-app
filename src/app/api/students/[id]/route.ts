import { NextRequest } from 'next/server'
import { defineCrud, getId } from '@/lib/crud'
import { db } from '@/lib/db'

const crud = defineCrud({
  model: 'student',
  module: 'students',
  include: { parent: true, klass: true, section: true },
  scope: async (session) => {
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
        ])
      ]
      const sectionIds = homeroomSections.map(s => s.id)
      if (classIds.length || sectionIds.length) {
        return {
          OR: [
            ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
            ...(classIds.length ? [{ classId: { in: classIds } }] : []),
          ],
        }
      }
      return { id: '__none__' }
    }
    return null
  },
})

/** Wrappers resolve the route context properly (Next 16 passes params as a Promise). */
export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.detail(req, await getId(ctx))
export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.update(req, await getId(ctx))
export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  crud.remove(req, await getId(ctx))
