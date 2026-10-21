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
  console.log(' Phase 5: Teacher Examinations & Marks Comprehensive Test Suite')
  console.log('================================================================\n')

  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { GET: listExams, POST: createExam } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/route.ts')
  )
  const { GET: getExam, PATCH: updateExam, DELETE: deleteExam } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/[id]/route.ts')
  )
  const { GET: listSchedules, POST: createSchedule } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/schedules/route.ts')
  )
  const { PATCH: updateSchedule, DELETE: deleteSchedule } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/schedules/[id]/route.ts')
  )
  const { GET: listMarks } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/marks/route.ts')
  )
  const { GET: getMark, PATCH: updateMark, DELETE: deleteMark } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/marks/[id]/route.ts')
  )
  const { POST: bulkMarks } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/marks/bulk/route.ts')
  )
  const { POST: bulkReportCards } = await jiti.import(
    path.join(rootDir, 'src/app/api/exams/report-cards/bulk/route.ts')
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

  let testMarkStudentId: string | null = null
  let testMarkSubjectId: string | null = null
  let testMarkExamId: string | null = null

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Examination Visibility & Teacher Restriction on Exam Creation
    // -------------------------------------------------------------------------
    console.log('Test 1: Examination Listing & Creation Permissions...')
    {
      const reqList = new NextRequest('http://localhost:3000/api/exams?all=1', {
        headers: priyaHeaders,
      })
      const resList = await listExams(reqList)
      assert.equal(resList.status, 200, 'Priya can list exams')
      const body = await resList.json()
      assert.equal(body.data.length, 3, 'Priya sees the 3 school exams')

      // Teacher attempts to create a school-wide examination cycle -> 403 Forbidden
      const reqCreate = new NextRequest('http://localhost:3000/api/exams', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          name: 'Unauthorized Midterm',
          type: 'TERM',
          academicYearId: 'yr1',
          startDate: '2026-11-01',
          endDate: '2026-11-10',
        }),
      })
      const resCreate = await createExam(reqCreate)
      assert.equal(resCreate.status, 403, 'Teachers cannot create school-wide exams')
      const createBody = await resCreate.json()
      assert.ok(createBody.error.includes('Teachers do not have permission'), 'Clear permission error message')

      // Teacher attempts to edit or delete an existing exam -> 403 Forbidden
      const exam1 = body.data[0]
      const reqEdit = new NextRequest(`http://localhost:3000/api/exams/${exam1.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ name: 'Tampered Exam' }),
      })
      const resEdit = await updateExam(reqEdit, { params: Promise.resolve({ id: exam1.id }) })
      assert.equal(resEdit.status, 403, 'Teachers cannot edit school-wide exams')

      const reqDelete = new NextRequest(`http://localhost:3000/api/exams/${exam1.id}`, {
        method: 'DELETE',
        headers: priyaHeaders,
      })
      const resDelete = await deleteExam(reqDelete, { params: Promise.resolve({ id: exam1.id }) })
      assert.equal(resDelete.status, 403, 'Teachers cannot delete school-wide exams')
      console.log('  ✓ Teachers can view exams; exam creation/edit/delete restricted to administrators (403)')
    }

    // -------------------------------------------------------------------------
    // TEST 2: Exam Schedule Permissions & Subject Authorization
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Exam Schedule Listing & Paper Scheduling Permissions...')
    {
      const exam = await db.exam.findFirst({ where: { name: 'Term 2 Examination' } })
      assert.ok(exam, 'Term 2 exam exists')

      const reqSchedules = new NextRequest(`http://localhost:3000/api/exams/schedules?examId=${exam.id}`, {
        headers: priyaHeaders,
      })
      const resSchedules = await listSchedules(reqSchedules)
      assert.equal(resSchedules.status, 200, 'Can list schedules for exam')

      // Priya attempts to schedule a paper for Mathematics (Amit's subject) -> 403
      const mathSubject = await db.subject.findFirst({ where: { name: 'Mathematics' } })
      assert.ok(mathSubject, 'Math subject exists')
      const grade9 = await db.class.findFirst({ where: { name: 'Grade 9' } })

      const reqBadSchedule = new NextRequest('http://localhost:3000/api/exams/schedules', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: mathSubject.id,
          classId: grade9.id,
          date: '2026-10-14',
          startTime: '09:00',
          endTime: '12:00',
          maxMarks: 100,
          passMarks: 35,
        }),
      })
      const resBadSchedule = await createSchedule(reqBadSchedule)
      assert.equal(resBadSchedule.status, 403, 'Priya cannot schedule paper for Mathematics')
      const badSchedBody = await resBadSchedule.json()
      assert.ok(badSchedBody.error.includes('only authorized to schedule papers for your assigned subjects'))

      // Teacher attempts to delete an exam schedule -> 403
      const firstSchedule = await db.examSchedule.findFirst()
      assert.ok(firstSchedule, 'Schedule exists')
      const reqDelSchedule = new NextRequest(`http://localhost:3000/api/exams/schedules/${firstSchedule.id}`, {
        method: 'DELETE',
        headers: priyaHeaders,
      })
      const resDelSchedule = await deleteSchedule(reqDelSchedule, { params: Promise.resolve({ id: firstSchedule.id }) })
      assert.equal(resDelSchedule.status, 403, 'Teachers cannot delete exam schedules')
      console.log('  ✓ Exam schedules viewable; unauthorized paper scheduling and deletion blocked (403)')
    }

    // -------------------------------------------------------------------------
    // TEST 3: Marks Listing & Teacher Row-Level Security
    // -------------------------------------------------------------------------
    console.log('\nTest 3: Marks Scoping & Cross-Teacher Isolation in GET /api/exams/marks...')
    {
      // Total marks in DB is 300
      const totalMarksInDb = await db.mark.count()
      assert.equal(totalMarksInDb, 300, 'Database contains 300 total seeded marks')

      // Priya Nair queries marks
      const reqPriyaMarks = new NextRequest('http://localhost:3000/api/exams/marks?all=1', {
        headers: priyaHeaders,
      })
      const resPriyaMarks = await listMarks(reqPriyaMarks)
      assert.equal(resPriyaMarks.status, 200, 'Priya can list marks')
      const priyaBody = await resPriyaMarks.json()

      // Priya teaches English, so she only gets marks for her English subjects
      assert.equal(priyaBody.data.length, 50, 'Priya sees exactly 50 marks for her English subjects')

      // Amit Verma queries marks
      const reqAmitMarks = new NextRequest('http://localhost:3000/api/exams/marks?all=1', {
        headers: amitHeaders,
      })
      const resAmitMarks = await listMarks(reqAmitMarks)
      assert.equal(resAmitMarks.status, 200, 'Amit can list marks')
      const amitBody = await resAmitMarks.json()
      assert.equal(amitBody.data.length, 50, 'Amit sees exactly 50 marks for his Math subjects')

      // Verify no overlap: Priya does not see any of Amit's marks
      const priyaMarkIds = new Set(priyaBody.data.map((m: any) => m.id))
      const amitHasPriyaMark = amitBody.data.some((m: any) => priyaMarkIds.has(m.id))
      assert.equal(amitHasPriyaMark, false, 'Zero overlap between Priya and Amit marks')

      // Admin queries marks -> sees all 300 marks
      const reqAdminMarks = new NextRequest('http://localhost:3000/api/exams/marks?all=1', {
        headers: adminHeaders,
      })
      const resAdminMarks = await listMarks(reqAdminMarks)
      const adminBody = await resAdminMarks.json()
      assert.equal(adminBody.data.length, 300, 'Admin sees all 300 campus marks')
      console.log('  ✓ Priya sees 50 English marks, Amit sees 50 Math marks, Admin sees all 300 marks')
    }

    // -------------------------------------------------------------------------
    // TEST 4: Bulk Marks Validations & Teacher Authorization
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Bulk Marks Entry Validations...')
    {
      const exam = await db.exam.findFirst({ where: { name: 'Unit Test 1' } })
      assert.ok(exam, 'Exam exists')
      const mathSubject = await db.subject.findFirst({ where: { name: 'Mathematics' } })
      const priyaEmployee = await db.employee.findFirst({ where: { firstName: 'Priya', lastName: 'Nair' } })
      const englishSubject = await db.subject.findFirst({ where: { teacherId: priyaEmployee.id } })
      const sampleStudent = await db.student.findFirst({ where: { classId: englishSubject.classId } })

      // Priya attempts to enter marks for Mathematics -> 403 Forbidden
      const reqUnauthorizedMath = new NextRequest('http://localhost:3000/api/exams/marks/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: mathSubject.id,
          maxMarks: 100,
          entries: [{ studentId: sampleStudent.id, marksObtained: 80 }],
        }),
      })
      const resUnauthorizedMath = await bulkMarks(reqUnauthorizedMath)
      assert.equal(resUnauthorizedMath.status, 403, 'Priya cannot enter marks for Math')
      const mathBody = await resUnauthorizedMath.json()
      assert.ok(mathBody.error.includes('not authorized to enter marks for this subject'))

      // Marks exceeding maxMarks -> 400 Bad Request
      const reqExceedMarks = new NextRequest('http://localhost:3000/api/exams/marks/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: englishSubject.id,
          maxMarks: 50,
          entries: [{ studentId: sampleStudent.id, marksObtained: 75 }],
        }),
      })
      const resExceedMarks = await bulkMarks(reqExceedMarks)
      assert.equal(resExceedMarks.status, 400, 'Marks exceeding maxMarks rejected with 400')
      const exceedBody = await resExceedMarks.json()
      assert.ok(exceedBody.error.includes('cannot exceed the maximum allowed marks'))

      // Negative marks -> 400 Bad Request
      const reqNegMarks = new NextRequest('http://localhost:3000/api/exams/marks/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: englishSubject.id,
          maxMarks: 100,
          entries: [{ studentId: sampleStudent.id, marksObtained: -10 }],
        }),
      })
      const resNegMarks = await bulkMarks(reqNegMarks)
      assert.equal(resNegMarks.status, 400, 'Negative marks rejected with 400')
      console.log('  ✓ Unauthorized subjects (403), marks > maxMarks (400), and negative marks (400) rejected')
    }

    // -------------------------------------------------------------------------
    // TEST 5: Authorized Marks Saving, Upsert, and Absent Student Handling
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Authorized Marks Saving & Upsert Guarantee...')
    {
      const exam = await db.exam.findFirst({ where: { name: 'Term 2 Examination' } })
      assert.ok(exam, 'Term 2 exam exists')
      const priyaEmployee = await db.employee.findFirst({ where: { firstName: 'Priya', lastName: 'Nair' } })
      const englishSubject = await db.subject.findFirst({ where: { teacherId: priyaEmployee.id } })
      const students = await db.student.findMany({ where: { classId: englishSubject.classId }, take: 2 })
      assert.equal(students.length, 2, 'Found 2 students for test')

      testMarkStudentId = students[0].id
      testMarkSubjectId = englishSubject.id
      testMarkExamId = exam.id

      // Priya enters marks for 2 students: one scored 85, one marked absent
      const reqValidBulk = new NextRequest('http://localhost:3000/api/exams/marks/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: englishSubject.id,
          maxMarks: 100,
          entries: [
            { studentId: students[0].id, marksObtained: 85, isAbsent: false },
            { studentId: students[1].id, marksObtained: 0, isAbsent: true },
          ],
        }),
      })
      const resValidBulk = await bulkMarks(reqValidBulk)
      assert.equal(resValidBulk.status, 200, 'Marks saved successfully')
      const bulkBody = await resValidBulk.json()
      assert.equal(bulkBody.data.saved, 2, 'Saved 2 marks records')

      // Direct SQLite check: verify persistence, auto-grade, and absent status
      const mark1 = await db.mark.findUnique({
        where: { examId_studentId_subjectId: { examId: exam.id, studentId: students[0].id, subjectId: englishSubject.id } },
      })
      assert.ok(mark1, 'Student 1 mark persisted in SQLite')
      assert.equal(mark1.marksObtained, 85)
      assert.equal(mark1.grade, 'A', 'Auto-calculated grade is A for 85%')
      assert.equal(mark1.isAbsent, false)
      assert.equal(mark1.enteredById, priyaEmployee.id, 'EnteredById bound to Priya employee ID')

      const mark2 = await db.mark.findUnique({
        where: { examId_studentId_subjectId: { examId: exam.id, studentId: students[1].id, subjectId: englishSubject.id } },
      })
      assert.ok(mark2, 'Student 2 mark persisted in SQLite')
      assert.equal(mark2.isAbsent, true)
      assert.equal(mark2.marksObtained, 0)
      assert.equal(mark2.grade, 'F')

      // Test Upsert Guarantee: Re-submit with updated score for student 1 (92 -> A+)
      const reqUpdateBulk = new NextRequest('http://localhost:3000/api/exams/marks/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          subjectId: englishSubject.id,
          maxMarks: 100,
          entries: [
            { studentId: students[0].id, marksObtained: 92, isAbsent: false },
          ],
        }),
      })
      const resUpdateBulk = await bulkMarks(reqUpdateBulk)
      assert.equal(resUpdateBulk.status, 200)

      const updatedMark1 = await db.mark.findUnique({
        where: { examId_studentId_subjectId: { examId: exam.id, studentId: students[0].id, subjectId: englishSubject.id } },
      })
      assert.equal(updatedMark1.marksObtained, 92)
      assert.equal(updatedMark1.grade, 'A+', 'Grade updated to A+ for 92%')

      // Verify no duplicate record created
      const countForStudent = await db.mark.count({
        where: { examId: exam.id, studentId: students[0].id, subjectId: englishSubject.id },
      })
      assert.equal(countForStudent, 1, 'Exact 1 record persists (zero duplicates)')
      console.log('  ✓ Bulk marks persist to SQLite, auto-assign grades, and update in place with zero duplicates')
    }

    // -------------------------------------------------------------------------
    // TEST 6: Single Mark Record Detail, Edit, and Permissions
    // -------------------------------------------------------------------------
    console.log('\nTest 6: Single Mark Record Detail & Edit Permissions...')
    {
      const mark = await db.mark.findUnique({
        where: {
          examId_studentId_subjectId: {
            examId: testMarkExamId!,
            studentId: testMarkStudentId!,
            subjectId: testMarkSubjectId!,
          },
        },
      })
      assert.ok(mark, 'Mark record exists')

      // Amit attempts to view Priya's mark record -> 403 Forbidden
      const reqAmitView = new NextRequest(`http://localhost:3000/api/exams/marks/${mark.id}`, {
        headers: amitHeaders,
      })
      const resAmitView = await getMark(reqAmitView, { params: Promise.resolve({ id: mark.id }) })
      assert.equal(resAmitView.status, 403, 'Amit cannot view Priya mark')

      // Amit attempts to update Priya's mark record -> 403 Forbidden
      const reqAmitEdit = new NextRequest(`http://localhost:3000/api/exams/marks/${mark.id}`, {
        method: 'PATCH',
        headers: amitHeaders,
        body: JSON.stringify({ marksObtained: 50 }),
      })
      const resAmitEdit = await updateMark(reqAmitEdit, { params: Promise.resolve({ id: mark.id }) })
      assert.equal(resAmitEdit.status, 403, 'Amit cannot edit Priya mark')

      // Priya updates her mark with invalid marks (> maxMarks) -> 400 Bad Request
      const reqPriyaExceed = new NextRequest(`http://localhost:3000/api/exams/marks/${mark.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ marksObtained: 150 }),
      })
      const resPriyaExceed = await updateMark(reqPriyaExceed, { params: Promise.resolve({ id: mark.id }) })
      assert.equal(resPriyaExceed.status, 400, 'Rejects marks > maxMarks')

      // Priya updates her mark with valid marks (72 -> B+) -> 200 OK
      const reqPriyaValid = new NextRequest(`http://localhost:3000/api/exams/marks/${mark.id}`, {
        method: 'PATCH',
        headers: priyaHeaders,
        body: JSON.stringify({ marksObtained: 72 }),
      })
      const resPriyaValid = await updateMark(reqPriyaValid, { params: Promise.resolve({ id: mark.id }) })
      assert.equal(resPriyaValid.status, 200, 'Priya successfully updates mark')
      const validBody = await resPriyaValid.json()
      assert.equal(validBody.data.marksObtained, 72)
      assert.equal(validBody.data.grade, 'B+', 'Grade recalculated to B+')

      // Amit attempts to delete Priya mark -> 403 Forbidden
      const reqAmitDelete = new NextRequest(`http://localhost:3000/api/exams/marks/${mark.id}`, {
        method: 'DELETE',
        headers: amitHeaders,
      })
      const resAmitDelete = await deleteMark(reqAmitDelete, { params: Promise.resolve({ id: mark.id }) })
      assert.equal(resAmitDelete.status, 403, 'Amit cannot delete Priya mark')
      console.log('  ✓ Cross-teacher mark access blocked (403); valid teacher edit recalculated grade to B+')
    }

    // -------------------------------------------------------------------------
    // TEST 7: Report Card Publication Authorization
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Report Card Finalization & Publication Permissions...')
    {
      const exam = await db.exam.findFirst({ where: { name: 'Term 2 Examination' } })
      assert.ok(exam, 'Exam exists')

      // Subject teacher attempts to publish finalized report cards -> 403 Forbidden
      const reqTeacherPublish = new NextRequest('http://localhost:3000/api/exams/report-cards/bulk', {
        method: 'POST',
        headers: priyaHeaders,
        body: JSON.stringify({
          examId: exam.id,
          rows: [{ studentId: testMarkStudentId, totalMarks: 100, obtained: 85, percentage: 85, grade: 'A' }],
        }),
      })
      const resTeacherPublish = await bulkReportCards(reqTeacherPublish)
      assert.equal(resTeacherPublish.status, 403, 'Subject teacher cannot publish finalized report cards')
      const pubBody = await resTeacherPublish.json()
      assert.ok(pubBody.error.includes('Only school administrators and principals can publish'))
      console.log('  ✓ Subject teachers cannot finalize or publish school-wide report cards (403)')
    }

    // -------------------------------------------------------------------------
    // TEST 8: Teacher Dashboard Upcoming Exams KPI
    // -------------------------------------------------------------------------
    console.log('\nTest 8: Teacher Dashboard Upcoming Exams Synchronization...')
    {
      const reqDash = new NextRequest('http://localhost:3000/api/portal/teacher', {
        headers: priyaHeaders,
      })
      const resDash = await getTeacherDashboard(reqDash)
      assert.equal(resDash.status, 200, 'Teacher dashboard loads')
      const dashBody = await resDash.json()
      const kpis = dashBody.data.kpis
      assert.ok(typeof kpis.upcomingExamsCount === 'number', 'upcomingExamsCount is a number')
      assert.equal(kpis.upcomingExamsCount, 1, 'Priya has 1 upcoming exam (Term 2 Examination for Grade 8 and Grade 9)')
      console.log(`  ✓ Dashboard 'Upcoming Exams' KPI accurately synchronized: ${kpis.upcomingExamsCount} active exam`)
    }

    // -------------------------------------------------------------------------
    // TEST 9: Clean up test marks to preserve SQLite database state
    // -------------------------------------------------------------------------
    console.log('\nTest 9: Cleaning up test mark records...')
    {
      if (testMarkExamId && testMarkSubjectId) {
        await db.mark.deleteMany({
          where: { examId: testMarkExamId, subjectId: testMarkSubjectId },
        })
        const remaining = await db.mark.count({
          where: { examId: testMarkExamId, subjectId: testMarkSubjectId },
        })
        assert.equal(remaining, 0, 'Test marks cleaned up')
        console.log('  ✓ SQLite database returned to original clean state')
      }
    }

    console.log('\n================================================================')
    console.log(' ALL 9 EXAMINATIONS & MARKS TESTS PASSED SUCCESSFULLY!')
    console.log('================================================================\n')
  } finally {
    if (testMarkExamId && testMarkSubjectId) {
      await db.mark.deleteMany({
        where: { examId: testMarkExamId, subjectId: testMarkSubjectId },
      }).catch(() => {})
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err)
  process.exit(1)
})
