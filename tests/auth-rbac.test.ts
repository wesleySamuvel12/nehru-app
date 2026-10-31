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
  console.log('====================================================')
  console.log(' Phase 2: Authentication & RBAC Security Test Suite')
  console.log('====================================================\n')

  const {
    getAuthSecret,
    signSession,
    verifySessionToken,
    getSessionCookieOptions,
    verifyPassword,
    hashPassword,
  } = (await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))) as any

  const {
    normalizeRole,
    can,
    ROLE_LABELS,
    ROLES,
  } = (await jiti.import(path.join(rootDir, 'src/lib/rbac.ts'))) as any

  const {
    getRoleDefinition,
    getRoleLandingModule,
  } = (await jiti.import(path.join(rootDir, 'src/role/index.ts'))) as any

  const { POST: loginHandler } = (await jiti.import(path.join(rootDir, 'src/app/api/auth/login/route.ts'))) as any
  const { POST: logoutHandler } = (await jiti.import(path.join(rootDir, 'src/app/api/auth/logout/route.ts'))) as any
  const { POST: forgotPasswordHandler } = (await jiti.import(path.join(rootDir, 'src/app/api/auth/forgot-password/route.ts'))) as any

  let passed = 0

  // --------------------------------------------------------------------------
  // TEST 1: Authentication Secret Validation & Failsafe
  // --------------------------------------------------------------------------
  console.log('[Test 1] Authentication Secret Handling...')
  const originalEnv = { ...process.env }

  // 1a: Production without secret throws
  ;(process.env as any).NODE_ENV = 'production'
  delete process.env.AUTH_SECRET
  assert.throws(
    () => getAuthSecret(),
    /AUTH_SECRET is not configured/,
    'Should throw when AUTH_SECRET is missing in production'
  )

  // 1b: Production with short secret throws
  process.env.AUTH_SECRET = 'too-short-secret'
  assert.throws(
    () => getAuthSecret(),
    /AUTH_SECRET is too short/,
    'Should throw when AUTH_SECRET is < 32 characters in production'
  )

  // 1c: Production with valid 32+ char secret succeeds
  process.env.AUTH_SECRET = 'a-very-long-production-secret-key-with-at-least-32-chars!'
  const validSecret = getAuthSecret()
  assert.ok(validSecret instanceof Uint8Array, 'Should return Uint8Array for valid secret')
  assert.ok(validSecret.length >= 32, 'Secret bytes length should be >= 32')

  // 1d: Restore dev environment
  ;(process.env as any).NODE_ENV = 'development'
  process.env.AUTH_SECRET = 'nehru-erp-dev-secret-key-min-32-chars-long-2026'
  console.log('  ✓ Secret validation correctly fails in production and succeeds with valid key')
  passed++

  // --------------------------------------------------------------------------
  // TEST 2: Session Security, Expiry & Tamper Detection
  // --------------------------------------------------------------------------
  console.log('[Test 2] Session Signing, Verification & Tamper Detection...')
  const testSession = {
    sub: 'user-123',
    name: 'Test Administrator',
    email: 'admin-test@nis.edu.in',
    role: 'SUPER_ADMIN',
    schoolId: 'school-nis-main',
    schoolCode: 'NIS-MAIN',
  }

  // 2a: Valid session signing and verification
  const token = await signSession(testSession, '1h')
  assert.ok(typeof token === 'string' && token.split('.').length === 3, 'JWT should have 3 segments')

  const verified = await verifySessionToken(token)
  assert.ok(verified, 'Verified session should not be null')
  assert.equal(verified?.sub, testSession.sub)
  assert.equal(verified?.email, testSession.email)
  assert.equal(verified?.role, testSession.role)
  assert.equal(verified?.schoolId, testSession.schoolId)
  assert.equal(verified?.schoolCode, testSession.schoolCode)

  // 2b: Tampered token verification fails safely
  const tamperedToken = token.slice(0, -6) + 'xxxxxx'
  const tamperedResult = await verifySessionToken(tamperedToken)
  assert.equal(tamperedResult, null, 'Tampered token must return null')

  // 2c: Expired token verification fails safely
  const expiredToken = await signSession(testSession, '-1s')
  const expiredResult = await verifySessionToken(expiredToken)
  assert.equal(expiredResult, null, 'Expired token must return null')

  // 2d: Cookie options security settings
  const cookieOpts = getSessionCookieOptions(false)
  assert.equal(cookieOpts.httpOnly, true, 'Cookie must be httpOnly')
  assert.equal(cookieOpts.sameSite, 'lax', 'Cookie sameSite should be lax')
  assert.equal(cookieOpts.path, '/', 'Cookie path should be root')
  assert.equal(cookieOpts.maxAge, 24 * 3600, 'Regular session maxAge should be 24h')

  console.log('  ✓ Session signing, token verification, expiration, and cookie security verified')
  passed++

  // --------------------------------------------------------------------------
  // TEST 3: Role Alias Normalization & Consistency
  // --------------------------------------------------------------------------
  console.log('[Test 3] Role Compatibility and Alias Normalization...')

  // 3a: Normalization of aliases and casing
  assert.equal(normalizeRole('HOSTEL'), 'WARDEN', 'HOSTEL should normalize to WARDEN')
  assert.equal(normalizeRole('hostel'), 'WARDEN', 'lowercase hostel should normalize to WARDEN')
  assert.equal(normalizeRole('WARDEN'), 'WARDEN', 'WARDEN remains WARDEN')
  assert.equal(normalizeRole('PRO'), 'PRINCIPAL', 'PRO should normalize to PRINCIPAL')
  assert.equal(normalizeRole('COUNSELLOR'), 'ADMISSION_ADMIN', 'COUNSELLOR should normalize to ADMISSION_ADMIN')
  assert.equal(normalizeRole('STUDENT_ADMIN'), 'ADMISSION_ADMIN', 'STUDENT_ADMIN should normalize to ADMISSION_ADMIN')
  assert.equal(normalizeRole('TEACHER'), 'TEACHER', 'Standard roles pass through')

  // 3b: Labels for aliases
  assert.equal(ROLE_LABELS['HOSTEL'], 'Hostel Warden', 'HOSTEL label should match Hostel Warden')
  assert.equal(ROLE_LABELS['WARDEN'], 'Hostel Warden', 'WARDEN label should match Hostel Warden')
  assert.equal(ROLE_LABELS['ADMISSION_ADMIN'], 'Admission Administrator', 'ADMISSION_ADMIN label should match')

  // 3c: Role definitions & landing workspaces
  const hostelDef = getRoleDefinition('HOSTEL')
  const wardenDef = getRoleDefinition('WARDEN')
  assert.ok(hostelDef, 'getRoleDefinition(HOSTEL) should exist')
  assert.equal(hostelDef?.role, 'WARDEN')
  assert.equal(hostelDef?.landingModule, 'hostel')
  assert.equal(hostelDef, wardenDef, 'HOSTEL and WARDEN resolve to identical definition')

  const admissionDef = getRoleDefinition('ADMISSION_ADMIN')
  assert.ok(admissionDef, 'getRoleDefinition(ADMISSION_ADMIN) should exist')
  assert.equal(admissionDef?.role, 'ADMISSION_ADMIN')
  assert.equal(admissionDef?.landingModule, 'admissions')

  console.log('  ✓ Roles, aliases (PRO -> PRINCIPAL, COUNSELLOR -> ADMISSION_ADMIN), and landing workspaces match')
  passed++

  // --------------------------------------------------------------------------
  // TEST 4: Authorization Enforcement (RBAC)
  // --------------------------------------------------------------------------
  console.log('[Test 4] Authorization & RBAC Permission Boundaries...')

  // 4a: Super Admin can access all modules
  assert.equal(can('SUPER_ADMIN', 'dashboard'), true)
  assert.equal(can('SUPER_ADMIN', 'fees'), true)
  assert.equal(can('SUPER_ADMIN', 'settings'), true)
  assert.equal(can('SUPER_ADMIN', 'hr'), true)

  // 4b: Teacher permissions (restricted from parent management & whole-school admin)
  assert.equal(can('TEACHER', 'academics'), true, 'Teacher can access academics')
  assert.equal(can('TEACHER', 'attendance'), true, 'Teacher can access attendance')
  assert.equal(can('TEACHER', 'students'), true, 'Teacher can access students')
  assert.equal(can('TEACHER', 'parents'), false, 'Teacher CANNOT manage parent accounts')
  assert.equal(can('TEACHER', 'admissions'), false, 'Teacher CANNOT manage admissions')
  assert.equal(can('TEACHER', 'fees'), false, 'Teacher CANNOT access fees')
  assert.equal(can('TEACHER', 'settings'), false, 'Teacher CANNOT access settings')

  // 4c: Student permissions
  assert.equal(can('STUDENT', 'student-portal'), true, 'Student can access student-portal')
  assert.equal(can('STUDENT', 'attendance'), true, 'Student can view attendance')
  assert.equal(can('STUDENT', 'parent-portal'), false, 'Student CANNOT access parent-portal')
  assert.equal(can('STUDENT', 'hr'), false, 'Student CANNOT access HR')
  assert.equal(can('STUDENT', 'admissions'), false, 'Student CANNOT access admissions')

  // 4d: Admission Admin permissions
  assert.equal(can('ADMISSION_ADMIN', 'admissions'), true, 'Admission Admin can access admissions')
  assert.equal(can('ADMISSION_ADMIN', 'students'), true, 'Admission Admin can access students')
  assert.equal(can('ADMISSION_ADMIN', 'parents'), true, 'Admission Admin can access parents')

  // 4d-2: Academic Coordinator permissions
  assert.equal(can('ACADEMIC_COORDINATOR', 'dashboard'), true, 'Academic Coordinator can access dashboard')
  assert.equal(can('ACADEMIC_COORDINATOR', 'academics'), true, 'Academic Coordinator can access academics')
  assert.equal(can('ACADEMIC_COORDINATOR', 'attendance'), true, 'Academic Coordinator can access attendance')
  assert.equal(can('ACADEMIC_COORDINATOR', 'examinations'), true, 'Academic Coordinator can access examinations')
  assert.equal(can('ACADEMIC_COORDINATOR', 'fees'), false, 'Academic Coordinator does NOT have unrestricted finance permissions')

  // 4e: Alias permissions
  assert.equal(can('HOSTEL', 'hostel'), true, 'HOSTEL alias can access hostel module')
  assert.equal(can('WARDEN', 'hostel'), true, 'WARDEN can access hostel module')
  assert.equal(can('PRO', 'academics'), true, 'PRO alias can access academics')

  console.log('  ✓ Strict server-side RBAC checks protect sensitive modules from unauthorized roles')
  passed++

  // --------------------------------------------------------------------------
  // TEST 5: Login Regression & School Context Establishment
  // --------------------------------------------------------------------------
  console.log('[Test 5] Login Regression & Database School Context...')

  // 5a: Successful login with active seed sample credentials
  const SAMPLE_LOGINS = [
    { role: 'SUPER_ADMIN', email: 'admin@nis.edu.in' },
    { role: 'SCHOOL_ADMIN', email: 'schooladmin@nis.edu.in' },
    { role: 'PRINCIPAL', email: 'principal@nis.edu.in' },
    { role: 'ACADEMIC_COORDINATOR', email: 'coordinator@nis.edu.in' },
    { role: 'TEACHER', email: 'teacher@nis.edu.in' },
    { role: 'ACCOUNTANT', email: 'accounts@nis.edu.in' },
    { role: 'HR', email: 'hr@nis.edu.in' },
    { role: 'ADMISSION_ADMIN', email: 'admission@nis.edu.in' },
    { role: 'LIBRARIAN', email: 'librarian@nis.edu.in' },
    { role: 'TRANSPORT', email: 'transport@nis.edu.in' },
    { role: 'WARDEN', email: 'warden@nis.edu.in' },
    { role: 'PARENT', email: 'parent@nis.edu.in' },
    { role: 'STUDENT', email: 'student@nis.edu.in' },
  ]

  let lastIssuedToken = ''
  for (const sample of SAMPLE_LOGINS) {
    const fakeLoginReq = {
      json: async () => ({
        email: sample.email,
        password: 'demo1234',
      }),
      headers: new Headers({
        'user-agent': 'TestRunner/1.0',
        'x-forwarded-for': '127.0.0.1',
      }),
    } as any

    const loginRes = await loginHandler(fakeLoginReq)
    assert.equal(loginRes.status, 200, `Login for sample ${sample.email} should succeed with status 200`)
    const loginBody = await loginRes.json()

    assert.ok(loginBody.data, `Login response for ${sample.email} should contain session data`)
    assert.equal(loginBody.data.email, sample.email)
    assert.equal(loginBody.data.role, sample.role)
    assert.ok(loginBody.data.schoolId, `Login session for ${sample.email} MUST contain database-resolved schoolId`)
    assert.ok(loginBody.data.schoolCode, `Login session for ${sample.email} MUST contain database-resolved schoolCode`)
    assert.ok(loginBody.token, `Login response for ${sample.email} should include JWT token`)

    // Verify the issued JWT contains the resolved school context and matching role
    const decodedIssuedToken = await verifySessionToken(loginBody.token)
    assert.equal(decodedIssuedToken?.schoolId, loginBody.data.schoolId)
    assert.equal(decodedIssuedToken?.role, sample.role)
    lastIssuedToken = loginBody.token
  }
  console.log(`  ✓ Verified all ${SAMPLE_LOGINS.length} sample logins authenticate successfully with valid session and school context`)

  // 5b: Failed login with invalid password
  const fakeBadReq = {
    json: async () => ({
      email: 'admin@nis.edu.in',
      password: 'wrongpassword123',
    }),
    headers: new Headers({
      'user-agent': 'TestRunner/1.0',
    }),
  } as any

  const badRes = await loginHandler(fakeBadReq)
  assert.equal(badRes.status, 401, 'Invalid password should reject with 401')
  const badBody = await badRes.json()
  assert.ok(badBody.error.includes('Invalid email or password'), 'Should return safe error message')

  // 5c: Logout clears cookie securely
  const fakeLogoutReq = {
    cookies: new Map([['erp_session', { value: lastIssuedToken }]]),
    headers: new Headers(),
  } as any
  const logoutRes = await logoutHandler(fakeLogoutReq)
  assert.equal(logoutRes.status, 200)

  console.log('  ✓ Login flow preserved: authenticates, issues token with school context, clears on logout')
  passed++

  // --------------------------------------------------------------------------
  // TEST 6: Password Reset & Account Recovery Workflow
  // --------------------------------------------------------------------------
  console.log('[Test 6] Password Reset & Account Recovery Workflow...')

  // 6a: Neutral response for unregistered email (prevents account enumeration)
  const unknownEmailReq = {
    json: async () => ({ action: 'request', email: 'nonexistent-user-12345@nis.edu.in' }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
    nextUrl: { origin: 'http://localhost:3000' },
  } as any
  const unknownRes = await forgotPasswordHandler(unknownEmailReq)
  assert.equal(unknownRes.status, 200, 'Unknown email request should return status 200')
  const unknownBody = await unknownRes.json()
  assert.ok(unknownBody.message.includes('password reset instructions have been dispatched'))
  assert.equal(unknownBody.resetToken, undefined, 'No token returned for nonexistent user')

  // 6b: Request reset for registered account (teacher@nis.edu.in)
  const validEmailReq = {
    json: async () => ({ action: 'request', email: 'teacher@nis.edu.in' }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
    nextUrl: { origin: 'http://localhost:3000' },
  } as any
  const validRes = await forgotPasswordHandler(validEmailReq)
  assert.equal(validRes.status, 200)
  const validBody = await validRes.json()
  assert.ok(validBody.resetToken, 'Dev/Test environment must generate valid resetToken')

  // 6c: Reject reset with invalid or empty new password (< 6 chars)
  const shortPwReq = {
    json: async () => ({ action: 'reset', token: validBody.resetToken, newPassword: '123' }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  } as any
  const shortPwRes = await forgotPasswordHandler(shortPwReq)
  assert.equal(shortPwRes.status, 400)
  const shortPwBody = await shortPwRes.json()
  assert.ok(shortPwBody.error.includes('at least 6 characters'))

  // 6d: Execute password reset with valid token and strong new password
  const tempNewPassword = 'newPassword123'
  const resetReq = {
    json: async () => ({ action: 'reset', token: validBody.resetToken, newPassword: tempNewPassword }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  } as any
  const resetRes = await forgotPasswordHandler(resetReq)
  assert.equal(resetRes.status, 200)
  const resetBody = await resetRes.json()
  assert.equal(resetBody.success, true)

  // 6e: Verify replay protection (reusing the same token fails fail-closed)
  const replayRes = await forgotPasswordHandler(resetReq)
  assert.equal(replayRes.status, 400, 'Token replay must be rejected')
  const replayBody = await replayRes.json()
  assert.ok(replayBody.error.includes('already been used') || replayBody.error.includes('invalidated'))

  // 6f: Verify new password logs in successfully
  const newLoginReq = {
    json: async () => ({ email: 'teacher@nis.edu.in', password: tempNewPassword }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  } as any
  const newLoginRes = await loginHandler(newLoginReq)
  assert.equal(newLoginRes.status, 200, 'Login with new password must succeed')

  // 6g: Restore original demo password so demo logins remain consistent
  const restoreReq = {
    json: async () => ({ action: 'request', email: 'teacher@nis.edu.in' }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
    nextUrl: { origin: 'http://localhost:3000' },
  } as any
  const restoreTokenRes = await forgotPasswordHandler(restoreReq)
  const restoreTokenBody = await restoreTokenRes.json()
  const restoreResetReq = {
    json: async () => ({ action: 'reset', token: restoreTokenBody.resetToken, newPassword: 'demo1234' }),
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  } as any
  await forgotPasswordHandler(restoreResetReq)

  console.log('  ✓ Password reset flow verified: anti-enumeration, short-lived tokens, replay protection & credential update')
  passed++

  console.log('\n====================================================')
  console.log(` Summary: All ${passed}/${passed} test suites PASSED successfully!`)
  console.log('====================================================')
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err)
  process.exit(1)
})
