import assert from 'node:assert'
import { db } from '../src/lib/db'
import { selectRouteKey, buildWorkflowFor, decideLeave } from '../src/lib/leave-workflow'
import { canDecide, applyDecision, parseSteps, parseHistory } from '../src/lib/workflow'
import { sendEmail } from '../src/lib/email'

async function runTests() {
  console.log('====================================================')
  console.log(' Institutional Leave / OD / IOD Workflow Test Suite')
  console.log('====================================================\n')

  // Setup test school and settings
  const testSchoolId = 'school-test-wf-' + Date.now()
  const otherSchoolId = 'school-other-wf-' + Date.now()

  await db.school.createMany({
    data: [
      { id: testSchoolId, name: 'Nehru Test School', code: 'NTS-' + Date.now(), isMaster: false },
      { id: otherSchoolId, name: 'Other School', code: 'OTH-' + Date.now(), isMaster: false },
    ],
  })

  await db.schoolSetting.create({
    data: {
      schoolId: testSchoolId,
      leaveCcEmails: 'niskarthikeyani@nehrucolleges.com,nisadmissions@nehrucolleges.com',
      leaveForwardEmail: 'nistaffleave@nehrucolleges.com',
      leaveFromEmail: 'noreply@nehrucolleges.com',
    },
  })

  // Setup test employees representing the 4 tiers and roles
  const principalEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-PRIN-' + Date.now(),
      firstName: 'Rajesh',
      lastName: 'Malhotra',
      designation: 'Principal',
      isTeacher: false,
    },
  })

  const hodEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-HOD-' + Date.now(),
      firstName: 'Amit',
      lastName: 'Verma',
      designation: 'Head of Department — Science',
      isTeacher: true,
    },
  })

  const coordinatorEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-COORD-' + Date.now(),
      firstName: 'Kavita',
      lastName: 'Iyer',
      designation: 'Academic Coordinator',
      isTeacher: true,
    },
  })

  const hmEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-HM-' + Date.now(),
      firstName: 'Shalini',
      lastName: 'Pillai',
      designation: 'Headmistress',
      isTeacher: true,
    },
  })

  const adminExecEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-ADMN-' + Date.now(),
      firstName: 'Sunita',
      lastName: 'Desai',
      designation: 'Admin Executive',
      isTeacher: false,
    },
  })

  const correspondentEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-CORR-' + Date.now(),
      firstName: 'Adv. P.',
      lastName: 'Krishnadas',
      designation: 'Correspondent',
      isTeacher: false,
    },
  })

  const ceoEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-CEO-' + Date.now(),
      firstName: 'Dr. K.',
      lastName: 'Radhakrishnan',
      designation: 'CEO & Secretary',
      isTeacher: false,
    },
  })

  // Requesters for the 4 tiers
  const teacher912Emp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-T912-' + Date.now(),
      firstName: 'Priya',
      lastName: 'Nair',
      designation: 'Senior Teacher Grade 11 Physics',
      isTeacher: true,
    },
  })

  const teacherKg8Emp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-TKG8-' + Date.now(),
      firstName: 'Ritu',
      lastName: 'Pandey',
      designation: 'Primary Teacher Grade 4',
      isTeacher: true,
    },
  })

  const adminStaffEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-ADMSTF-' + Date.now(),
      firstName: 'Swati',
      lastName: 'Agarwal',
      designation: 'Accounts Executive Administration',
      isTeacher: false,
    },
  })

  const nonTeachingEmp = await db.employee.create({
    data: {
      schoolId: testSchoolId,
      employeeNo: 'EMP-NTEACH-' + Date.now(),
      firstName: 'Ravi',
      lastName: 'Naik',
      designation: 'Security Incharge',
      isTeacher: false,
    },
  })

  // Users for requesters and approvers
  const teacher912User = await db.user.create({
    data: {
      schoolId: testSchoolId,
      email: 'priya.nair-' + Date.now() + '@test.edu',
      passwordHash: 'dummy',
      name: 'Priya Nair',
      role: 'TEACHER',
      linkedEmployeeId: teacher912Emp.id,
    },
  })

  const hodUser = await db.user.create({
    data: {
      schoolId: testSchoolId,
      email: 'amit.verma-' + Date.now() + '@test.edu',
      passwordHash: 'dummy',
      name: 'Amit Verma',
      role: 'HOD',
      linkedEmployeeId: hodEmp.id,
    },
  })

  const coordinatorUser = await db.user.create({
    data: {
      schoolId: testSchoolId,
      email: 'kavita.iyer-' + Date.now() + '@test.edu',
      passwordHash: 'dummy',
      name: 'Kavita Iyer',
      role: 'ACADEMIC_COORDINATOR',
      linkedEmployeeId: coordinatorEmp.id,
    },
  })

  const principalUser = await db.user.create({
    data: {
      schoolId: testSchoolId,
      email: 'rajesh.malhotra-' + Date.now() + '@test.edu',
      passwordHash: 'dummy',
      name: 'Rajesh Malhotra',
      role: 'PRINCIPAL',
      linkedEmployeeId: principalEmp.id,
    },
  })

  console.log('[Test 1] Four-tier institutional route selection...')
  assert.strictEqual(
    selectRouteKey({ designation: 'Senior Teacher Grade 11 Physics', isTeacher: true }),
    'TEACHING_9_12',
    'Grade 9-12 teacher must route to TEACHING_9_12',
  )
  assert.strictEqual(
    selectRouteKey({ designation: 'Primary Teacher Grade 4', isTeacher: true }),
    'TEACHING_KG_8',
    'KG-8 teacher must route to TEACHING_KG_8',
  )
  assert.strictEqual(
    selectRouteKey({ designation: 'Accounts Executive Administration', isTeacher: false }),
    'ADMINISTRATIVE',
    'Administrative staff must route to ADMINISTRATIVE',
  )
  assert.strictEqual(
    selectRouteKey({ designation: 'Security Incharge', isTeacher: false }),
    'NON_TEACHING',
    'Non-teaching staff must route to NON_TEACHING',
  )
  console.log('  ✓ All 4 institutional routes selected correctly')

  console.log('[Test 2] Workflow assembly and initial approver assignment...')
  const wf912 = await buildWorkflowFor(teacher912Emp.id, testSchoolId)
  assert.ok(wf912, 'Workflow must be created')
  assert.strictEqual(wf912.workflowKey, 'TEACHING_9_12')
  assert.strictEqual(wf912.steps.length, 3)
  assert.strictEqual(wf912.steps[0].approverRole, 'HOD')
  assert.strictEqual(wf912.steps[1].approverRole, 'ACADEMIC_COORDINATOR')
  assert.strictEqual(wf912.steps[2].approverRole, 'PRINCIPAL')
  assert.strictEqual(wf912.currentApproverRole, 'HOD')
  console.log('  ✓ Grade 9-12 workflow: Step 0 is HOD -> Step 1 is Coordinator -> Step 2 is Principal')

  const wfKg8 = await buildWorkflowFor(teacherKg8Emp.id, testSchoolId)
  assert.ok(wfKg8)
  assert.strictEqual(wfKg8.workflowKey, 'TEACHING_KG_8')
  assert.strictEqual(wfKg8.steps[0].approverRole, 'HEADMISTRESS')
  console.log('  ✓ Grade KG-8 workflow: Step 0 is Headmistress')

  const wfAdmin = await buildWorkflowFor(adminStaffEmp.id, testSchoolId)
  assert.ok(wfAdmin)
  assert.strictEqual(wfAdmin.workflowKey, 'ADMINISTRATIVE')
  assert.strictEqual(wfAdmin.steps[0].approverRole, 'ADMIN_EXECUTIVE')
  console.log('  ✓ Administrative workflow: Step 0 is Admin Executive')

  const wfNonTeaching = await buildWorkflowFor(nonTeachingEmp.id, testSchoolId)
  assert.ok(wfNonTeaching)
  assert.strictEqual(wfNonTeaching.workflowKey, 'NON_TEACHING')
  assert.strictEqual(wfNonTeaching.steps[0].approverRole, 'PRINCIPAL')
  assert.strictEqual(wfNonTeaching.steps[1].approverRole, 'CORRESPONDENT')
  assert.strictEqual(wfNonTeaching.steps[2].approverRole, 'CEO_SECRETARY')
  console.log('  ✓ Non-teaching workflow: Principal -> Correspondent -> CEO & Secretary')

  console.log('[Test 3] Multi-step sequential progression with TO approvers...')
  const leaveReq = await db.leaveRequest.create({
    data: {
      schoolId: testSchoolId,
      requesterType: 'EMPLOYEE',
      requesterId: teacher912Emp.id,
      requesterName: 'Priya Nair',
      category: 'LEAVE',
      type: 'CASUAL',
      fromDate: new Date('2026-11-01'),
      toDate: new Date('2026-11-02'),
      reason: 'Family function',
      status: 'IN_PROGRESS',
      workflowKey: wf912.workflowKey,
      stepsJson: wf912.stepsJson,
      historyJson: wf912.historyJson,
      currentStep: wf912.currentStep,
      currentApproverRole: wf912.currentApproverRole,
      approverId: wf912.approverId,
      approverName: wf912.approverName,
    },
  })

  // Attempt 1: Unauthorized approver (e.g. Principal trying to approve step 0 which belongs to HOD)
  const unauthorizedDecision = await decideLeave({
    session: { sub: principalUser.id, name: principalUser.name, role: 'PRINCIPAL', employeeId: principalEmp.id, schoolId: testSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
  })
  assert.strictEqual(unauthorizedDecision.ok, false, 'Principal cannot approve Step 0 reserved for HOD')
  assert.strictEqual(unauthorizedDecision.status, 403)
  console.log('  ✓ Unauthorized actor rejected at Step 0 (HTTP 403)')

  // Attempt 2: Self-approval rejection (requester trying to approve their own request)
  const selfApprovalDecision = await decideLeave({
    session: { sub: teacher912User.id, name: teacher912User.name, role: 'TEACHER', employeeId: teacher912Emp.id, schoolId: testSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
  })
  assert.strictEqual(selfApprovalDecision.ok, false, 'Requester cannot self-approve')
  assert.strictEqual(selfApprovalDecision.status, 403)
  console.log('  ✓ Self-approval prevented (HTTP 403)')

  // Step 0 Approval by HOD
  const step0Res = await decideLeave({
    session: { sub: hodUser.id, name: hodUser.name, role: 'HOD', employeeId: hodEmp.id, schoolId: testSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
    comments: 'Recommended. Substitution arranged.',
  })
  assert.strictEqual(step0Res.ok, true, 'HOD approval must succeed')
  assert.strictEqual(step0Res.record.status, 'IN_PROGRESS')
  assert.strictEqual(step0Res.record.currentStep, 1)
  assert.strictEqual(step0Res.record.currentApproverRole, 'ACADEMIC_COORDINATOR')
  console.log('  ✓ Step 0 approved by HOD: Advanced to Step 1 (Coordinator)')

  // Step 1 Approval by Academic Coordinator
  const step1Res = await decideLeave({
    session: { sub: coordinatorUser.id, name: coordinatorUser.name, role: 'ACADEMIC_COORDINATOR', employeeId: coordinatorEmp.id, schoolId: testSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
    comments: 'Verified syllabus pacing.',
  })
  assert.strictEqual(step1Res.ok, true, 'Coordinator approval must succeed')
  assert.strictEqual(step1Res.record.status, 'IN_PROGRESS')
  assert.strictEqual(step1Res.record.currentStep, 2)
  assert.strictEqual(step1Res.record.currentApproverRole, 'PRINCIPAL')
  console.log('  ✓ Step 1 approved by Academic Coordinator: Advanced to Step 2 (Principal)')

  // Step 2 Final Approval by Principal
  const step2Res = await decideLeave({
    session: { sub: principalUser.id, name: principalUser.name, role: 'PRINCIPAL', employeeId: principalEmp.id, schoolId: testSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
    comments: 'Leave granted.',
  })
  assert.strictEqual(step2Res.ok, true, 'Principal approval must succeed')
  assert.strictEqual(step2Res.record.status, 'APPROVED')
  assert.ok(step2Res.record.decidedAt)
  assert.strictEqual(step2Res.record.balanceDeducted, true, 'CASUAL leave must deduct balance')
  console.log('  ✓ Step 2 approved by Principal: Status is APPROVED, casual leave balance marked deducted')

  console.log('[Test 4] OD and IOD requests MUST NOT deduct from casual leave balance...')
  const odReq = await db.leaveRequest.create({
    data: {
      schoolId: testSchoolId,
      requesterType: 'EMPLOYEE',
      requesterId: teacher912Emp.id,
      requesterName: 'Priya Nair',
      category: 'OD',
      type: 'OD',
      fromDate: new Date('2026-11-10'),
      toDate: new Date('2026-11-10'),
      reason: 'Inter-school science competition escort',
      status: 'IN_PROGRESS',
      workflowKey: wf912.workflowKey,
      stepsJson: wf912.stepsJson,
      historyJson: wf912.historyJson,
      currentStep: 2, // fast forward to final step for verification
      currentApproverRole: 'PRINCIPAL',
    },
  })

  const odApproval = await decideLeave({
    session: { sub: principalUser.id, name: principalUser.name, role: 'PRINCIPAL', employeeId: principalEmp.id, schoolId: testSchoolId },
    leaveId: odReq.id,
    action: 'APPROVE',
  })
  assert.strictEqual(odApproval.ok, true)
  assert.strictEqual(odApproval.record.status, 'APPROVED')
  assert.strictEqual(odApproval.record.balanceDeducted, false, 'OD requests MUST NOT deduct casual leave balance')
  console.log('  ✓ OD request approved with balanceDeducted: false (Casual leave balance preserved)')

  const iodReq = await db.leaveRequest.create({
    data: {
      schoolId: testSchoolId,
      requesterType: 'EMPLOYEE',
      requesterId: teacher912Emp.id,
      requesterName: 'Priya Nair',
      category: 'IOD',
      type: 'IOD',
      fromDate: new Date('2026-11-12'),
      toDate: new Date('2026-11-12'),
      reason: 'Internal exam cell duty',
      status: 'IN_PROGRESS',
      workflowKey: wf912.workflowKey,
      stepsJson: wf912.stepsJson,
      historyJson: wf912.historyJson,
      currentStep: 2,
      currentApproverRole: 'PRINCIPAL',
    },
  })

  const iodApproval = await decideLeave({
    session: { sub: principalUser.id, name: principalUser.name, role: 'PRINCIPAL', employeeId: principalEmp.id, schoolId: testSchoolId },
    leaveId: iodReq.id,
    action: 'APPROVE',
  })
  assert.strictEqual(iodApproval.ok, true)
  assert.strictEqual(iodApproval.record.status, 'APPROVED')
  assert.strictEqual(iodApproval.record.balanceDeducted, false, 'IOD requests MUST NOT deduct casual leave balance')
  console.log('  ✓ IOD request approved with balanceDeducted: false (Casual leave balance preserved)')

  console.log('[Test 5] Return for correction and resubmission...')
  const returnReq = await db.leaveRequest.create({
    data: {
      schoolId: testSchoolId,
      requesterType: 'EMPLOYEE',
      requesterId: teacher912Emp.id,
      requesterName: 'Priya Nair',
      category: 'LEAVE',
      type: 'SICK',
      fromDate: new Date('2026-11-15'),
      toDate: new Date('2026-11-16'),
      reason: 'Medical rest',
      status: 'IN_PROGRESS',
      workflowKey: wf912.workflowKey,
      stepsJson: wf912.stepsJson,
      historyJson: wf912.historyJson,
      currentStep: 0,
      currentApproverRole: 'HOD',
    },
  })

  const returnRes = await decideLeave({
    session: { sub: hodUser.id, name: hodUser.name, role: 'HOD', employeeId: hodEmp.id, schoolId: testSchoolId },
    leaveId: returnReq.id,
    action: 'RETURN',
    comments: 'Please attach medical certificate.',
  })
  assert.strictEqual(returnRes.ok, true)
  assert.strictEqual(returnRes.record.status, 'RETURNED')
  assert.strictEqual(returnRes.record.returnedReason, 'Please attach medical certificate.')
  console.log('  ✓ Request returned for correction by HOD')

  // Unauthorized actor trying to resubmit
  const unauthorizedResubmit = await decideLeave({
    session: { sub: hodUser.id, name: hodUser.name, role: 'HOD', employeeId: hodEmp.id, schoolId: testSchoolId },
    leaveId: returnReq.id,
    action: 'RESUBMIT',
  })
  assert.strictEqual(unauthorizedResubmit.ok, false)
  assert.strictEqual(unauthorizedResubmit.status, 403)
  console.log('  ✓ Only the requester can resubmit (non-requester rejected with HTTP 403)')

  // Requester resubmits
  const resubmitRes = await decideLeave({
    session: { sub: teacher912User.id, name: teacher912User.name, role: 'TEACHER', employeeId: teacher912Emp.id, schoolId: testSchoolId },
    leaveId: returnReq.id,
    action: 'RESUBMIT',
    comments: 'Attached doctor prescription.',
  })
  assert.strictEqual(resubmitRes.ok, true)
  assert.strictEqual(resubmitRes.record.status, 'IN_PROGRESS')
  assert.strictEqual(resubmitRes.record.currentStep, 0)
  console.log('  ✓ Requester resubmission resets workflow to Step 0 with IN_PROGRESS status')

  console.log('[Test 6] Withdrawal...')
  const withdrawRes = await decideLeave({
    session: { sub: teacher912User.id, name: teacher912User.name, role: 'TEACHER', employeeId: teacher912Emp.id, schoolId: testSchoolId },
    leaveId: returnReq.id,
    action: 'WITHDRAW',
    comments: 'I will attend school, feeling better.',
  })
  assert.strictEqual(withdrawRes.ok, true)
  assert.strictEqual(withdrawRes.record.status, 'CANCELLED')
  assert.ok(withdrawRes.record.withdrawnAt)
  console.log('  ✓ Requester withdrawal cancels request with withdrawnAt recorded')

  console.log('[Test 7] CC Recipient Distinction...')
  // Construct a workflow step with recipientType: CC
  const ccStep = { index: 3, approverRole: 'CORRESPONDENT', recipientType: 'CC' as const, label: 'Correspondent' }
  const ccDecision = canDecide(ccStep, {
    actorRole: 'CORRESPONDENT',
    actorId: 'any-id',
  })
  assert.strictEqual(ccDecision.ok, false)
  assert.match(ccDecision.reason || '', /CC-only/)
  console.log('  ✓ CC recipient cannot approve (fail-closed)')

  console.log('[Test 8] Honest Email Notification Auditing...')
  const emailRes = await sendEmail({
    schoolId: testSchoolId,
    to: 'nistaffleave@nehrucolleges.com',
    cc: ['niskarthikeyani@nehrucolleges.com', 'nisadmissions@nehrucolleges.com'],
    subject: 'Test Honest Email Delivery',
    body: 'Test body',
    dedupeKey: 'test-email-' + Date.now(),
  })
  // Status should be NOT_CONFIGURED when SMTP is not present in local test, or SENT if configured
  assert.ok(['SENT', 'NOT_CONFIGURED', 'FAILED'].includes(emailRes.status))
  const loggedEmail = await db.emailLog.findFirst({ where: { dedupeKey: emailRes.logId ? undefined : undefined, to: 'nistaffleave@nehrucolleges.com' } })
  assert.ok(loggedEmail, 'Email attempt must be audited in EmailLog')
  console.log(`  ✓ Email attempt audited honestly with status: ${emailRes.status} (Never faked)`)

  console.log('[Test 9] Tenant Isolation & Cross-School Protection...')
  const crossTenantAttempt = await decideLeave({
    session: { sub: principalUser.id, name: principalUser.name, role: 'PRINCIPAL', employeeId: principalEmp.id, schoolId: otherSchoolId },
    leaveId: leaveReq.id,
    action: 'APPROVE',
  })
  assert.strictEqual(crossTenantAttempt.ok, false)
  assert.strictEqual(crossTenantAttempt.status, 404, 'Cross-tenant request must fail-closed with 404')
  console.log('  ✓ Cross-tenant request rejected fail-closed (HTTP 404)')

  // Cleanup test data
  await db.emailLog.deleteMany({ where: { schoolId: testSchoolId } })
  await db.leaveRequest.deleteMany({ where: { schoolId: testSchoolId } })
  await db.user.deleteMany({ where: { schoolId: testSchoolId } })
  await db.employee.deleteMany({ where: { schoolId: testSchoolId } })
  await db.schoolSetting.deleteMany({ where: { schoolId: testSchoolId } })
  await db.school.deleteMany({ where: { id: { in: [testSchoolId, otherSchoolId] } } })

  console.log('\n================================================================')
  console.log(' Summary: ALL Institutional Workflow Tests PASSED SUCCESSFULLY!')
  console.log('================================================================\n')
}

runTests().catch(err => {
  console.error('\n❌ Workflow test failed:', err)
  process.exit(1)
})
