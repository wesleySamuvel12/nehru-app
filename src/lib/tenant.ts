import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { Session } from './auth'
import { normalizeRole } from './rbac'

export interface TenantContext {
  schoolId: string | null
  schoolCode?: string | null
  isSuperAdmin: boolean
  allSchools?: boolean
}

export type TenantResolutionResult =
  | { context: TenantContext; error?: never }
  | { context?: never; error: NextResponse }

/**
 * Resolves and enforces school-level multi-tenant context.
 * Rules:
 * 1. Regular users are strictly locked to their session.schoolId.
 *    Any mismatch between query/header schoolId and session.schoolId is rejected with 403.
 * 2. Regular users without a schoolId are rejected with 403.
 * 3. Super Admins are identified ONLY by role === 'SUPER_ADMIN' (never by email).
 * 4. Super Admin cross-campus access requires explicit, validated selection (via x-school-id header or ?schoolId=).
 * 5. A missing schoolId is NEVER interpreted as permission to access all schools.
 * 6. Multi-campus reads for Super Admins require explicit opt-in (x-all-schools: true or ?allSchools=1).
 * 7. Writes always require a specific, concrete schoolId (no writes across all schools).
 */
export async function resolveTenantContext(
  req: NextRequest,
  session: Session,
  options?: { isWrite?: boolean; allowAllSchoolsForSuperAdmin?: boolean }
): Promise<TenantResolutionResult> {
  const role = normalizeRole(session.role)
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const sp = req.nextUrl.searchParams
  const requestedSchoolId = req.headers.get('x-school-id') || sp.get('schoolId')

  if (!isSuperAdmin) {
    // Regular users: fail closed if no schoolId assigned
    if (!session.schoolId) {
      return {
        error: NextResponse.json(
          { error: 'User is not assigned to any campus. Please contact the administrator.' },
          { status: 403 }
        ),
      }
    }

    // Resolve alias 'main' or master code to master school ID
    let activeSchoolId = session.schoolId
    let activeSchoolCode = session.schoolCode || null

    if (activeSchoolId === 'main' || activeSchoolId === 'NIS-MAIN') {
      const masterSchool = await db.school.findFirst({ where: { isMaster: true }, select: { id: true, code: true } })
      if (masterSchool) {
        activeSchoolId = masterSchool.id
        activeSchoolCode = masterSchool.code
      }
    }

    let normalizedRequested = requestedSchoolId
    if (requestedSchoolId === 'main' || requestedSchoolId === 'NIS-MAIN') {
      normalizedRequested = activeSchoolId
    }

    // Reject any cross-school spoofing attempt
    if (normalizedRequested && normalizedRequested !== activeSchoolId) {
      return {
        error: NextResponse.json(
          { error: 'Cross-campus access denied: you cannot access data from another school.' },
          { status: 403 }
        ),
      }
    }

    return {
      context: {
        schoolId: activeSchoolId,
        schoolCode: activeSchoolCode,
        isSuperAdmin: false,
        allSchools: false,
      },
    }
  }

  // Super Admin:
  if (requestedSchoolId) {
    let targetSchoolId = requestedSchoolId
    if (requestedSchoolId === 'main' || requestedSchoolId === 'NIS-MAIN') {
      const master = await db.school.findFirst({ where: { isMaster: true }, select: { id: true } })
      if (master) targetSchoolId = master.id
    }

    const school = await db.school.findUnique({
      where: { id: targetSchoolId },
      select: { id: true, code: true },
    })

    if (!school) {
      return {
        error: NextResponse.json(
          { error: `The specified school ID '${requestedSchoolId}' does not exist.` },
          { status: 400 }
        ),
      }
    }

    return {
      context: {
        schoolId: school.id,
        schoolCode: school.code,
        isSuperAdmin: true,
        allSchools: false,
      },
    }
  }

  // Super Admin with NO requested schoolId:
  if (options?.isWrite) {
    // If session has schoolId, use it as fallback
    if (session.schoolId) {
      return {
        context: {
          schoolId: session.schoolId,
          schoolCode: session.schoolCode || null,
          isSuperAdmin: true,
          allSchools: false,
        },
      }
    }

    return {
      error: NextResponse.json(
        { error: 'Super Admin must explicitly specify a target school via x-school-id header or schoolId parameter for modifications.' },
        { status: 400 }
      ),
    }
  }

  // Super Admin READ with explicit all-schools flag
  const wantsAllSchools =
    options?.allowAllSchoolsForSuperAdmin &&
    (req.headers.get('x-all-schools') === 'true' || sp.get('allSchools') === '1')

  if (wantsAllSchools) {
    return {
      context: {
        schoolId: null,
        schoolCode: null,
        isSuperAdmin: true,
        allSchools: true,
      },
    }
  }

  // Super Admin READ without explicit allSchools:
  // "Do not interpret a missing schoolId as permission to access all schools."
  // Fallback to session schoolId or master school to stay scoped
  if (session.schoolId) {
    return {
      context: {
        schoolId: session.schoolId,
        schoolCode: session.schoolCode || null,
        isSuperAdmin: true,
        allSchools: false,
      },
    }
  }

  const masterSchool = await db.school.findFirst({
    where: { isMaster: true },
    select: { id: true, code: true },
  })

  if (masterSchool) {
    return {
      context: {
        schoolId: masterSchool.id,
        schoolCode: masterSchool.code,
        isSuperAdmin: true,
        allSchools: false,
      },
    }
  }

  return {
    error: NextResponse.json(
      { error: 'No active school context found. Please specify a school via x-school-id header.' },
      { status: 400 }
    ),
  }
}

/**
 * Mapping of foreign key fields to their corresponding Prisma model delegates.
 * Used for cross-school parent-child reference verification.
 */
const PARENT_MODEL_MAP: Record<string, string> = {
  studentId: 'student',
  employeeId: 'employee',
  classId: 'class',
  sectionId: 'section',
  subjectId: 'subject',
  departmentId: 'department',
  academicYearId: 'academicYear',
  hostelId: 'hostel',
  roomId: 'room',
  bedId: 'bed',
  routeId: 'route',
  vehicleId: 'vehicle',
  bookId: 'book',
  leadId: 'lead',
  examId: 'exam',
  assetId: 'asset',
  eventId: 'event',
  feeStructureId: 'feeStructure',
}

/**
 * Validates that any parent foreign key in the request payload belongs to the specified school.
 * Prevents cross-school relationship pollution.
 */
export async function validateParentOwnership(
  payload: Record<string, any>,
  targetSchoolId: string
): Promise<{ valid: boolean; errorField?: string; reason?: string }> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (!payload || typeof payload !== 'object') return { valid: true }

  for (const [field, modelName] of Object.entries(PARENT_MODEL_MAP)) {
    const parentId = payload[field]
    if (typeof parentId === 'string' && parentId.trim() !== '') {
      const delegate = (db as any)[modelName]
      if (delegate && typeof delegate.findFirst === 'function') {
        const parentRecord = await delegate.findFirst({
          where: { id: parentId, schoolId: targetSchoolId },
          select: { id: true },
        })
        if (!parentRecord) {
          return {
            valid: false,
            errorField: field,
            reason: `Cross-campus violation: The referenced ${field} ('${parentId}') does not exist in the selected school.`,
          }
        }
      }
    }
  }

  return { valid: true }
}
