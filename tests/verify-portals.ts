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

async function runTests() {
  console.log('================================================================')
  console.log(' Student & Parent Portals Comprehensive Test Suite')
  console.log('================================================================\n')

  const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
  const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))
  const { GET: getStudentPortal } = await jiti.import(path.join(rootDir, 'src/app/api/portal/student/route.ts'))
  const { POST: postStudentLeave } = await jiti.import(path.join(rootDir, 'src/app/api/portal/student/leave/route.ts'))
  const { POST: postStudentSubmit } = await jiti.import(path.join(rootDir, 'src/app/api/portal/student/submit/route.ts'))
  const { GET: getParentPortal, POST: postParentPortal } = await jiti.import(path.join(rootDir, 'src/app/api/portal/parent/route.ts'))
  const { POST: postParentLeave } = await jiti.import(path.join(rootDir, 'src/app/api/portal/parent/leave/route.ts'))
  const { POST: postParentPay } = await jiti.import(path.join(rootDir, 'src/app/api/portal/parent/pay/route.ts'))
  const { NextRequest } = await import('next/server.js')

  // ── TEST 1: Student Portal GET ──
  console.log('[Test 1] Student Portal GET Payload...')
  const studentUser = await db.user.findFirst({
    where: { email: 'student@nis.edu.in', role: 'STUDENT' },
  })
  assert.ok(studentUser, 'Student user student@nis.edu.in must exist')

  const studentToken = await signSession({
    sub: studentUser.id,
    name: studentUser.name,
    email: studentUser.email,
    role: 'STUDENT',
    schoolId: studentUser.schoolId || 'main',
    studentId: studentUser.linkedStudentId,
    parentId: null,
    employeeId: null,
  })

  const reqStudent = new NextRequest('http://localhost:3000/api/portal/student', {
    headers: { cookie: `erp_session=${studentToken}` },
  })
  const resStudent = await getStudentPortal(reqStudent)
  const studentJson = await resStudent.json()
  assert.equal(resStudent.status, 200, `Student portal status should be 200: ${JSON.stringify(studentJson)}`)
  assert.ok(studentJson.profile, 'Should contain profile')
  assert.ok(studentJson.timetable, 'Should contain timetable')
  assert.ok(studentJson.attendance, 'Should contain attendance')
  assert.ok(studentJson.homework, 'Should contain homework')
  console.log(`  ✓ Student profile: ${studentJson.profile.name} (${studentJson.profile.className || 'No class'})`)
  console.log(`  ✓ Attendance: ${studentJson.attendance.pct}%, Homework count: ${studentJson.homework.length}`)

  // ── TEST 2: Student Leave Application ──
  console.log('\n[Test 2] Student Leave Application...')
  const reqStudentLeave = new NextRequest('http://localhost:3000/api/portal/student/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `erp_session=${studentToken}` },
    body: JSON.stringify({
      type: 'SICK',
      fromDate: new Date(Date.now() + 86400000).toISOString(),
      toDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      reason: 'Fever and viral cold, doctor advised rest.',
    }),
  })
  const resStudentLeave = await postStudentLeave(reqStudentLeave)
  const studentLeaveJson = await resStudentLeave.json()
  assert.equal(resStudentLeave.status, 201, `Student leave should return 201: ${JSON.stringify(studentLeaveJson)}`)
  assert.ok(studentLeaveJson.data?.id, 'Leave request row created')
  console.log(`  ✓ Student leave request created: ID ${studentLeaveJson.data.id}`)

  // ── TEST 3: Student Homework Submission ──
  console.log('\n[Test 3] Student Homework Submission...')
  if (studentJson.homework && studentJson.homework.length > 0) {
    const hw = studentJson.homework[0]
    const reqSubmit = new NextRequest('http://localhost:3000/api/portal/student/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `erp_session=${studentToken}` },
      body: JSON.stringify({
        assignmentId: hw.id,
        contentText: 'Completed all linear equation problems. All steps are clearly derived and verified.',
      }),
    })
    const resSubmit = await postStudentSubmit(reqSubmit)
    const submitJson = await resSubmit.json()
    assert.ok(resSubmit.status === 200 || resSubmit.status === 201, `Submission status: ${resSubmit.status}`)
    assert.ok(submitJson.data?.id, 'Submission recorded')
    console.log(`  ✓ Student homework submission verified for "${hw.title}"`)
  }

  // ── TEST 4: Parent Portal GET ──
  console.log('\n[Test 4] Parent Portal GET Payload...')
  const parentUser = await db.user.findFirst({
    where: { email: 'parent@nis.edu.in', role: 'PARENT' },
  })
  assert.ok(parentUser, 'Parent user parent@nis.edu.in must exist')

  const parentToken = await signSession({
    sub: parentUser.id,
    name: parentUser.name,
    email: parentUser.email,
    role: 'PARENT',
    schoolId: parentUser.schoolId || 'main',
    studentId: null,
    parentId: parentUser.linkedParentId,
    employeeId: null,
  })

  const reqParent = new NextRequest('http://localhost:3000/api/portal/parent', {
    headers: { cookie: `erp_session=${parentToken}` },
  })
  const resParent = await getParentPortal(reqParent)
  const parentJson = await resParent.json()
  assert.equal(resParent.status, 200, `Parent portal status should be 200: ${JSON.stringify(parentJson)}`)
  assert.ok(parentJson.parent, 'Should contain parent details')
  assert.ok(Array.isArray(parentJson.children), 'Should contain children array')
  assert.ok(parentJson.children.length > 0, 'Parent must have at least one child linked')
  const child = parentJson.children[0]
  console.log(`  ✓ Parent: ${parentJson.parent.name}, Child: ${child.name}`)
  console.log(`  ✓ Timetable entries: ${child.timetable?.length}, Invoices: ${child.invoices?.length}`)

  // ── TEST 5: Parent Portal POST Actions ──
  console.log('\n[Test 5] Parent Portal POST Actions (Medical, Certificate, Document)...')
  
  // 5a. Save Medical
  const reqMedical = new NextRequest('http://localhost:3000/api/portal/parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `erp_session=${parentToken}` },
    body: JSON.stringify({
      action: 'save_medical',
      studentId: child.student.id,
      bloodGroup: 'B+',
      allergies: 'Peanuts',
      conditions: 'None',
      medication: 'None',
      emergencyContact: '+91 98765 43210',
    }),
  })
  const resMedical = await postParentPortal(reqMedical)
  const medicalJson = await resMedical.json()
  assert.equal(resMedical.status, 200, `Medical save should return 200: ${JSON.stringify(medicalJson)}`)
  console.log('  ✓ Medical information saved successfully')

  // 5b. Request Certificate
  const reqCert = new NextRequest('http://localhost:3000/api/portal/parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `erp_session=${parentToken}` },
    body: JSON.stringify({
      action: 'request_certificate',
      studentId: child.student.id,
      type: 'BONAFIDE',
      purpose: 'Passport Application',
    }),
  })
  const resCert = await postParentPortal(reqCert)
  const certJson = await resCert.json()
  assert.equal(resCert.status, 200, `Certificate request should return 200: ${JSON.stringify(certJson)}`)
  console.log('  ✓ Certificate requested successfully')

  // 5c. Upload Document
  const reqDoc = new NextRequest('http://localhost:3000/api/portal/parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `erp_session=${parentToken}` },
    body: JSON.stringify({
      action: 'upload_document',
      studentId: child.student.id,
      document: {
        name: 'Immunization_Record.pdf',
        type: 'MEDICAL',
        size: '1.4 MB',
        url: 'https://example.com/docs/immunization.pdf',
      },
    }),
  })
  const resDoc = await postParentPortal(reqDoc)
  const docJson = await resDoc.json()
  assert.equal(resDoc.status, 200, `Document upload should return 200: ${JSON.stringify(docJson)}`)
  console.log('  ✓ Document uploaded successfully')

  // ── TEST 6: Parent Fee Payment ──
  console.log('\n[Test 6] Parent Fee Payment...')
  const unpaidInvoice = child.invoices?.find((i: any) => i.status !== 'PAID' && i.due > 0)
  if (unpaidInvoice) {
    const reqPay = new NextRequest('http://localhost:3000/api/portal/parent/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `erp_session=${parentToken}` },
      body: JSON.stringify({
        invoiceId: unpaidInvoice.id,
        method: 'UPI',
      }),
    })
    const resPay = await postParentPay(reqPay)
    const payJson = await resPay.json()
    assert.ok(resPay.status === 200 || resPay.status === 201, `Fee payment status: ${resPay.status}`)
    const receiptNo = payJson.receiptNo || payJson.data?.receiptNo
    assert.ok(receiptNo, 'Payment receipt generated')
    console.log(`  ✓ Fee payment processed successfully: Receipt ${receiptNo}, Amount: ₹${payJson.payment?.amount || payJson.data?.amount}`)
  } else {
    console.log('  (No unpaid invoice available for test child, skipping live payment test)')
  }

  // ── TEST 7: Parent Leave Request ──
  console.log('\n[Test 7] Parent Leave Request...')
  const reqParentLeave = new NextRequest('http://localhost:3000/api/portal/parent/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `erp_session=${parentToken}` },
    body: JSON.stringify({
      requesterId: child.student.id,
      type: 'CASUAL',
      fromDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      toDate: new Date(Date.now() + 4 * 86400000).toISOString(),
      reason: 'Attending family wedding ceremony out of town.',
    }),
  })
  const resParentLeave = await postParentLeave(reqParentLeave)
  const parentLeaveJson = await resParentLeave.json()
  assert.equal(resParentLeave.status, 201, `Parent leave should return 201: ${JSON.stringify(parentLeaveJson)}`)
  console.log(`  ✓ Parent submitted leave request successfully: ID ${parentLeaveJson.data?.id}`)

  console.log('\n================================================================')
  console.log(' Summary: ALL Student & Parent Portals Tests PASSED SUCCESSFULLY!')
  console.log('================================================================')
}

runTests().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
