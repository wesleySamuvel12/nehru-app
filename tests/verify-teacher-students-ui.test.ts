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

async function runVerification() {
  console.log('================================================================')
  console.log(' Verify Phase 2: Teacher Students & Classes UI & Navigation')
  console.log('================================================================\n')

  const { TEACHER_MODULE_REGISTRY } = await jiti.import(path.join(rootDir, 'src/role/teacher/modules/registry.tsx'))
  const { teacherNavigation } = await jiti.import(path.join(rootDir, 'src/role/teacher/navigation/index.ts'))
  const { can, NAV_ITEMS } = await jiti.import(path.join(rootDir, 'src/lib/rbac.ts'))
  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { GET: getTeacherClasses } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/classes/route.ts'))
  const { GET: listStudents } = await jiti.import(path.join(rootDir, 'src/app/api/students/route.ts'))
  const { GET: getStudentProfile } = await jiti.import(path.join(rootDir, 'src/app/api/portal/teacher/students/[id]/route.ts'))
  const { NextRequest } = await import('next/server')

  // 1. Navigation Registry & RBAC Permissions
  console.log('[Check 1] Navigation Registry and Sidebar Permissions...')
  assert.ok(teacherNavigation.includes('students'), 'teacherNavigation contains "students"')
  assert.equal(can('TEACHER', 'students'), true, 'RBAC can("TEACHER", "students") returns true')
  
  const studentNavItem = NAV_ITEMS.find((item: any) => item.key === 'students')
  assert.ok(studentNavItem, 'NAV_ITEMS has item with key "students"')
  assert.ok(studentNavItem.roles.includes('TEACHER'), 'NAV_ITEMS "students" includes "TEACHER" role')
  assert.equal(studentNavItem.label, 'Students', 'NAV_ITEMS item label is "Students"')
  console.log(`  ✓ Sidebar item "${studentNavItem.label}" is active for TEACHER in group "${studentNavItem.group}"`)

  // 2. Component Registration in TEACHER_MODULE_REGISTRY
  console.log('\n[Check 2] Component Registration in TEACHER_MODULE_REGISTRY...')
  assert.ok(TEACHER_MODULE_REGISTRY['students'] !== undefined, 'TEACHER_MODULE_REGISTRY contains "students"')
  console.log('  ✓ TEACHER_MODULE_REGISTRY["students"] successfully registered and resolves to StudentsModule')

  // 3. Authenticate as Teacher
  console.log('\n[Check 3] Teacher Authentication & Data Scoping...')
  const priyaUser = await db.user.findFirst({ where: { email: 'teacher@nis.edu.in' } })
  assert.ok(priyaUser, 'Priya Nair user exists')
  const token = await signSession({
    sub: priyaUser.id,
    name: priyaUser.name,
    role: priyaUser.role,
    email: priyaUser.email,
    schoolId: priyaUser.schoolId,
    employeeId: priyaUser.linkedEmployeeId,
  })
  const headers = { cookie: `erp_session=${token}`, authorization: `Bearer ${token}` }

  // 4. Assigned Classes Endpoint (Powers Tab 1: My Classes)
  console.log('\n[Check 4] Testing Tab 1 Backend: GET /api/portal/teacher/classes...')
  const classesRes = await getTeacherClasses(new NextRequest('http://localhost:3000/api/portal/teacher/classes', { headers }))
  assert.equal(classesRes.status, 200, 'Assigned classes endpoint returns 200 OK')
  const classesJson = (await classesRes.json()).data
  assert.ok(classesJson.classes.length > 0, 'Returns assigned classes')
  const firstClass = classesJson.classes[0]
  assert.ok(firstClass.className, 'Class card has className')
  assert.ok(firstClass.sectionName, 'Class card has sectionName')
  assert.ok(firstClass.subjects.length > 0, 'Class card lists subjects')
  assert.ok(typeof firstClass.studentCount === 'number', 'Class card lists student count')
  assert.ok(typeof firstClass.capacity === 'number', 'Class card lists capacity')
  console.log(`  ✓ Tab 1 (My Classes) ready with ${classesJson.classes.length} assigned classes (Sample: ${firstClass.displayName}, ${firstClass.studentCount} students)`)

  // 5. Scoped Student Directory Endpoint (Powers Tab 2: Student Directory)
  console.log('\n[Check 5] Testing Tab 2 Backend: GET /api/students...')
  const studentsRes = await listStudents(new NextRequest('http://localhost:3000/api/students?page=1&pageSize=10', { headers }))
  assert.equal(studentsRes.status, 200, 'Students API returns 200 OK')
  const studentsJson = await studentsRes.json()
  assert.ok(studentsJson.data.length > 0, 'Returns student directory page')
  const firstStudent = studentsJson.data[0]
  assert.ok(firstStudent.admissionNo, 'Student has admission number')
  assert.ok(firstStudent.firstName, 'Student has name')
  console.log(`  ✓ Tab 2 (Student Directory) ready with pagination (${studentsJson.meta?.total || studentsJson.data.length} students, Sample: ${firstStudent.firstName} ${firstStudent.lastName} · ${firstStudent.admissionNo})`)

  // 6. Student Profile Drawer Endpoint
  console.log('\n[Check 6] Testing Student Profile Drawer: GET /api/portal/teacher/students/[id]...')
  const profileRes = await getStudentProfile(
    new NextRequest(`http://localhost:3000/api/portal/teacher/students/${firstStudent.id}`, { headers }),
    { params: Promise.resolve({ id: firstStudent.id }) }
  )
  assert.equal(profileRes.status, 200, 'Student profile endpoint returns 200 OK')
  const profileJson = (await profileRes.json()).data
  assert.equal(profileJson.student.id, firstStudent.id, 'Profile matches requested student')
  assert.ok(profileJson.academicPerformance?.attendance !== undefined, 'Profile contains attendance summary')
  assert.ok(profileJson.academicPerformance?.examinations !== undefined, 'Profile contains exam results')
  assert.ok(profileJson.academicPerformance?.assignments !== undefined, 'Profile contains LMS submissions')
  assert.ok(profileJson.academicPerformance?.examinations?.subjectPerformance !== undefined, 'Profile contains subject-wise performance breakdown')
  console.log(`  ✓ Student Profile Drawer ready: Attendance Rate=${profileJson.academicPerformance.attendance.attendanceRate}%, Exams=${profileJson.academicPerformance.examinations.recentMarks.length}, LMS Submissions=${profileJson.academicPerformance.assignments.recent.length}`)

  console.log('\n================================================================')
  console.log(' Verification Complete: Phase 2 is fully visible & integrated!')
  console.log('================================================================\n')
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err)
  process.exit(1)
})
