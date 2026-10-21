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
  console.log(' Phase 4: Teacher LMS & Assignments Comprehensive Test Suite')
  console.log('================================================================\n')

  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { GET: listAssignments, POST: createAssignment } = await jiti.import(
    path.join(rootDir, 'src/app/api/lms/assignments/route.ts')
  )
  const { GET: getAssignment, PATCH: updateAssignment, DELETE: deleteAssignment } = await jiti.import(
    path.join(rootDir, 'src/app/api/lms/assignments/[id]/route.ts')
  )
  const { GET: listSubmissions } = await jiti.import(
    path.join(rootDir, 'src/app/api/lms/submissions/route.ts')
  )
  const { GET: getSubmission, PATCH: gradeSubmission } = await jiti.import(
    path.join(rootDir, 'src/app/api/lms/submissions/[id]/route.ts')
  )
  const { GET: getTeacherDashboard } = await jiti.import(
    path.join(rootDir, 'src/app/api/portal/teacher/route.ts')
  )
  const { NextRequest } = await import('next/server')

  // Setup Teacher Session 1: Priya Nair (English Teacher)
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

  // Setup Teacher Session 2: Amit Verma (Mathematics Teacher)
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

  const amitHeaders = {
    cookie: `erp_session=${amitToken}`,
    authorization: `Bearer ${amitToken}`,
    'content-type': 'application/json',
  }

  // Setup Admin Session
  const adminUser = await db.user.findFirst({ where: { role: 'SCHOOL_ADMIN' } })
  assert.ok(adminUser, 'Admin user exists')
  const adminToken = await signSession({
    sub: adminUser.id,
    name: adminUser.name,
    role: adminUser.role,
    email: adminUser.email,
    schoolId: adminUser.schoolId,
  })

  const adminHeaders = {
    cookie: `erp_session=${adminToken}`,
    authorization: `Bearer ${adminToken}`,
    'content-type': 'application/json',
  }

  let createdAssignmentId: string | null = null

  try {
    // -------------------------------------------------------------------------
    // TEST 1: GET /api/lms/assignments - Teacher Scoping & Enrichment
    // -------------------------------------------------------------------------
    console.log('Test 1: Teacher Scoping in GET /api/lms/assignments...')
    {
      const req = new NextRequest('http://localhost:3000/api/lms/assignments?all=1', {
        headers: priyaHeaders,
      })
      const res = await listAssignments(req)
      assert.equal(res.status, 200, 'Priya can list assignments')
      const body = await res.json()
      assert.ok(Array.isArray(body.data), 'Returns array of assignments')

      // Priya teaches English, not Math
      const titles = body.data.map((a: any) => a.title)
      assert.ok(titles.includes('Essay: Impact of Climate Change'), 'Priya sees her Climate Change assignment')
      assert.ok(!titles.includes('Algebra Worksheet — Linear Equations'), 'Priya does NOT see Amit Verma Math assignment')
      assert.ok(!titles.includes('Science Project — Working Model'), 'Priya does NOT see Rahul Kapoor Science assignment')

      // Check relation enrichment & submission stats
      const climate = body.data.find((a: any) => a.title === 'Essay: Impact of Climate Change')
      assert.ok(climate.class, 'Assignment includes enriched class object')
      assert.ok(climate.subject, 'Assignment includes enriched subject object')
      assert.ok(climate.stats, 'Assignment includes stats')
      assert.equal(climate.stats.total, 6, 'Climate Change assignment has 6 submissions')
      console.log(`  ✓ Priya sees only her 1 authorized assignment (with class ${climate.class.name}, ${climate.stats.total} submissions)`)
    }

    // -------------------------------------------------------------------------
    // TEST 2: GET /api/lms/assignments - Admin sees all assignments
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Admin cross-teacher visibility...')
    {
      const req = new NextRequest('http://localhost:3000/api/lms/assignments?all=1', {
        headers: adminHeaders,
      })
      const res = await listAssignments(req)
      assert.equal(res.status, 200, 'Admin can list assignments')
      const body = await res.json()
      assert.ok(body.data.length >= 4, 'Admin sees all school assignments')
      console.log(`  ✓ Admin sees all ${body.data.length} assignments across campus`)
    }

    // -------------------------------------------------------------------------
    // TEST 3: POST /api/lms/assignments - Validation Checks
    // -------------------------------------------------------------------------
    console.log('\nTest 3: POST /api/lms/assignments - Form Validations...')
    {
      // Missing title
      const reqMissing = new NextRequest('http://localhost:3000/api/lms/assignments', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({ classId: 'cls1', sectionId: 'sec1', subjectId: 'sub1' }),
      })
      const resMissing = await createAssignment(reqMissing)
      assert.equal(resMissing.status, 400, 'Fails with 400 when fields are missing')

      // Invalid maxMarks (negative)
      const reqNegativeMarks = new NextRequest('http://localhost:3000/api/lms/assignments', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          title: 'Test Assignment',
          classId: 'cls1',
          sectionId: 'sec1',
          subjectId: 'sub1',
          dueDate: '2026-11-01',
          maxMarks: -10,
        }),
      })
      const resNegativeMarks = await createAssignment(reqNegativeMarks)
      assert.equal(resNegativeMarks.status, 400, 'Fails with 400 when maxMarks is negative')

      // Invalid dueDate
      const reqBadDate = new NextRequest('http://localhost:3000/api/lms/assignments', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          title: 'Test Assignment',
          classId: 'cls1',
          sectionId: 'sec1',
          subjectId: 'sub1',
          dueDate: 'not-a-valid-date',
          maxMarks: 20,
        }),
      })
      const resBadDate = await createAssignment(reqBadDate)
      assert.equal(resBadDate.status, 400, 'Fails with 400 when dueDate is invalid')
      console.log('  ✓ Missing fields, negative maxMarks, and invalid dueDates are rejected with 400')
    }

    // -------------------------------------------------------------------------
    // TEST 4: POST /api/lms/assignments - Teacher Authorization Enforcement
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Teacher Unauthorized Creation (Subject not taught)...')
    {
      // Amit Verma's Math subject: MAT-977
      const mathSubject = await db.subject.findFirst({ where: { name: 'Mathematics' } })
      assert.ok(mathSubject, 'Math subject exists')
      const grade9 = await db.class.findFirst({ where: { name: 'Grade 9' } })
      const secA = await db.section.findFirst({ where: { classId: grade9.id } })

      // Priya attempts to create an assignment for Mathematics (not her subject)
      const reqUnauthorized = new NextRequest('http://localhost:3000/api/lms/assignments', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          title: 'Unauthorized Math Homework',
          classId: grade9.id,
          sectionId: secA.id,
          subjectId: mathSubject.id,
          dueDate: '2026-11-15',
          maxMarks: 25,
        }),
      })
      const resUnauthorized = await createAssignment(reqUnauthorized)
      assert.equal(resUnauthorized.status, 403, 'Priya cannot create assignments for Math')
      const body = await resUnauthorized.json()
      assert.ok(body.error.includes('not assigned to teach'), 'Returns clear permission error message')
      console.log('  ✓ Teacher cannot create assignment for unauthorized subjects (403 Forbidden)')
    }

    // -------------------------------------------------------------------------
    // TEST 5: POST /api/lms/assignments - Authorized Creation & Teacher ID Binding
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Authorized Assignment Creation by Teacher...')
    {
      const priyaEmployee = await db.employee.findFirst({ where: { firstName: 'Priya', lastName: 'Nair' } })
      assert.ok(priyaEmployee, 'Priya employee exists')
      const priyaSubject = await db.subject.findFirst({ where: { teacherId: priyaEmployee.id } })
      assert.ok(priyaSubject, 'Priya English subject exists')
      const targetSection = await db.section.findFirst({ where: { classId: priyaSubject.classId } })

      const reqCreate = new NextRequest('http://localhost:3000/api/lms/assignments', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          title: 'Poetry Analysis — The Road Not Taken',
          description: 'Analyze the symbolism of the two roads.',
          type: 'ASSIGNMENT',
          classId: priyaSubject.classId,
          sectionId: targetSection.id,
          subjectId: priyaSubject.id,
          dueDate: '2026-11-20',
          maxMarks: 30,
        }),
      })
      const resCreate = await createAssignment(reqCreate)
      assert.equal(resCreate.status, 201, 'Assignment created successfully')
      const body = await resCreate.json()
      assert.ok(body.data.id, 'Created assignment has an ID')
      assert.equal(body.data.teacherId, priyaEmployee.id, 'TeacherId matches employee ID')
      assert.equal(body.data.teacherName, 'Priya Nair', 'TeacherName is set to Priya Nair')
      assert.equal(body.data.maxMarks, 30, 'Max marks saved as 30')
      createdAssignmentId = body.data.id

      // Direct SQLite check
      const savedInDb = await db.assignment.findUnique({ where: { id: createdAssignmentId } })
      assert.ok(savedInDb, 'Persisted in SQLite database')
      assert.equal(savedInDb.title, 'Poetry Analysis — The Road Not Taken')
      console.log(`  ✓ Created assignment ${createdAssignmentId} bound to employee ${priyaEmployee.id}`)
    }

    // -------------------------------------------------------------------------
    // TEST 6: GET, PATCH, DELETE /api/lms/assignments/[id] - Ownership & Permissions
    // -------------------------------------------------------------------------
    console.log('\nTest 6: Assignment Detail & Edit Permission Checks...')
    {
      assert.ok(createdAssignmentId, 'createdAssignmentId exists')

      // Amit Verma attempts to view Priya's new assignment -> 403
      const reqAmitView = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
        headers: amitHeaders,
      })
      const resAmitView = await getAssignment(reqAmitView, { params: Promise.resolve({ id: createdAssignmentId }) })
      assert.equal(resAmitView.status, 403, 'Amit cannot view Priya assignment details')

      // Amit Verma attempts to update Priya's assignment -> 403
      const reqAmitUpdate = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
        method: 'PATCH',
        headers: amitHeaders,
        body: JSON.stringify({ title: 'Hacked Title' }),
      })
      const resAmitUpdate = await updateAssignment(reqAmitUpdate, { params: Promise.resolve({ id: createdAssignmentId }) })
      assert.equal(resAmitUpdate.status, 403, 'Amit cannot edit Priya assignment')

      // Priya updates her assignment: invalid maxMarks (0) -> 400
      const reqBadUpdate = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ maxMarks: 0 }),
      })
      const resBadUpdate = await updateAssignment(reqBadUpdate, { params: Promise.resolve({ id: createdAssignmentId }) })
      assert.equal(resBadUpdate.status, 400, 'Fails with 400 for maxMarks <= 0')

      // Priya updates her assignment: valid changes
      const reqValidUpdate = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({
          title: 'Poetry Analysis — Robert Frost Edition',
          maxMarks: 35,
          status: 'PUBLISHED',
        }),
      })
      const resValidUpdate = await updateAssignment(reqValidUpdate, { params: Promise.resolve({ id: createdAssignmentId }) })
      assert.equal(resValidUpdate.status, 200, 'Priya successfully updates her assignment')
      const updatedBody = await resValidUpdate.json()
      assert.equal(updatedBody.data.title, 'Poetry Analysis — Robert Frost Edition')
      assert.equal(updatedBody.data.maxMarks, 35)

      // Verify in SQLite
      const verifiedDb = await db.assignment.findUnique({ where: { id: createdAssignmentId } })
      assert.equal(verifiedDb.title, 'Poetry Analysis — Robert Frost Edition')
      assert.equal(verifiedDb.maxMarks, 35)
      console.log('  ✓ Cross-teacher edits rejected (403), valid teacher edits persist to SQLite')
    }

    // -------------------------------------------------------------------------
    // TEST 7: GET /api/lms/submissions - Teacher Scoping & Student Search
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Submissions Listing & Teacher Scoping...')
    {
      // Existing assignment for Priya: 'Essay: Impact of Climate Change'
      const priyaAssignment = await db.assignment.findFirst({
        where: { title: 'Essay: Impact of Climate Change' },
      })
      assert.ok(priyaAssignment, 'Priya assignment exists')

      // Existing assignment for Amit: 'Algebra Worksheet — Linear Equations'
      const amitAssignment = await db.assignment.findFirst({
        where: { title: 'Algebra Worksheet — Linear Equations' },
      })
      assert.ok(amitAssignment, 'Amit assignment exists')

      // Priya attempts to view submissions for Amit's assignment -> 403 Forbidden
      const reqCrossSub = new NextRequest(`http://localhost:3000/api/lms/submissions?assignmentId=${amitAssignment.id}`, {
        headers: priyaHeaders,
      })
      const resCrossSub = await listSubmissions(reqCrossSub)
      assert.equal(resCrossSub.status, 403, 'Priya cannot view submissions for Amit assignment')

      // Priya views submissions for her own assignment -> 200 OK
      const reqOwnSub = new NextRequest(`http://localhost:3000/api/lms/submissions?assignmentId=${priyaAssignment.id}`, {
        headers: priyaHeaders,
      })
      const resOwnSub = await listSubmissions(reqOwnSub)
      assert.equal(resOwnSub.status, 200, 'Priya views submissions for her assignment')
      const ownBody = await resOwnSub.json()
      assert.equal(ownBody.data.length, 6, 'Contains 6 submissions')
      assert.ok(ownBody.data[0].student.name, 'Enriched student name present')
      assert.ok(ownBody.data[0].student.admissionNo, 'Enriched admission number present')

      // Student name search in submissions
      const targetStudent = ownBody.data[0].student
      const reqSearch = new NextRequest(
        `http://localhost:3000/api/lms/submissions?assignmentId=${priyaAssignment.id}&q=${encodeURIComponent(targetStudent.admissionNo)}`,
        { headers: priyaHeaders }
      )
      const resSearch = await listSubmissions(reqSearch)
      assert.equal(resSearch.status, 200)
      const searchBody = await resSearch.json()
      assert.ok(searchBody.data.length >= 1, 'Search finds student by admission number')
      assert.equal(searchBody.data[0].student.admissionNo, targetStudent.admissionNo)
      console.log(`  ✓ Submissions scoped by assignment ownership; search by admission number '${targetStudent.admissionNo}' works`)
    }

    // -------------------------------------------------------------------------
    // TEST 8: PATCH /api/lms/submissions/[id] - Grading & Server-Side Validations
    // -------------------------------------------------------------------------
    console.log('\nTest 8: Grading Validations & Persistence...')
    {
      const priyaAssignment = await db.assignment.findFirst({
        where: { title: 'Essay: Impact of Climate Change' },
      })
      const submission = await db.submission.findFirst({
        where: { assignmentId: priyaAssignment.id, status: { in: ['SUBMITTED', 'LATE'] } },
      })
      assert.ok(submission, 'Pending submission exists')

      // Amit attempts to grade Priya's student submission -> 403 Forbidden
      const reqAmitGrade = new NextRequest(`http://localhost:3000/api/lms/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: amitHeaders,
        body: JSON.stringify({ marks: 20 }),
      })
      const resAmitGrade = await gradeSubmission(reqAmitGrade, { params: Promise.resolve({ id: submission.id }) })
      assert.equal(resAmitGrade.status, 403, 'Amit cannot grade Priya student submission')

      // Priya attempts to enter marks exceeding maxMarks (maxMarks is 25)
      const reqExceedMarks = new NextRequest(`http://localhost:3000/api/lms/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ marks: 99 }),
      })
      const resExceedMarks = await gradeSubmission(reqExceedMarks, { params: Promise.resolve({ id: submission.id }) })
      assert.equal(resExceedMarks.status, 400, 'Marks exceeding maxMarks rejected with 400')
      const exceedBody = await resExceedMarks.json()
      assert.ok(exceedBody.error.includes('cannot exceed'), 'Error explains max marks constraint')

      // Priya attempts to enter negative marks -> 400
      const reqNegMarks = new NextRequest(`http://localhost:3000/api/lms/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ marks: -5 }),
      })
      const resNegMarks = await gradeSubmission(reqNegMarks, { params: Promise.resolve({ id: submission.id }) })
      assert.equal(resNegMarks.status, 400, 'Negative marks rejected with 400')

      // Priya grades with valid marks: 23/25, Grade A, Feedback
      const originalStatus = submission.status
      const reqValidGrade = new NextRequest(`http://localhost:3000/api/lms/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({
          marks: 23,
          grade: 'A',
          feedback: 'Insightful essay structure and well-cited climate data.',
        }),
      })
      const resValidGrade = await gradeSubmission(reqValidGrade, { params: Promise.resolve({ id: submission.id }) })
      assert.equal(resValidGrade.status, 200, 'Grading succeeds')
      const gradeBody = await resValidGrade.json()
      assert.equal(gradeBody.data.marks, 23)
      assert.equal(gradeBody.data.grade, 'A')
      assert.equal(gradeBody.data.status, 'GRADED', 'Status automatically updated to GRADED')
      assert.equal(gradeBody.data.feedback, 'Insightful essay structure and well-cited climate data.')

      // Check SQLite persistence
      const gradedInDb = await db.submission.findUnique({ where: { id: submission.id } })
      assert.equal(gradedInDb.marks, 23)
      assert.equal(gradedInDb.grade, 'A')
      assert.equal(gradedInDb.status, 'GRADED')

      // Revert test submission back to original state to preserve DB integrity
      await db.submission.update({
        where: { id: submission.id },
        data: {
          marks: null,
          grade: null,
          status: originalStatus,
          feedback: null,
        },
      })
      console.log('  ✓ Grading rejects marks > maxMarks (400) & negative marks (400); persists grade & sets status=GRADED')
    }

    // -------------------------------------------------------------------------
    // TEST 9: Teacher Dashboard Synchronization
    // -------------------------------------------------------------------------
    console.log('\nTest 9: Teacher Dashboard Synchronization...')
    {
      const reqDash = new NextRequest('http://localhost:3000/api/portal/teacher', {
        headers: priyaHeaders,
      })
      const resDash = await getTeacherDashboard(reqDash)
      assert.equal(resDash.status, 200, 'Teacher dashboard loads')
      const dashBody = await resDash.json()
      const kpis = dashBody.data.kpis
      assert.ok(typeof kpis.assignmentsToGradeCount === 'number', 'assignmentsToGradeCount is a number')
      assert.equal(kpis.assignmentsToGradeCount, 6, 'Priya has 6 submissions awaiting grading across her English assignments (4 SUBMITTED + 2 LATE)')
      console.log(`  ✓ Dashboard 'Awaiting Grading' count synchronized: ${kpis.assignmentsToGradeCount} pending`)
    }

    // -------------------------------------------------------------------------
    // TEST 10: DELETE /api/lms/assignments/[id] - Clean Up
    // -------------------------------------------------------------------------
    console.log('\nTest 10: Clean up test assignment...')
    {
      if (createdAssignmentId) {
        // Amit tries to delete Priya assignment -> 403
        const reqAmitDel = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
          method: 'DELETE',
          headers: amitHeaders,
        })
        const resAmitDel = await deleteAssignment(reqAmitDel, { params: Promise.resolve({ id: createdAssignmentId }) })
        assert.equal(resAmitDel.status, 403, 'Amit cannot delete Priya assignment')

        // Priya deletes her created assignment -> 200
        const reqPriyaDel = new NextRequest(`http://localhost:3000/api/lms/assignments/${createdAssignmentId}`, {
          method: 'DELETE',
          headers: priyaHeaders,
        })
        const resPriyaDel = await deleteAssignment(reqPriyaDel, { params: Promise.resolve({ id: createdAssignmentId }) })
        assert.equal(resPriyaDel.status, 200, 'Priya deletes her test assignment')

        const verifyDeleted = await db.assignment.findUnique({ where: { id: createdAssignmentId } })
        assert.equal(verifyDeleted, null, 'Assignment removed from SQLite')
        createdAssignmentId = null
        console.log('  ✓ Test assignment deleted; unauthorized deletion rejected (403)')
      }
    }

    console.log('\n================================================================')
    console.log(' ALL 10 LMS & ASSIGNMENTS TESTS PASSED SUCCESSFULLY!')
    console.log('================================================================\n')
  } finally {
    if (createdAssignmentId) {
      await db.submission.deleteMany({ where: { assignmentId: createdAssignmentId } })
      await db.assignment.delete({ where: { id: createdAssignmentId } }).catch(() => {})
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err)
  process.exit(1)
})
