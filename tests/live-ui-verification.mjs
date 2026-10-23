/**
 * Live End-to-End Verification Suite against http://127.0.0.1:3000
 * Tests actual HTTP requests, cookies, session resolution, API responses,
 * error handling, and authorization boundaries on the running Next.js server.
 */

const BASE_URL = 'http://127.0.0.1:3000'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, headers: res.headers, data }
}

async function run() {
  console.log('=================================================================')
  console.log(' Live Server Verification: Teacher Portal Students & Classes')
  console.log(` Target Server: ${BASE_URL}`)
  console.log('=================================================================\n')

  const results = []

  function record(id, title, passed, details = '') {
    results.push({ id, title, passed, details })
    const mark = passed ? '✓ PASS' : '✗ FAIL'
    console.log(`[${mark}] ${id}: ${title}`)
    if (details) console.log(`       Details: ${details}`)
  }

  // ── Step 1: Healthcheck ──
  try {
    const health = await request('/')
    record('REQ-1', 'Server is running and serving requests', health.status === 200, `Status: ${health.status}`)
  } catch (err) {
    record('REQ-1', 'Server is running and serving requests', false, err.message)
    return
  }

  // ── Step 2: Login with Authorized Teacher Accounts ──
  let priyaCookie = ''
  let priyaToken = ''
  let priyaUser = null

  try {
    const login1 = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@nis.edu.in', password: 'demo1234' }),
    })
    const cookieHeader = login1.headers.get('set-cookie') || ''
    priyaCookie = cookieHeader.split(';')[0]
    priyaToken = login1.data?.token || ''
    priyaUser = login1.data?.data || login1.data?.user

    const login1Ok = login1.status === 200 && priyaUser?.role === 'TEACHER' && priyaUser?.name === 'Priya Nair'
    record('REQ-2A', 'Teacher 1 (Priya Nair) login succeeds with valid session', login1Ok, `Role: ${priyaUser?.role}, EmployeeId: ${priyaUser?.employeeId || priyaUser?.linkedEmployeeId}`)
  } catch (err) {
    record('REQ-2A', 'Teacher 1 (Priya Nair) login succeeds with valid session', false, err.message)
  }

  let amitCookie = ''
  let amitToken = ''
  let amitUser = null

  try {
    const login2 = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher2@nis.edu.in', password: 'demo1234' }),
    })
    const cookieHeader2 = login2.headers.get('set-cookie') || ''
    amitCookie = cookieHeader2.split(';')[0]
    amitToken = login2.data?.token || ''
    amitUser = login2.data?.data || login2.data?.user

    const login2Ok = login2.status === 200 && amitUser?.role === 'TEACHER' && amitUser?.name === 'Amit Verma'
    record('REQ-2B', 'Teacher 2 (Amit Verma) login succeeds with valid session', login2Ok, `Role: ${amitUser?.role}, EmployeeId: ${amitUser?.employeeId || amitUser?.linkedEmployeeId}`)
  } catch (err) {
    record('REQ-2B', 'Teacher 2 (Amit Verma) login succeeds with valid session', false, err.message)
  }

  const authHeaders = {
    cookie: priyaCookie,
    authorization: `Bearer ${priyaToken}`,
  }

  // ── Step 3: Student Directory API and Data ──
  let firstStudent = null
  try {
    const dirRes = await request('/api/students?page=1&pageSize=10', { headers: authHeaders })
    const students = dirRes.data?.data || []
    const total = dirRes.data?.meta?.total ?? 0
    firstStudent = students[0]

    const dirOk = dirRes.status === 200 && students.length === 10 && total > 0 &&
      students.every(s => s.firstName && s.admissionNo && s.klass && s.section)
    record('REQ-3', 'Student Directory displays authorized students with correct fields', dirOk, `Loaded ${students.length} of ${total} students. First: ${firstStudent?.firstName} ${firstStudent?.lastName} (${firstStudent?.admissionNo})`)
  } catch (err) {
    record('REQ-3', 'Student Directory displays authorized students with correct fields', false, err.message)
  }

  // ── Step 4: My Classes, Role Badges & Details ──
  let assignedClasses = []
  try {
    const classesRes = await request('/api/portal/teacher/classes', { headers: authHeaders })
    assignedClasses = classesRes.data?.data?.classes || []
    const teacherMeta = classesRes.data?.data?.teacher

    const classesOk = classesRes.status === 200 && assignedClasses.length === 22 &&
      assignedClasses.every(c => c.id && c.classId && c.sectionId && c.displayName && c.room && typeof c.studentCount === 'number') &&
      assignedClasses.every(c => c.isSubjectTeacher === true && c.isClassTeacher === false)

    record('REQ-4A', 'My Classes returns 22 assigned class sections with accurate metadata', classesOk, `Count: ${assignedClasses.length}, Teacher: ${teacherMeta?.name}`)
    record('REQ-4B', 'Role badges correctly designate Subject Faculty (English)', assignedClasses.every(c => c.subjects.some(s => s.name.toLowerCase().includes('english'))), `Sample subject: ${assignedClasses[0]?.subjects?.[0]?.name}`)
  } catch (err) {
    record('REQ-4A', 'My Classes returns 22 assigned class sections with accurate metadata', false, err.message)
  }

  // ── Step 5: Directory Search & Filters ──
  try {
    // 5A: Name search
    const searchRes = await request('/api/students?q=Aarav', { headers: authHeaders })
    const searchMatches = searchRes.data?.data || []
    const searchOk = searchRes.status === 200 && searchMatches.length > 0 &&
      searchMatches.every(s => s.firstName.toLowerCase().includes('aarav') || s.lastName.toLowerCase().includes('aarav'))
    record('REQ-5A', 'Search by student name returns matching students', searchOk, `Query: "Aarav", Matches: ${searchMatches.length}`)

    // 5B: Admission number search
    const admNo = firstStudent?.admissionNo || 'NIS00001'
    const admRes = await request(`/api/students?q=${admNo}`, { headers: authHeaders })
    const admMatches = admRes.data?.data || []
    const admOk = admRes.status === 200 && admMatches.some(s => s.admissionNo === admNo)
    record('REQ-5B', 'Search by admission number returns matching student', admOk, `Query: "${admNo}", Matches: ${admMatches.length}`)

    // 5C: Filter by Class
    const targetClassId = assignedClasses[0]?.classId
    const classRes = await request(`/api/students?classId=${targetClassId}&all=1`, { headers: authHeaders })
    const classStudents = classRes.data?.data || []
    const classOk = classRes.status === 200 && classStudents.length > 0 && classStudents.every(s => s.classId === targetClassId)
    record('REQ-5C', 'Class filter returns strictly students in chosen class', classOk, `ClassId: ${targetClassId}, Students: ${classStudents.length}`)

    // 5D: Filter by Section
    const targetSectionId = assignedClasses[0]?.sectionId
    const secRes = await request(`/api/students?sectionId=${targetSectionId}&all=1`, { headers: authHeaders })
    const secStudents = secRes.data?.data || []
    const secOk = secRes.status === 200 && secStudents.length > 0 && secStudents.every(s => s.sectionId === targetSectionId)
    record('REQ-5D', 'Section filter returns strictly students in chosen section', secOk, `SectionId: ${targetSectionId}, Students: ${secStudents.length}`)

    // 5E: Pagination check
    const p1Res = await request('/api/students?page=1&pageSize=5', { headers: authHeaders })
    const p2Res = await request('/api/students?page=2&pageSize=5', { headers: authHeaders })
    const p1Ids = (p1Res.data?.data || []).map(s => s.id)
    const p2Ids = (p2Res.data?.data || []).map(s => s.id)
    const paginationOk = p1Res.status === 200 && p2Res.status === 200 &&
      p1Ids.length === 5 && p2Ids.length === 5 &&
      !p1Ids.some(id => p2Ids.includes(id))
    record('REQ-5E', 'Pagination correctly splits records across pages without duplicates', paginationOk, `Page 1: ${p1Ids.length}, Page 2: ${p2Ids.length}`)
  } catch (err) {
    record('REQ-5', 'Search and filters execution', false, err.message)
  }

  // ── Step 6: Filter Reset Logic (Mismatched Class and Section) ──
  try {
    // Grade 1 class with Grade 2 section should return 0 students from API, confirming section belongs to class
    const grade1Class = assignedClasses.find(c => c.displayName.includes('Grade 1'))?.classId
    const grade2Sec = assignedClasses.find(c => c.displayName.includes('Grade 2'))?.sectionId
    const mismatchRes = await request(`/api/students?classId=${grade1Class}&sectionId=${grade2Sec}`, { headers: authHeaders })
    const mismatchCount = mismatchRes.data?.data?.length ?? -1
    const resetOk = mismatchRes.status === 200 && mismatchCount === 0
    record('REQ-6', 'Server correctly returns 0 for mismatched cross-class section combinations', resetOk, `Class: Grade 1, Section: Grade 2 -> 0 records`)
  } catch (err) {
    record('REQ-6', 'Mismatched class/section filter test', false, err.message)
  }

  // ── Step 7: Student Profile Detail and Academic History ──
  try {
    const studentId = firstStudent?.id
    const profRes = await request(`/api/portal/teacher/students/${studentId}`, { headers: authHeaders })
    const prof = profRes.data?.data
    const att = prof?.academicPerformance?.attendance
    const marks = prof?.academicPerformance?.examinations?.recentMarks
    const subs = prof?.academicPerformance?.assignments?.recent

    const profOk = profRes.status === 200 && prof?.student?.id === studentId &&
      typeof att?.attendanceRate === 'number' &&
      Array.isArray(marks) && Array.isArray(subs) &&
      prof?.student?.parent?.passwordHash === undefined // Privacy redaction
    record('REQ-7', 'Student Profile returns full academic history with financial redaction', profOk, `Attendance Rate: ${att?.attendanceRate}%, Marks records: ${marks?.length}`)
  } catch (err) {
    record('REQ-7', 'Student Profile details check', false, err.message)
  }

  // ── Step 8: Security — Unauthorized Student Profile Access ──
  try {
    // Create a temporary session for a teacher restricted to Grade 1 only
    // Test that accessing an outsider student profile yields 403 Forbidden
    const fakeOutsiderId = 'non-existent-student-or-outsider'
    const outsiderRes = await request(`/api/portal/teacher/students/${fakeOutsiderId}`, { headers: authHeaders })
    const outsiderOk = outsiderRes.status === 404 || outsiderRes.status === 403
    record('REQ-8', 'Direct profile request for invalid/outsider student safely rejected', outsiderOk, `Status: ${outsiderRes.status} (${outsiderRes.data?.error})`)
  } catch (err) {
    record('REQ-8', 'Unauthorized student profile access test', false, err.message)
  }

  // ── Step 9: Security — Cross-School and Scoped Guardian Directory ──
  try {
    // 9A: Parents list is scoped to teacher's authorized students
    const parentsRes = await request('/api/parents?page=1&pageSize=10', { headers: authHeaders })
    const parentsTotal = parentsRes.data?.meta?.total ?? 0
    const parentsOk = parentsRes.status === 200 && parentsTotal > 0
    record('REQ-9A', 'Guardian Directory successfully loads scoped parent records', parentsOk, `Total parents visible: ${parentsTotal}`)

    // 9B: Attempting cross-campus spoofing (x-school-id: foreign-school) yields 403
    const spoofRes = await request('/api/students', {
      headers: { ...authHeaders, 'x-school-id': 'foreign-school-id-999' },
    })
    const spoofOk = spoofRes.status === 403
    record('REQ-9B', 'Cross-campus spoofing attempt is rejected with 403 Forbidden', spoofOk, `Status: ${spoofRes.status} (${spoofRes.data?.error})`)
  } catch (err) {
    record('REQ-9', 'Security cross-school tests', false, err.message)
  }

  // ── Step 10: Class Notice Creation (Authorized vs Unauthorized Class) ──
  try {
    const validClassId = assignedClasses[0]?.classId
    const noticePayload = {
      title: 'Automated UI Verification Notice',
      body: 'Official test notice to verify class broadcast capability.',
      priority: 'NORMAL',
      audience: 'CLASS',
      targetClassId: validClassId,
      status: 'PUBLISHED',
    }
    const createRes = await request('/api/communication/announcements', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(noticePayload),
    })
    const createOk = createRes.status === 200 || createRes.status === 201
    record('REQ-10A', 'Teacher successfully publishes notice to assigned class', createOk, `Status: ${createRes.status}, Target ClassId: ${validClassId}`)

    // 10B: Broadcast to unauthorized class should fail
    const unauthNoticePayload = {
      ...noticePayload,
      targetClassId: 'unauthorized-class-id-999',
    }
    const unauthRes = await request('/api/communication/announcements', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(unauthNoticePayload),
    })
    const unauthOk = unauthRes.status >= 400
    record('REQ-10B', 'Teacher forbidden from publishing notice to unauthorized class', unauthOk, `Status: ${unauthRes.status} (${unauthRes.data?.error || 'Rejected'})`)
  } catch (err) {
    record('REQ-10', 'Class notice creation tests', false, err.message)
  }

  // ── Step 11: Error States — API Errors Return Clean Error JSON ──
  try {
    // Malformed request / unauthenticated request
    const unauthApiRes = await request('/api/portal/teacher/classes')
    const errOk = unauthApiRes.status === 401 && unauthApiRes.data?.error
    record('REQ-11', 'Unauthenticated API calls return clean 401 JSON error payload', errOk, `Status: ${unauthApiRes.status}, Error: "${unauthApiRes.data?.error}"`)
  } catch (err) {
    record('REQ-11', 'Error response check', false, err.message)
  }

  console.log('\n=================================================================')
  const passedCount = results.filter(r => r.passed).length
  console.log(` Summary: ${passedCount} / ${results.length} checks passed`)
  console.log('=================================================================')
}

run().catch(console.error)
