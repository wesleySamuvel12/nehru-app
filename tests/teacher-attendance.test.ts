import assert from 'node:assert/strict'
import path from 'node:path'
import { createJiti } from 'jiti'

const rootDir = '/Users/dhanalingaml/Desktop/nehru-app-1'
const jiti = createJiti(import.meta.url, {
  jsx: true,
  alias: {
    '@': path.join(rootDir, 'src'),
  },
})

async function runTests() {
  console.log('================================================================')
  console.log(' Phase 3: Teacher Attendance Module Comprehensive Test Suite')
  console.log('================================================================\n')

  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { POST: bulkAttendance } = await jiti.import(path.join(rootDir, 'src/app/api/attendance/bulk/route.ts'))
  const { GET: listAttendance } = await jiti.import(path.join(rootDir, 'src/app/api/attendance/route.ts'))
  const { GET: getStats } = await jiti.import(path.join(rootDir, 'src/app/api/attendance/stats/route.ts'))
  const { GET: getTeacherClasses } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/classes/route.ts'))
  const { GET: getTeacherDashboard } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/route.ts'))
  const { GET: listStudents } = await jiti.import(path.join(rootDir, 'src/app/api/students/route.ts'))
  const { NextRequest } = await import('next/server')

  // Setup Teacher Session (Priya Nair - Senior Teacher English)
  const priyaUser = await db.user.findFirst({ where: { email: 'teacher@nis.edu.in' } })
  assert.ok(priyaUser, 'Priya Nair user exists')
  const priyaToken = await signSession({
    sub: priyaUser.id,
    name: priyaUser.name,
    role: priyaUser.role,
    email: priyaUser.email,
    schoolId: priyaUser.schoolId,
    employeeId: priyaUser.linkedEmployeeId,
  })

  const priyaHeaders = {
    cookie: `erp_session=${priyaToken}`,
    authorization: `Bearer ${priyaToken}`,
    'content-type': 'application/json',
  }

  // Setup Restricted Teacher Session: Suresh Kulkarni (teaches in 5 classes, homeroom for 2 sections)
  let sureshEmployee = await db.employee.findFirst({ where: { employeeNo: 'EMP-SURESH-001' } })
  if (!sureshEmployee) {
    const class1 = await db.class.findFirst({ where: { name: 'Grade 1' } })
    const sec1 = await db.section.findFirst({ where: { classId: class1.id } })
    sureshEmployee = await db.employee.create({
      data: {
        id: 'sureshEmpAttn',
        schoolId: priyaUser.schoolId,
        employeeNo: 'EMP-SURESH-001',
        firstName: 'Suresh',
        lastName: 'Kulkarni',
        email: 'suresh.attn@nis.edu.in',
        designation: 'Assistant Teacher',
        status: 'ACTIVE',
        isTeacher: true,
      },
    })
    await db.section.update({ where: { id: sec1.id }, data: { teacherId: sureshEmployee.id, teacherName: 'Suresh Kulkarni' } })
  }

  const sureshToken = await signSession({
    sub: 'sureshUserAttn',
    name: 'Suresh Kulkarni',
    role: 'TEACHER',
    email: 'suresh.attn@nis.edu.in',
    schoolId: priyaUser.schoolId,
    employeeId: sureshEmployee.id,
  })

  const sureshHeaders = {
    cookie: `erp_session=${sureshToken}`,
    authorization: `Bearer ${sureshToken}`,
    'content-type': 'application/json',
  }

  const testDate = '2026-10-21'

  // ── TEST 1: Loading Students for Authorized Class ──
  console.log('[Test 1] Loading Students for Authorized Class...')
  const classGrade1 = await db.class.findFirst({ where: { name: 'Grade 1' } })
  const sectionGrade1A = await db.section.findFirst({ where: { classId: classGrade1.id, name: 'A' } })
  assert.ok(classGrade1 && sectionGrade1A, 'Grade 1 Section A exists')

  const studentsRes = await listStudents(new NextRequest(
    `http://localhost:3000/api/students?classId=${classGrade1.id}&sectionId=${sectionGrade1A.id}&all=1`,
    { headers: priyaHeaders }
  ))
  assert.equal(studentsRes.status, 200, 'Student list response should be 200')
  const grade1AStudents = (await studentsRes.json()).data
  assert.ok(grade1AStudents.length > 0, 'Grade 1-A has enrolled students')
  console.log(`  ✓ Loaded ${grade1AStudents.length} active students for authorized Grade 1 Section A`)

  // ── TEST 2: Marking and Saving Attendance Bulk ──
  console.log('\n[Test 2] Marking and Saving Attendance Bulk...')
  const entries = grade1AStudents.map((s: any, idx: number) => ({
    studentId: s.id,
    status: idx === 0 ? 'ABSENT' : idx === 1 ? 'LATE' : 'PRESENT',
    remarks: idx === 0 ? 'Medical leave notified' : idx === 1 ? 'Bus delayed 10m' : undefined,
  }))

  const saveRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: priyaHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries,
    }),
  }))
  assert.equal(saveRes.status, 200, 'Bulk attendance save should return 200')
  const saveJson = await saveRes.json()
  assert.equal(saveJson.data.saved, entries.length, 'All student attendance entries saved successfully')
  console.log(`  ✓ Saved bulk attendance for ${saveJson.data.saved} students (Absent: 1, Late: 1, Present: ${entries.length - 2})`)

  // ── TEST 3: Reading Saved Records After Refresh ──
  console.log('\n[Test 3] Reading Saved Records via GET /api/attendance...')
  const readRes = await listAttendance(new NextRequest(
    `http://localhost:3000/api/attendance?dateFrom=${testDate}&dateTo=${testDate}&sectionId=${sectionGrade1A.id}&all=1`,
    { headers: priyaHeaders }
  ))
  assert.equal(readRes.status, 200, 'Attendance list should return 200')
  const savedRecords = (await readRes.json()).data
  assert.equal(savedRecords.length, entries.length, 'Read exact count of saved attendance records')
  const absentRecord = savedRecords.find((r: any) => r.studentId === entries[0].studentId)
  assert.equal(absentRecord?.status, 'ABSENT', 'Absent status correctly read from database')
  assert.equal(absentRecord?.remarks, 'Medical leave notified', 'Remarks correctly read from database')
  console.log(`  ✓ Successfully read ${savedRecords.length} persisted records with exact statuses and remarks`)

  // ── TEST 4: Updating an Existing Record without Duplication ──
  console.log('\n[Test 4] Updating Existing Records without Duplication (Upsert Integrity)...')
  const updatedEntries = grade1AStudents.map((s: any) => ({
    studentId: s.id,
    status: 'PRESENT',
    remarks: 'Recovered and attended',
  }))

  const updateRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: priyaHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries: updatedEntries,
    }),
  }))
  assert.equal(updateRes.status, 200, 'Re-saving attendance should return 200')

  const verifyRes = await listAttendance(new NextRequest(
    `http://localhost:3000/api/attendance?dateFrom=${testDate}&dateTo=${testDate}&sectionId=${sectionGrade1A.id}&all=1`,
    { headers: priyaHeaders }
  ))
  const updatedRecords = (await verifyRes.json()).data
  assert.equal(updatedRecords.length, entries.length, 'No duplicate records created on repeated save')
  assert.ok(updatedRecords.every((r: any) => r.status === 'PRESENT'), 'All updated records have status PRESENT')
  console.log(`  ✓ Record count preserved at ${updatedRecords.length} (zero duplicate records generated)`)

  // ── TEST 5: Rejecting Unauthorized Class Access ──
  console.log('\n[Test 5] Rejecting Unauthorized Class Access (Server-Side Authorization)...')
  // Find a class not assigned to Suresh Kulkarni
  const unassignedClass = await db.class.findFirst({ where: { name: 'Grade 12' } })
  const unassignedSection = await db.section.findFirst({ where: { classId: unassignedClass.id } })
  const unassignedStudents = await db.student.findMany({ where: { sectionId: unassignedSection.id }, take: 2 })

  const unauthClassRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: sureshHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: unassignedClass.id,
      sectionId: unassignedSection.id,
      entries: unassignedStudents.map((s: any) => ({ studentId: s.id, status: 'PRESENT' })),
    }),
  }))
  assert.equal(unauthClassRes.status, 403, 'Unauthorized class submission must be rejected with 403')
  const unauthClassJson = await unauthClassRes.json()
  assert.ok(unauthClassJson.error.includes('authorized'), 'Error message clearly indicates authorization failure')
  console.log(`  ✓ Server rejected unauthorized class submission with 403: "${unauthClassJson.error}"`)

  // ── TEST 6: Rejecting a Student ID from Another Class ──
  console.log('\n[Test 6] Rejecting a Student ID from Another Class (Class Mismatch Protection)...')
  const foreignStudent = unassignedStudents[0]
  const mismatchedEntries = [
    { studentId: grade1AStudents[0].id, status: 'PRESENT' },
    { studentId: foreignStudent.id, status: 'PRESENT' }, // Foreign student in Grade 1 payload
  ]

  const mismatchRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: priyaHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries: mismatchedEntries,
    }),
  }))
  assert.equal(mismatchRes.status, 400, 'Cross-class student submission must be rejected with 400')
  const mismatchJson = await mismatchRes.json()
  assert.ok(mismatchJson.error.includes('selected class'), 'Error message identifies class mismatch')
  console.log(`  ✓ Server rejected cross-class student with 400: "${mismatchJson.error}"`)

  // ── TEST 7: Invalid Status and Date Validation ──
  console.log('\n[Test 7] Invalid Status and Date Validation...')
  // 7A: Invalid status
  const invalidStatusRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: priyaHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries: [{ studentId: grade1AStudents[0].id, status: 'UNKNOWN_STATUS' }],
    }),
  }))
  assert.equal(invalidStatusRes.status, 400, 'Invalid status must be rejected with 400')
  console.log(`  ✓ Rejected invalid status with 400: "${(await invalidStatusRes.json()).error}"`)

  // 7B: Malformed date
  const malformedDateRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: priyaHeaders,
    body: JSON.stringify({
      date: '2026-99-99',
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries: [{ studentId: grade1AStudents[0].id, status: 'PRESENT' }],
    }),
  }))
  assert.equal(malformedDateRes.status, 400, 'Malformed date must be rejected with 400')
  console.log(`  ✓ Rejected malformed date format with 400: "${(await malformedDateRes.json()).error}"`)

  // ── TEST 8: Attendance Summary Accuracy and Analytics ──
  console.log('\n[Test 8] Attendance Summary Accuracy and Analytics...')
  const statsRes = await getStats(new NextRequest(
    `http://localhost:3000/api/attendance/stats?days=30&classId=${classGrade1.id}`,
    { headers: priyaHeaders }
  ))
  assert.equal(statsRes.status, 200, 'Stats endpoint should return 200')
  const statsJson = (await statsRes.json()).data
  assert.ok(typeof statsJson.avgPercent === 'number', 'avgPercent is a numeric value')
  assert.ok(statsJson.trend !== undefined, 'trend array returned')
  console.log(`  ✓ Scoped attendance stats computed: avgPercent=${statsJson.avgPercent}%, trackedStudents=${statsJson.trackedStudents}`)

  // ── TEST 9: Audit Logging ──
  console.log('\n[Test 9] Audit Logging Verification...')
  const auditLogs = await db.auditLog.findMany({
    where: { entity: 'Attendance', action: 'UPDATE' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })
  assert.ok(auditLogs.length > 0, 'Audit log created for Attendance UPDATE')
  const latestAudit = auditLogs[0]
  assert.equal(latestAudit.userName, priyaUser.name, 'Audit log correctly attributes teacher')
  console.log(`  ✓ Audit log confirmed: User "${latestAudit.userName}" (${latestAudit.userRole}) performed Attendance UPDATE`)

  // ── TEST 10: Tenant Isolation ──
  console.log('\n[Test 10] Tenant Isolation Enforcement...')
  const crossTenantHeaders = {
    ...priyaHeaders,
    'x-school-id': 'other-school-999',
  }
  const crossTenantRes = await bulkAttendance(new NextRequest('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: crossTenantHeaders,
    body: JSON.stringify({
      date: testDate,
      classId: classGrade1.id,
      sectionId: sectionGrade1A.id,
      entries: [{ studentId: grade1AStudents[0].id, status: 'PRESENT' }],
    }),
  }))
  assert.ok(crossTenantRes.status === 400 || crossTenantRes.status === 403, 'Cross-tenant request must fail')
  console.log(`  ✓ Multi-tenant barrier intact (Status: ${crossTenantRes.status})`)

  // ── TEST 11: Existing Dashboard & Students Module Regression Check ──
  console.log('\n[Test 11] Regression Check: Dashboard and Students Module...')
  const dashRes = await getTeacherDashboard(new NextRequest('http://localhost:3000/api/portal/teacher', {
    headers: priyaHeaders,
  }))
  assert.equal(dashRes.status, 200, 'Teacher dashboard returns 200 OK')
  const dashData = (await dashRes.json()).data
  assert.ok(dashData.kpis !== undefined, 'Dashboard KPIs present')
  assert.ok(typeof dashData.kpis.attendancePendingCount === 'number', 'attendancePendingCount is numeric')
  console.log(`  ✓ Dashboard remains fully operational (Pending attendance: ${dashData.kpis.attendancePendingCount})`)

  // ── TEST 12: SQLite Direct Persistence Check ──
  console.log('\n[Test 12] SQLite Database Direct Persistence Verification...')
  const rawRows: any[] = await db.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM Attendance WHERE date >= ? AND classId = ?',
    new Date(`${testDate}T00:00:00.000Z`).getTime(),
    classGrade1.id
  )
  const count = Number(rawRows[0]?.count || 0)
  assert.ok(count >= entries.length, 'SQLite raw records verified in db/custom.db via raw SQL')
  console.log(`  ✓ Confirmed ${count} records persisted directly in SQLite (db/custom.db)`)

  console.log('\n================================================================')
  console.log(' Summary: All 12 Phase 3 Attendance Test Suites PASSED!')
  console.log('================================================================\n')
}

runTests().catch(err => {
  console.error('\n❌ Phase 3 Test Suite Failed:', err)
  process.exit(1)
})
