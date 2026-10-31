import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { defineCrud, json, err } from '@/lib/crud'
import { requireAuth, type Session } from '@/lib/auth'
import { resolveTenantContext } from '@/lib/tenant'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Row-level security: parents see their children's allocations, students their own. */
async function ownScope(session: Session): Promise<any> {
  if (session.role === 'STUDENT') {
    return session.studentId ? { studentId: session.studentId } : { id: '__none__' }
  }
  if (session.role === 'PARENT' && session.parentId) {
    const kids = await db.student.findMany({ where: { parentId: session.parentId }, select: { id: true } })
    return { studentId: { in: kids.map(k => k.id) } }
  }
  return null
}

const crud = defineCrud({
  model: 'transportAllocation',
  module: 'transport',
  filterFields: ['routeId', 'status', 'studentId', 'pickupStatus'],
  include: { route: true, stop: true },
  required: ['studentId', 'routeId', 'stopId'],
  defaultSort: { field: 'id', dir: 'desc' },
  scope: ownScope,
})

export const GET = crud.list

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Unauthorized')

  const allowedRoles = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PRINCIPAL',
    'PRO',
    'TRANSPORT',
    'ADMIN_EXECUTIVE',
  ]

  if (!allowedRoles.includes(session.role)) {
    return err(403, 'You do not have permission to allocate transport seats.')
  }

  const tenantRes = await resolveTenantContext(req, session)
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  let body: any
  try {
    body = await req.json()
  } catch {
    return err(400, 'Invalid JSON body')
  }

  const { studentId, routeId, stopId, type = 'BOTH', monthlyFee } = body
  if (!studentId || !routeId || !stopId) {
    return err(400, 'studentId, routeId, and stopId are required.')
  }

  // 1. Duplicate check: prevent duplicate active allocation for the same student on this route
  const existingAllocation = await db.transportAllocation.findFirst({
    where: {
      studentId,
      routeId,
      status: 'ACTIVE',
      ...(tenant.schoolId ? { schoolId: tenant.schoolId } : {}),
    },
  })
  if (existingAllocation) {
    return err(409, 'Student is already actively allocated to this transport route.')
  }

  // 2. Capacity check: inspect route and vehicle seat limit
  const route = await db.route.findUnique({
    where: { id: routeId },
    include: { vehicle: true },
  })
  if (!route) {
    return err(404, 'Transport route not found.')
  }

  const vehicleCapacity = route.vehicle?.capacity || 0
  if (vehicleCapacity > 0) {
    const activeAllocationsCount = await db.transportAllocation.count({
      where: {
        routeId,
        status: 'ACTIVE',
        ...(tenant.schoolId ? { schoolId: tenant.schoolId } : {}),
      },
    })

    if (activeAllocationsCount >= vehicleCapacity) {
      return err(
        409,
        `Vehicle capacity exceeded: Route "${route.name}" has reached maximum seat capacity (${activeAllocationsCount}/${vehicleCapacity} seats occupied on Vehicle ${route.vehicle?.regNo || ''}).`
      )
    }
  }

  const newAllocation = await db.transportAllocation.create({
    data: {
      schoolId: tenant.schoolId,
      studentId,
      routeId,
      stopId,
      type: type || 'BOTH',
      status: 'ACTIVE',
      monthlyFee: monthlyFee !== undefined && monthlyFee !== '' ? Number(monthlyFee) : (route.monthlyFee || 0),
    },
    include: { route: true, stop: true },
  })

  return json({ data: newAllocation }, 201)
}
