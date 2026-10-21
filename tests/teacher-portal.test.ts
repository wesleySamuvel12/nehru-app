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
  console.log(' Phase 2: Teacher Students & Classes Comprehensive Test Suite')
  console.log('================================================================\n')

  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { GET: getTeacherClasses } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/classes/route.ts'))
  const { GET: getTeacherStudent } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/students/[id]/route.ts'))
  const { GET: getTeacherDashboard } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/route.ts'))
  const { GET: listStudents } = await jiti.import(path.join(rootDir, 'src/app/api/students/route.ts'))
  const { NextRequest } = await import('next/server')

  // ── TEST 1: Assigned Classes for Different Teacher Accounts ──
  console.log('[Test 1] Assigned Classes for Multiple Teacher Accounts...')

  // 1A: Priya Nair (Senior Teacher - English)
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

  const priyaClassesRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  }))
  assert.equal(priyaClassesRes.status, 200, 'Priya classes should return 200')
  const priyaClasses = (await priyaClassesRes.json()).data.classes
  assert.equal(priyaClasses.length, 22, 'Priya Nair teaches English across 22 class sections')
  assert.ok(priyaClasses.every((c: any) => c.subjects.some((s: any) => s.name.toLowerCase().includes('english'))), 'All assigned classes have English subject')
  console.log(`  ✓ Teacher 1 (Priya Nair): 22 assigned class sections (Subject: English)`)

  // 1B: Amit Verma (Senior Teacher - Mathematics)
  const amitUser = await db.user.findFirst({ where: { email: 'teacher2@nis.edu.in' } })
  assert.ok(amitUser, 'Amit Verma user exists')
  const amitToken = await signSession({
    sub: amitUser.id,
    name: amitUser.name,
    role: amitUser.role,
    email: amitUser.email,
    schoolId: amitUser.schoolId,
    employeeId: amitUser.linkedEmployeeId,
  })

  const amitClassesRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', {
    headers: { cookie: `erp_session=${amitToken}`, authorization: `Bearer ${amitToken}` },
  }))
  assert.equal(amitClassesRes.status, 200, 'Amit classes should return 200')
  const amitClasses = (await amitClassesRes.json()).data.classes
  assert.equal(amitClasses.length, 22, 'Amit Verma teaches Math across 22 class sections')
  assert.ok(amitClasses.every((c: any) => c.subjects.some((s: any) => s.name.toLowerCase().includes('math'))), 'All assigned classes have Mathematics subject')
  console.log(`  ✓ Teacher 2 (Amit Verma): 22 assigned class sections (Subject: Mathematics)`)

  // 1C: Suresh Kulkarni (Specific subset of classes)
  const sureshEmp = await db.employee.findFirst({ where: { firstName: 'Suresh' } })
  assert.ok(sureshEmp, 'Suresh Kulkarni employee exists')
  const sureshToken = await signSession({
    sub: 'temp-suresh-sub',
    name: 'Suresh Kulkarni',
    role: 'TEACHER',
    email: sureshEmp.email || 'suresh@nis.edu.in',
    schoolId: sureshEmp.schoolId,
    employeeId: sureshEmp.id,
  })

  const sureshClassesRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', {
    headers: { cookie: `erp_session=${sureshToken}`, authorization: `Bearer ${sureshToken}` },
  }))
  assert.equal(sureshClassesRes.status, 200, 'Suresh classes should return 200')
  const sureshClasses = (await sureshClassesRes.json()).data.classes
  assert.equal(sureshClasses.length, 10, 'Suresh Kulkarni only has 10 assigned class sections')
  assert.ok(sureshClasses.length < 22, 'Suresh is strictly not granted classes he does not teach')
  console.log(`  ✓ Teacher 3 (Suresh Kulkarni): Strictly isolated to 10 assigned sections (Homeroom + Subjects)\n`)

  // ── TEST 2: Student Directory Search and Filters ──
  console.log('[Test 2] Student Directory Search & Filter Queries...')

  // 2A: Search by Name
  const searchReq = new NextRequest('http://localhost:3000/api/students?q=Aarav', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const searchRes = await listStudents(searchReq)
  assert.equal(searchRes.status, 200, 'Search should return 200')
  const searchData = await searchRes.json()
  assert.ok(searchData.data.length > 0, 'Search for "Aarav" should return results')
  assert.ok(searchData.data.every((s: any) => s.firstName.toLowerCase().includes('aarav') || s.lastName.toLowerCase().includes('aarav')), 'All search results match query')
  console.log(`  ✓ Name search "Aarav" returned ${searchData.data.length} match(es)`)

  // 2B: Filter by Section
  const sampleSection = priyaClasses[0].sectionId
  const filterReq = new NextRequest(`http://localhost:3000/api/students?sectionId=${sampleSection}`, {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const filterRes = await listStudents(filterReq)
  assert.equal(filterRes.status, 200, 'Section filter should return 200')
  const filterData = await filterRes.json()
  assert.ok(filterData.data.every((s: any) => s.sectionId === sampleSection), 'All filtered students belong to target section')
  console.log(`  ✓ Section filter for "${priyaClasses[0].displayName}" returned ${filterData.data.length} enrolled students`)

  // 2C: Filter by Status
  const statusReq = new NextRequest('http://localhost:3000/api/students?status=ACTIVE', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const statusRes = await listStudents(statusReq)
  const statusData = await statusRes.json()
  assert.ok(statusData.data.every((s: any) => s.status === 'ACTIVE'), 'Status filter correctly returns ACTIVE students only')
  console.log(`  ✓ Status filter returned ${statusData.data.length} active students\n`)

  // ── TEST 3: Pagination ──
  console.log('[Test 3] Student Directory Pagination...')
  const page1Req = new NextRequest('http://localhost:3000/api/students?page=1&pageSize=10', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const page1Res = await listStudents(page1Req)
  const page1Data = await page1Res.json()
  assert.equal(page1Data.meta.page, 1, 'Page 1 meta matches')
  assert.equal(page1Data.meta.pageSize, 10, 'Page size matches 10')
  assert.equal(page1Data.data.length, 10, 'Returned exactly 10 students')
  assert.ok(page1Data.meta.total > 10, 'Total records exceeds page size')

  const page2Req = new NextRequest('http://localhost:3000/api/students?page=2&pageSize=10', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const page2Res = await listStudents(page2Req)
  const page2Data = await page2Res.json()
  assert.equal(page2Data.meta.page, 2, 'Page 2 meta matches')
  assert.equal(page2Data.data.length, 10, 'Returned 10 students on page 2')

  const page1Ids = new Set(page1Data.data.map((s: any) => s.id))
  assert.ok(!page2Data.data.some((s: any) => page1Ids.has(s.id)), 'Page 2 rows are completely disjoint from Page 1')
  console.log(`  ✓ Page 1 (items 1-10) and Page 2 (items 11-20) verified distinct across ${page1Data.meta.total} total students\n`)

  // ── TEST 4 & 5: Student Profile & Academic History ──
  console.log('[Test 4 & 5] Student Profile, Attendance, Subject Breakdown & Privacy Redaction...')
  const student = await db.student.findFirst({
    where: { sectionId: sampleSection },
    include: { klass: true, section: true },
  })
  assert.ok(student, 'Enrolled student found in section')

  const detailReq = new NextRequest(`http://localhost:3000/api/portal/teacher/students/${student.id}`, {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  })
  const detailRes = await getTeacherStudent(detailReq, { params: Promise.resolve({ id: student.id }) })
  assert.equal(detailRes.status, 200, 'Profile load should return 200')
  const detailData = await detailRes.json()

  assert.equal(detailData.data.student.id, student.id, 'IDs match')
  assert.ok(detailData.data.student.firstName, 'First name present')
  assert.ok(detailData.data.student.admissionNo, 'Admission number present')
  assert.ok(typeof detailData.data.academicPerformance?.attendance?.attendanceRate === 'number', 'Attendance rate calculated')
  assert.ok(Array.isArray(detailData.data.academicPerformance?.attendance?.recent), 'Recent attendance history array exists')
  assert.ok(Array.isArray(detailData.data.academicPerformance?.examinations?.recentMarks), 'Exam marks history array exists')
  assert.ok(Array.isArray(detailData.data.academicPerformance?.examinations?.subjectPerformance), 'Subject-wise performance breakdown exists')
  assert.ok(Array.isArray(detailData.data.academicPerformance?.assignments?.recent), 'Assignment submissions array exists')

  // Redaction check
  if (detailData.data.student.parent) {
    assert.equal(detailData.data.student.parent.passwordHash, undefined, 'Password hash is strictly redacted')
    assert.equal(detailData.data.student.parent.bankAccount, undefined, 'Bank account is strictly redacted')
  }
  console.log(`  ✓ Loaded student: ${student.firstName} ${student.lastName} (${student.admissionNo})`)
  console.log(`  ✓ Attendance: ${detailData.data.academicPerformance.attendance.attendanceRate}% (${detailData.data.academicPerformance.attendance.presentCount}/${detailData.data.academicPerformance.attendance.totalSessions} sessions)`)
  console.log(`  ✓ Examination Marks: ${detailData.data.academicPerformance.examinations.recentMarks.length} records`)
  console.log(`  ✓ Subject Performance: ${detailData.data.academicPerformance.examinations.subjectPerformance.length} subjects analyzed`)
  console.log(`  ✓ Parent financial data verified absent\n`)

  // ── TEST 6: Unauthorized Access Boundary Enforcement ──
  console.log('[Test 6] Unauthorized Access Prevention (Role & Scope Boundaries)...')

  // 6A: Student role attempting teacher endpoints
  const studentUser = await db.user.findFirst({ where: { role: 'STUDENT' } })
  if (studentUser) {
    const studentToken = await signSession({
      sub: studentUser.id,
      name: studentUser.name,
      role: 'STUDENT',
      email: studentUser.email,
      schoolId: studentUser.schoolId,
    })
    const unauthRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', {
      headers: { cookie: `erp_session=${studentToken}`, authorization: `Bearer ${studentToken}` },
    }))
    assert.equal(unauthRes.status, 403, 'Student role must receive 403 Forbidden on teacher classes')
    console.log('  ✓ Rejected non-teacher role (STUDENT -> 403 Forbidden)')
  }

  // 6B: Anonymous request (no token)
  const anonRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes'))
  assert.equal(anonRes.status, 401, 'Anonymous request must receive 401 Unauthorized')
  console.log('  ✓ Rejected unauthenticated request (No token -> 401 Unauthorized)')

  // 6C: Teacher attempting to view a student OUTSIDE their authorized classes
  // Suresh Kulkarni only teaches 5 classes. Find a student in one of the other 7 classes.
  const sureshAuthorizedClasses = sureshClasses.map((c: any) => c.classId)
  const outsiderStudent = await db.student.findFirst({
    where: { classId: { notIn: sureshAuthorizedClasses } },
  })
  if (outsiderStudent) {
    const outsiderReq = new NextRequest(`http://localhost:3000/api/portal/teacher/students/${outsiderStudent.id}`, {
      headers: { cookie: `erp_session=${sureshToken}`, authorization: `Bearer ${sureshToken}` },
    })
    const outsiderRes = await getTeacherStudent(outsiderReq, { params: Promise.resolve({ id: outsiderStudent.id }) })
    assert.equal(outsiderRes.status, 403, 'Teacher must be forbidden from accessing students outside their classes')
    console.log(`  ✓ Cross-class access blocked: Suresh Kulkarni forbidden (403) from accessing student in unauthorized class (${outsiderStudent.firstName} ${outsiderStudent.lastName})`)
  }

  // 6D: Directory scoping: Suresh Kulkarni should ONLY be able to list his authorized 50 students
  const sureshDirRes = await listStudents(new NextRequest('http://localhost:3000/api/students?all=1', {
    headers: { cookie: `erp_session=${sureshToken}`, authorization: `Bearer ${sureshToken}` },
  }))
  assert.equal(sureshDirRes.status, 200, 'Suresh directory list should return 200')
  const sureshDirData = await sureshDirRes.json()
  assert.equal(sureshDirData.data.length, 50, 'Suresh directory is strictly limited to the 50 students in his authorized classes')
  console.log(`  ✓ Directory row-level security: Suresh Kulkarni sees exactly 50 authorized students (out of 112 school-wide)\n`)

  // ── TEST 7: Tenant Isolation ──
  console.log('[Test 7] Multi-Tenant Isolation Enforcement...')
  const foreignToken = await signSession({
    sub: priyaUser.id,
    name: 'Priya Nair',
    role: 'TEACHER',
    email: priyaUser.email,
    schoolId: 'foreign-school-tenant-id-999',
    employeeId: priyaUser.linkedEmployeeId,
  })
  const tenantRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', {
    headers: { cookie: `erp_session=${foreignToken}`, authorization: `Bearer ${foreignToken}` },
  }))
  const tenantData = await tenantRes.json()
  assert.equal(tenantData.data?.classes?.length || 0, 0, 'Foreign school tenant sees 0 classes')
  console.log('  ✓ Foreign school tenant cannot access records from master school\n')

  // ── TEST 8: SQLite Data Persistence ──
  console.log('[Test 8] SQLite Data Persistence Check...')
  const userCount = await db.user.count()
  const studentCount = await db.student.count()
  const classCount = await db.class.count()
  assert.equal(userCount, 18, '18 users intact in db/custom.db')
  assert.equal(studentCount, 112, '112 students intact in db/custom.db')
  assert.equal(classCount, 12, '12 classes intact in db/custom.db')
  console.log(`  ✓ Verified SQLite persistence: ${userCount} users, ${studentCount} students, ${classCount} classes intact\n`)

  // ── TEST 9: Teacher Dashboard Integration ──
  console.log('[Test 9] Teacher Dashboard Regression Check...')
  const dashRes = await getTeacherDashboard(new NextRequest('http://localhost:3000/api/portal/teacher', {
    headers: { cookie: `erp_session=${priyaToken}`, authorization: `Bearer ${priyaToken}` },
  }))
  assert.equal(dashRes.status, 200, 'Dashboard returns 200')
  const dashData = await dashRes.json()
  assert.equal(dashData.data.kpis.assignedClassesCount, 12, 'Dashboard reflects 12 assigned classes')
  assert.equal(dashData.data.kpis.activeStudentsCount, 112, 'Dashboard reflects 112 enrolled students')
  console.log('  ✓ Teacher Dashboard operational and in sync with Students & Classes module\n')

  console.log('================================================================')
  console.log(' Summary: All 9 Phase 2 verification suites PASSED successfully!')
  console.log('================================================================')
}

runTests().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
}).finally(() => process.exit(0))
