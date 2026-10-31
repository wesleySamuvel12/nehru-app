import assert from 'node:assert/strict'
import path from 'node:path'
import { createJiti } from 'jiti'

const rootDir = process.cwd()
const jiti = createJiti(import.meta.url, {
  jsx: true,
  alias: { '@': path.join(rootDir, 'src') },
})

async function run() {
  console.log('================================================================')
  console.log(' Teacher Dashboard, Principal Control, Admission Admin & Transport Tests')
  console.log('================================================================\n')

  const { db } = (await jiti.import(path.join(rootDir, 'src/lib/db.ts'))) as any
  const { signSession } = (await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))) as any
  const { can, normalizeRole, NAV_ITEMS, ROLES } = (await jiti.import(path.join(rootDir, 'src/lib/rbac.ts'))) as any
  const { NextRequest } = (await import('next/server')) as any

  const school = await db.school.findFirst({ where: { code: 'NIS-MAIN' } }) || await db.school.findFirst()
  assert.ok(school, 'Main school record must exist')

  // Find a teacher user
  const teacherUser = await db.user.findFirst({ where: { role: 'TEACHER' } })
  assert.ok(teacherUser, 'Teacher user must exist')

  const teacherToken = await signSession({
    sub: teacherUser.id,
    name: teacherUser.name,
    email: teacherUser.email,
    role: 'TEACHER',
    schoolId: school.id,
    schoolCode: school.code,
    employeeId: teacherUser.linkedEmployeeId,
  })

  // Find Principal user
  const principalUser = await db.user.findFirst({ where: { role: 'PRINCIPAL' } })
  assert.ok(principalUser, 'Principal user must exist')

  const principalToken = await signSession({
    sub: principalUser.id,
    name: principalUser.name,
    email: principalUser.email,
    role: 'PRINCIPAL',
    schoolId: school.id,
    schoolCode: school.code,
  })

  // Find Admission Admin user
  const admissionUser = await db.user.findFirst({
    where: { OR: [{ role: 'ADMISSION_ADMIN' }, { email: 'admission@nis.edu.in' }] }
  })
  assert.ok(admissionUser, 'Admission Admin user must exist')

  const admissionToken = await signSession({
    sub: admissionUser.id,
    name: admissionUser.name,
    email: admissionUser.email,
    role: 'ADMISSION_ADMIN',
    schoolId: school.id,
    schoolCode: school.code,
  })

  // --------------------------------------------------------------------------
  // TEST 1: Role Registry & Permission Boundaries
  // --------------------------------------------------------------------------
  console.log('[Test 1] Role Registry & Restrictions...')

  // 1a: Retired roles removed from active application
  assert.equal(ROLES.includes('NURSE' as any), false, 'NURSE should not be in active ROLES')
  assert.equal(ROLES.includes('SECURITY' as any), false, 'SECURITY should not be in active ROLES')
  assert.equal(ROLES.includes('COUNSELLOR' as any), false, 'COUNSELLOR should not be in active ROLES')
  assert.equal(ROLES.includes('ADMISSION_ADMIN' as any), true, 'ADMISSION_ADMIN should be in active ROLES')

  // 1b: Aliases
  assert.equal(normalizeRole('PRO'), 'PRINCIPAL', 'PRO must normalize to PRINCIPAL')
  assert.equal(normalizeRole('COUNSELLOR'), 'ADMISSION_ADMIN', 'COUNSELLOR must normalize to ADMISSION_ADMIN')
  assert.equal(normalizeRole('STUDENT_ADMIN'), 'ADMISSION_ADMIN', 'STUDENT_ADMIN must normalize to ADMISSION_ADMIN')

  // 1c: Teacher restricted from managing parent accounts and admissions
  assert.equal(can('TEACHER', 'parents'), false, 'Teacher must not have access to parents module')
  assert.equal(can('TEACHER', 'admissions'), false, 'Teacher must not have access to admissions module')
  assert.equal(can('TEACHER', 'fees'), false, 'Teacher must not have access to fees module')
  assert.equal(can('TEACHER', 'transport'), false, 'Teacher must not have access to transport module')

  // 1d: Admission Admin access
  assert.equal(can('ADMISSION_ADMIN', 'admissions'), true, 'Admission Admin has admissions access')
  assert.equal(can('ADMISSION_ADMIN', 'students'), true, 'Admission Admin has students access')
  assert.equal(can('ADMISSION_ADMIN', 'parents'), true, 'Admission Admin has parents access')

  console.log('  ✓ Role registry, aliases, and teacher restrictions verified.')

  // --------------------------------------------------------------------------
  // TEST 2: Teacher Portal Timetable with Periods, Times, & Attendance Status
  // --------------------------------------------------------------------------
  console.log('[Test 2] Teacher Portal Timetable Data...')

  const teacherPortalRoute = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/route.ts')) as any
  const portalReq = new NextRequest('http://localhost:3000/api/portal/teacher', {
    headers: {
      cookie: `erp_session=${teacherToken}`,
      authorization: `Bearer ${teacherToken}`,
    },
  })

  const portalRes = await teacherPortalRoute.GET(portalReq)
  assert.equal(portalRes.status, 200, 'Teacher portal GET should return 200')
  const portalJson = await portalRes.json()
  assert.ok(portalJson.data, 'Portal response should have data')
  assert.ok(portalJson.data.teacher, 'Portal data should have teacher details')
  assert.ok(portalJson.data.todayTimetable, 'Portal data should have todayTimetable')
  assert.ok(portalJson.data.weekTimetable, 'Portal data should have weekTimetable')

  // Inspect structure of todayTimetable entries if any exist
  for (const slot of portalJson.data.todayTimetable) {
    assert.ok(slot.period !== undefined, 'Slot must have period')
    assert.ok(slot.time !== undefined, 'Slot must have time (e.g. 08:00 - 08:45)')
    assert.ok(slot.className !== undefined, 'Slot must have className')
    assert.ok(slot.sectionName !== undefined, 'Slot must have sectionName')
    assert.ok(slot.subject !== undefined, 'Slot must have subject')
    assert.ok(slot.room !== undefined, 'Slot must have room')
    assert.ok(['MARKED', 'PENDING'].includes(slot.attendanceStatus), 'Slot must have attendanceStatus (MARKED|PENDING)')
  }

  console.log(`  ✓ Teacher portal timetable returned with periods, times, classes, sections, and attendance statuses.`)

  // --------------------------------------------------------------------------
  // TEST 3: Timetable Conflict Detection & Management Authorization
  // --------------------------------------------------------------------------
  console.log('[Test 3] Timetable Conflict Detection & Permissions...')

  const timetablesRoute = await jiti.import(path.join(rootDir, 'src/app/api/academics/timetables/route.ts')) as any

  // 3a: Teacher attempting to create timetable slot must be rejected (HTTP 403)
  const teacherPostReq = new NextRequest('http://localhost:3000/api/academics/timetables', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `erp_session=${teacherToken}`,
    },
    body: JSON.stringify({
      classId: 'dummy-class',
      sectionId: 'dummy-section',
      dayOfWeek: 1,
      period: 1,
    }),
  })
  const teacherPostRes = await timetablesRoute.POST(teacherPostReq)
  assert.equal(teacherPostRes.status, 403, 'Teacher POST to master timetable must return 403')

  // 3b: Conflict detection: find an existing timetable slot
  const existingSlot = await db.timetableSlot.findFirst({
    where: { schoolId: school.id },
  })

  if (existingSlot) {
    // Principal trying to schedule the exact same class + section + day + period must return HTTP 409
    const conflictReq = new NextRequest('http://localhost:3000/api/academics/timetables', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `erp_session=${principalToken}`,
      },
      body: JSON.stringify({
        classId: existingSlot.classId,
        sectionId: existingSlot.sectionId,
        dayOfWeek: existingSlot.dayOfWeek,
        period: existingSlot.period,
      }),
    })
    const conflictRes = await timetablesRoute.POST(conflictReq)
    assert.equal(conflictRes.status, 409, 'Double booking same section & period must return 409 Conflict')
    const conflictBody = await conflictRes.json()
    assert.ok(conflictBody.error.includes('conflict'), 'Conflict error message should clearly indicate collision')
  }

  console.log('  ✓ Teacher blocked from timetable modifications (403); Schedule collision blocked (409).')

  // --------------------------------------------------------------------------
  // TEST 4: Student Creation with Both Father AND Mother Details
  // --------------------------------------------------------------------------
  console.log('[Test 4] Father and Mother Structured Details on Student...')

  const studentsRoute = await jiti.import(path.join(rootDir, 'src/app/api/students/route.ts')) as any

  const testAdmissionNo = `TEST${Date.now().toString().slice(-6)}`
  const testStudentData = {
    firstName: 'Aarav',
    lastName: 'Sharma',
    admissionNo: testAdmissionNo,
    gender: 'MALE',
    fatherName: 'Rajesh Sharma',
    fatherPhone: '+91 98111 22233',
    fatherEmail: 'rajesh.sharma@example.com',
    fatherOccupation: 'Architect',
    fatherAddress: '102 Green Acres, Mumbai',
    fatherAltPhone: '+91 22 2654 0000',
    fatherLanguage: 'Hindi, English',
    fatherIsEmergency: true,
    motherName: 'Sunita Sharma',
    motherPhone: '+91 98111 22234',
    motherEmail: 'sunita.sharma@example.com',
    motherOccupation: 'Professor',
    motherAddress: '102 Green Acres, Mumbai',
    motherAltPhone: '+91 22 2654 0001',
    motherLanguage: 'Marathi, English',
    motherIsEmergency: false,
    primaryContact: 'FATHER',
  }

  const createStudentReq = new NextRequest('http://localhost:3000/api/students', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `erp_session=${admissionToken}`,
    },
    body: JSON.stringify(testStudentData),
  })

  const createStudentRes = await studentsRoute.POST(createStudentReq)
  assert.equal(createStudentRes.status, 201, 'Student creation should return 201 Created')
  const createdStudent = (await createStudentRes.json()).data

  // Verify both Father and Mother are stored
  assert.equal(createdStudent.fatherName, 'Rajesh Sharma')
  assert.equal(createdStudent.fatherPhone, '+91 98111 22233')
  assert.equal(createdStudent.fatherEmail, 'rajesh.sharma@example.com')
  assert.equal(createdStudent.fatherOccupation, 'Architect')
  assert.equal(createdStudent.motherName, 'Sunita Sharma')
  assert.equal(createdStudent.motherPhone, '+91 98111 22234')
  assert.equal(createdStudent.motherEmail, 'sunita.sharma@example.com')
  assert.equal(createdStudent.motherOccupation, 'Professor')
  assert.equal(createdStudent.primaryContact, 'FATHER')
  assert.ok(createdStudent.parentId, 'Parent record should be auto-linked')

  // Clean up test student
  await db.student.delete({ where: { id: createdStudent.id } })

  console.log('  ✓ Verified both Father and Mother structured profiles are persisted and auto-linked.')

  // --------------------------------------------------------------------------
  // TEST 5: CSV Student Import Endpoint
  // --------------------------------------------------------------------------
  console.log('[Test 5] Student CSV Import Endpoint...')

  const importRoute = await jiti.import(path.join(rootDir, 'src/app/api/students/import/route.ts')) as any

  const csvData = [
    'First Name,Last Name,Admission No,Gender,Father\'s Name,Father\'s Phone,Father\'s Email,Mother\'s Name,Mother\'s Phone,Primary Contact',
    `Vivaan,Kapur,TESTCSV${Date.now().toString().slice(-4)},MALE,Anil Kapur,+91 98222 33445,anil@example.com,Meera Kapur,+91 98222 33446,FATHER`
  ].join('\n')

  const importReq = new NextRequest('http://localhost:3000/api/students/import', {
    method: 'POST',
    headers: {
      'content-type': 'text/csv',
      cookie: `erp_session=${admissionToken}`,
    },
    body: csvData,
  })

  const importRes = await importRoute.POST(importReq)
  assert.equal(importRes.status, 200, 'CSV import should return 200')
  const importJson = await importRes.json()
  assert.equal(importJson.success, true)
  assert.equal(importJson.imported, 1, '1 student record should be imported')

  // Clean up imported test student
  const importedStu = await db.student.findFirst({ where: { firstName: 'Vivaan', lastName: 'Kapur' } })
  if (importedStu) {
    assert.equal(importedStu.fatherName, 'Anil Kapur')
    assert.equal(importedStu.motherName, 'Meera Kapur')
    await db.student.delete({ where: { id: importedStu.id } })
  }

  console.log('  ✓ Student CSV import endpoint parsed and enrolled student with Father & Mother info.')

  // --------------------------------------------------------------------------
  // TEST 6: Transport Route Vehicle Capacity Enforcement
  // --------------------------------------------------------------------------
  console.log('[Test 6] Transport Route Capacity Enforcement...')

  const transportAllocRoute = await jiti.import(path.join(rootDir, 'src/app/api/transport/allocations/route.ts')) as any

  // Create a test vehicle with capacity 1
  const testVehicle = await db.vehicle.create({
    data: {
      schoolId: school.id,
      regNo: `MH02TEST${Date.now().toString().slice(-4)}`,
      model: 'Mini Van',
      capacity: 1,
    }
  })

  // Create test route with this vehicle
  const testRoute = await db.route.create({
    data: {
      schoolId: school.id,
      name: `Test Route ${Date.now().toString().slice(-4)}`,
      vehicleId: testVehicle.id,
    }
  })

  // Create test stop
  const testStop = await db.stop.create({
    data: {
      schoolId: school.id,
      routeId: testRoute.id,
      name: 'Main Gate',
      sequence: 1,
    }
  })

  // Find 2 real students to test capacity limit
  const testStudents = await db.student.findMany({ take: 2 })
  assert.ok(testStudents.length >= 2, 'Need 2 students for transport capacity test')

  // Allocation 1: fits within capacity (1 of 1)
  const alloc1Req = new NextRequest('http://localhost:3000/api/transport/allocations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `erp_session=${principalToken}`,
    },
    body: JSON.stringify({
      studentId: testStudents[0].id,
      routeId: testRoute.id,
      stopId: testStop.id,
    }),
  })
  const alloc1Res = await transportAllocRoute.POST(alloc1Req)
  assert.equal(alloc1Res.status, 201, 'First allocation should succeed')
  const alloc1Data = (await alloc1Res.json()).data

  // Allocation 2: exceeds capacity (1 is full) -> must return HTTP 409
  const alloc2Req = new NextRequest('http://localhost:3000/api/transport/allocations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `erp_session=${principalToken}`,
    },
    body: JSON.stringify({
      studentId: testStudents[1].id,
      routeId: testRoute.id,
      stopId: testStop.id,
    }),
  })
  const alloc2Res = await transportAllocRoute.POST(alloc2Req)
  assert.equal(alloc2Res.status, 409, 'Exceeding vehicle capacity must return 409 Conflict')
  const alloc2Body = await alloc2Res.json()
  assert.ok(alloc2Body.error.includes('capacity exceeded'), 'Should report vehicle capacity exceeded')

  // Clean up transport test records
  await db.transportAllocation.delete({ where: { id: alloc1Data.id } })
  await db.stop.delete({ where: { id: testStop.id } })
  await db.route.delete({ where: { id: testRoute.id } })
  await db.vehicle.delete({ where: { id: testVehicle.id } })

  console.log('  ✓ Transport allocation vehicle capacity limit strictly enforced (409 Conflict).')

  console.log('\n================================================================')
  console.log(' ALL Teacher, Principal, Admission & Transport Tests PASSED (6/6)!')
  console.log('================================================================')
}

run().catch(err => {
  console.error('\n❌ Test failure:', err)
  process.exit(1)
})
