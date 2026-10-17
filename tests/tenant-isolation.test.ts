import assert from 'node:assert/strict'
import path from 'node:path'
import { createJiti } from 'jiti'

const rootDir = process.cwd()
const jiti = createJiti(import.meta.url, {
  jsx: true,
  alias: {
    '@': path.join(rootDir, 'src'),
  },
})

/* eslint-disable @typescript-eslint/no-explicit-any */

async function runTests() {
  console.log('====================================================')
  console.log(' Phase 4: SQLite Multi-Tenant Isolation Test Suite')
  console.log('====================================================\n')

  const { db } = (await jiti.import(path.join(rootDir, 'src/lib/db.ts'))) as any
  const { signSession } = (await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))) as any
  const { NextRequest } = (await import('next/server')) as any

  // Import API handlers
  const studentsRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/students/route.ts'))
  const studentDetailRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/students/[id]/route.ts'))
  const invoicesRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/fees/invoices/route.ts'))
  const attendanceBulkRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/attendance/bulk/route.ts'))
  const dashboardRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/dashboard/route.ts'))
  const searchRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/search/route.ts'))
  const exportRoute: any = await jiti.import(path.join(rootDir, 'src/app/api/export/route.ts'))

  // 1. Fetch schools
  const schoolA = await db.school.findFirst({ where: { isMaster: true } })
  const schoolB = await db.school.findFirst({ where: { isMaster: false } })

  assert.ok(schoolA, 'School A (Master) must exist')
  assert.ok(schoolB, 'School B (Secondary) must exist')
  console.log(`Verified Schools:`)
  console.log(`- School A: ${schoolA.name} (${schoolA.id}, ${schoolA.code})`)
  console.log(`- School B: ${schoolB.name} (${schoolB.id}, ${schoolB.code})\n`)

  // Prepare test sessions
  const sessionSchoolA: any = {
    sub: 'user-school-a',
    name: 'Admin School A',
    email: 'admin-a@test.com',
    role: 'SCHOOL_ADMIN',
    schoolId: schoolA.id,
    schoolCode: schoolA.code,
  }
  const tokenA = await signSession(sessionSchoolA)

  const sessionSchoolB: any = {
    sub: 'user-school-b',
    name: 'Admin School B',
    email: 'admin-b@test.com',
    role: 'SCHOOL_ADMIN',
    schoolId: schoolB.id,
    schoolCode: schoolB.code,
  }
  const tokenB = await signSession(sessionSchoolB)

  const sessionSuperAdmin: any = {
    sub: 'user-super-admin',
    name: 'Global Super Admin',
    email: 'superadmin@test.com',
    role: 'SUPER_ADMIN',
    schoolId: null,
    schoolCode: null,
  }
  const tokenSuper = await signSession(sessionSuperAdmin)

  // Track created test IDs for cleanup
  const createdStudentIds: string[] = []
  const createdInvoiceIds: string[] = []

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Tenant Scoping on List Operations
    // --------------------------------------------------------------------------
    console.log('[Test 1] List Scoping — School A vs School B Isolation...')

    // Create a student in School B
    const bStudent = await db.student.create({
      data: {
        schoolId: schoolB.id,
        firstName: 'PuneStudent',
        lastName: 'Patil',
        admissionNo: 'PUNE-2026-001',
        status: 'ACTIVE',
      },
    })
    createdStudentIds.push(bStudent.id)

    // Request from School A
    const reqA = new NextRequest('http://localhost:3000/api/students', {
      headers: { authorization: `Bearer ${tokenA}` },
    })
    const resA = await studentsRoute.GET(reqA)
    assert.equal(resA.status, 200, 'School A request should return 200')
    const jsonA = await resA.json()
    assert.ok(jsonA.data.length > 0, 'School A should have students')
    const foundBInA = jsonA.data.find((s: any) => s.id === bStudent.id || s.schoolId === schoolB.id)
    assert.equal(foundBInA, undefined, 'School A list MUST NOT contain School B student')
    assert.ok(
      jsonA.data.every((s: any) => s.schoolId === schoolA.id),
      'Every student returned to School A must belong to School A'
    )

    // Request from School B
    const reqB = new NextRequest('http://localhost:3000/api/students', {
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resB = await studentsRoute.GET(reqB)
    assert.equal(resB.status, 200, 'School B request should return 200')
    const jsonB = await resB.json()
    assert.equal(jsonB.data.length, 1, 'School B should have exactly 1 student')
    assert.equal(jsonB.data[0].id, bStudent.id, 'School B student must be the one created in School B')
    console.log('  ✓ School A and School B student list queries are 100% isolated\n')

    // --------------------------------------------------------------------------
    // TEST 2: Cross-School Read, Update and Delete Rejection
    // --------------------------------------------------------------------------
    console.log('[Test 2] Cross-School Read / Update / Delete Rejection...')

    // School A student
    const aStudent = await db.student.findFirst({ where: { schoolId: schoolA.id } })
    assert.ok(aStudent, 'A student must exist in School A')

    // School B attempts GET School A student
    const reqBDetail = new NextRequest(`http://localhost:3000/api/students/${aStudent.id}`, {
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resBDetail = await studentDetailRoute.GET(reqBDetail, { params: Promise.resolve({ id: aStudent.id }) })
    assert.equal(resBDetail.status, 404, 'School B GET on School A student must be rejected with 404')

    // School B attempts PATCH School A student
    const reqBUpdate = new NextRequest(`http://localhost:3000/api/students/${aStudent.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ firstName: 'HackedName' }),
    })
    const resBUpdate = await studentDetailRoute.PATCH(reqBUpdate, { params: Promise.resolve({ id: aStudent.id }) })
    assert.equal(resBUpdate.status, 404, 'School B PATCH on School A student must be rejected with 404')

    // Verify name was not modified in database
    const freshA = await db.student.findUnique({ where: { id: aStudent.id } })
    assert.equal(freshA?.firstName, aStudent.firstName, 'School A student must remain unmodified')

    // School B attempts DELETE School A student
    const reqBDelete = new NextRequest(`http://localhost:3000/api/students/${aStudent.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resBDelete = await studentDetailRoute.DELETE(reqBDelete, { params: Promise.resolve({ id: aStudent.id }) })
    assert.equal(resBDelete.status, 404, 'School B DELETE on School A student must be rejected with 404')

    // Verify record still exists in database
    const freshA2 = await db.student.findUnique({ where: { id: aStudent.id } })
    assert.ok(freshA2, 'School A student must still exist in the database')
    console.log('  ✓ Cross-school detail, update, and delete correctly rejected with 404\n')

    // --------------------------------------------------------------------------
    // TEST 3: Cross-School Parent-Child Reference Rejection
    // --------------------------------------------------------------------------
    console.log('[Test 3] Cross-School Parent-Child Reference Prevention...')

    // School B user attempts to create FeeInvoice referencing School A student
    const reqCrossInvoice = new NextRequest('http://localhost:3000/api/fees/invoices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        studentId: aStudent.id, // Belongs to School A!
        title: 'Cross-School Tuition Fee',
        totalAmount: 5000,
        dueDate: '2026-11-01',
      }),
    })
    const resCrossInvoice = await invoicesRoute.POST(reqCrossInvoice)
    assert.equal(resCrossInvoice.status, 400, 'Invoice referencing cross-school student must be rejected with 400')
    const jsonCrossInvoice = await resCrossInvoice.json()
    assert.match(jsonCrossInvoice.error, /Cross-campus violation|different school/i)

    // School B user attempts bulk attendance referencing School A student
    const reqCrossAttendance = new NextRequest('http://localhost:3000/api/attendance/bulk', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        date: '2026-10-14',
        entries: [{ studentId: aStudent.id, status: 'PRESENT' }],
      }),
    })
    const resCrossAttendance = await attendanceBulkRoute.POST(reqCrossAttendance)
    assert.equal(resCrossAttendance.status, 400, 'Bulk attendance for cross-school student must be rejected with 400')
    console.log('  ✓ Cross-school parent-child associations successfully blocked\n')

    // --------------------------------------------------------------------------
    // TEST 4: Duplicate Identifiers Across Schools (Composite Uniqueness)
    // --------------------------------------------------------------------------
    console.log('[Test 4] Duplicate Identifiers Across Schools...')

    // Choose an admissionNo already present in School A
    const aAdmNo = aStudent.admissionNo
    assert.ok(aAdmNo, 'School A student must have admissionNo')

    // School B creates a student with the EXACT SAME admissionNo
    const reqDuplicateInB = new NextRequest('http://localhost:3000/api/students', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        firstName: 'Duplicate',
        lastName: 'StudentB',
        admissionNo: aAdmNo, // Same admission number as School A!
      }),
    })
    const resDuplicateInB = await studentsRoute.POST(reqDuplicateInB)
    assert.equal(resDuplicateInB.status, 201, 'Same admission number in DIFFERENT school must succeed (composite unique)')
    const jsonDuplicateInB = await resDuplicateInB.json()
    createdStudentIds.push(jsonDuplicateInB.data.id)
    assert.equal(jsonDuplicateInB.data.admissionNo, aAdmNo)
    assert.equal(jsonDuplicateInB.data.schoolId, schoolB.id)

    // Now School B attempts to create ANOTHER student with the SAME admissionNo in School B
    const reqDuplicateCollision = new NextRequest('http://localhost:3000/api/students', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        firstName: 'Collision',
        lastName: 'StudentB2',
        admissionNo: aAdmNo,
      }),
    })
    const resDuplicateCollision = await studentsRoute.POST(reqDuplicateCollision)
    assert.equal(resDuplicateCollision.status, 409, 'Duplicate admission number WITHIN SAME school must fail with 409')
    console.log('  ✓ Composite unique constraints allow cross-school duplicates while enforcing intra-school uniqueness\n')

    // --------------------------------------------------------------------------
    // TEST 5: Super Admin Multi-Campus Selection & Tenant Protection
    // --------------------------------------------------------------------------
    console.log('[Test 5] Super Admin Cross-Campus Context Switching...')

    // Super Admin with x-school-id for School A
    const reqSuperA = new NextRequest('http://localhost:3000/api/students', {
      headers: {
        authorization: `Bearer ${tokenSuper}`,
        'x-school-id': schoolA.id,
      },
    })
    const resSuperA = await studentsRoute.GET(reqSuperA)
    assert.equal(resSuperA.status, 200)
    const jsonSuperA = await resSuperA.json()
    assert.ok(jsonSuperA.data.every((s: any) => s.schoolId === schoolA.id), 'Super Admin selecting School A only gets School A')

    // Super Admin with x-school-id for School B
    const reqSuperB = new NextRequest('http://localhost:3000/api/students', {
      headers: {
        authorization: `Bearer ${tokenSuper}`,
        'x-school-id': schoolB.id,
      },
    })
    const resSuperB = await studentsRoute.GET(reqSuperB)
    assert.equal(resSuperB.status, 200)
    const jsonSuperB = await resSuperB.json()
    assert.ok(jsonSuperB.data.every((s: any) => s.schoolId === schoolB.id), 'Super Admin selecting School B only gets School B')

    // Super Admin with non-existent school ID fails safely with 400
    const reqSuperInvalid = new NextRequest('http://localhost:3000/api/students', {
      headers: {
        authorization: `Bearer ${tokenSuper}`,
        'x-school-id': 'non-existent-school-id',
      },
    })
    const resSuperInvalid = await studentsRoute.GET(reqSuperInvalid)
    assert.equal(resSuperInvalid.status, 400, 'Super Admin specifying non-existent school must get 400')

    // Regular School A user attempting to spoof x-school-id for School B gets 403
    const reqSpoof = new NextRequest('http://localhost:3000/api/students', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-school-id': schoolB.id,
      },
    })
    const resSpoof = await studentsRoute.GET(reqSpoof)
    assert.equal(resSpoof.status, 403, 'Regular user attempting cross-school header spoofing must get 403')
    console.log('  ✓ Super Admin explicit campus selection and tenant spoofing defenses verified\n')

    // --------------------------------------------------------------------------
    // TEST 6: Custom Endpoints Tenant Isolation (Dashboard, Search, Export)
    // --------------------------------------------------------------------------
    console.log('[Test 6] Custom Endpoints Tenant Isolation (Dashboard, Search, Export)...')

    // 6a: Dashboard scoping
    const reqDashA = new NextRequest('http://localhost:3000/api/dashboard', {
      headers: { authorization: `Bearer ${tokenA}` },
    })
    const resDashA = await dashboardRoute.GET(reqDashA)
    assert.equal(resDashA.status, 200)
    const jsonDashA = await resDashA.json()
    assert.equal(jsonDashA.data.kpis.totalStudents, 112, 'School A dashboard should count exactly 112 students')

    const reqDashB = new NextRequest('http://localhost:3000/api/dashboard', {
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resDashB = await dashboardRoute.GET(reqDashB)
    assert.equal(resDashB.status, 200)
    const jsonDashB = await resDashB.json()
    assert.equal(jsonDashB.data.kpis.totalStudents, 2, 'School B dashboard should only count School B students (2)')

    // 6b: Global Search scoping
    const reqSearchA = new NextRequest('http://localhost:3000/api/search?q=PuneStudent', {
      headers: { authorization: `Bearer ${tokenA}` },
    })
    const resSearchA = await searchRoute.GET(reqSearchA)
    assert.equal(resSearchA.status, 200)
    const jsonSearchA = await resSearchA.json()
    assert.equal(jsonSearchA.data.length, 0, 'School A search must NOT return School B student')

    const reqSearchB = new NextRequest('http://localhost:3000/api/search?q=PuneStudent', {
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resSearchB = await searchRoute.GET(reqSearchB)
    assert.equal(resSearchB.status, 200)
    const jsonSearchB = await resSearchB.json()
    assert.ok(jsonSearchB.data.some((r: any) => r.id === bStudent.id), 'School B search must find School B student')

    // 6c: Export scoping
    const reqExportB = new NextRequest('http://localhost:3000/api/export?entity=students', {
      headers: { authorization: `Bearer ${tokenB}` },
    })
    const resExportB = await exportRoute.GET(reqExportB)
    assert.equal(resExportB.status, 200)
    const csvContent = await resExportB.text()
    const lines = csvContent.trim().split('\n')
    assert.equal(lines.length, 3, 'School B student export should contain header + 2 student rows')
    assert.ok(lines.some((l: string) => l.includes('PuneStudent')), 'CSV contains Pune student')
    assert.ok(!lines.some((l: string) => l.includes('Aarav')), 'CSV must NOT contain School A students (e.g. Aarav)')

    console.log('  ✓ Dashboard, Search, and CSV Export all strictly respect tenant scoping\n')

  } finally {
    // Teardown: Clean up created test students
    console.log('Tearing down test records...')
    for (const sid of createdStudentIds) {
      try {
        await db.student.delete({ where: { id: sid } })
      } catch (e) {
        // Ignore if already deleted
      }
    }
    for (const iid of createdInvoiceIds) {
      try {
        await db.feeInvoice.delete({ where: { id: iid } })
      } catch (e) {
        // Ignore
      }
    }
    console.log('✓ Teardown complete.')
  }

  console.log('====================================================')
  console.log(' Summary: All Tenant Isolation Tests PASSED (6/6)!')
  console.log('====================================================')
}

runTests().catch((err) => {
  console.error('\n❌ Tenant Isolation Test Failure:', err)
  process.exit(1)
})
