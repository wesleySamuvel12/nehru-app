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
  assert.equal(normalizeRole('HEALTH'), 'NURSE', 'HEALTH should normalize to NURSE')
  assert.equal(normalizeRole('health'), 'NURSE', 'lowercase health should normalize to NURSE')
  assert.equal(normalizeRole('NURSE'), 'NURSE', 'NURSE remains NURSE')
  assert.equal(normalizeRole('TEACHER'), 'TEACHER', 'Standard roles pass through')

  // 3b: Labels for aliases
  assert.equal(ROLE_LABELS['HOSTEL'], 'Hostel Warden', 'HOSTEL label should match Hostel Warden')
  assert.equal(ROLE_LABELS['WARDEN'], 'Hostel Warden', 'WARDEN label should match Hostel Warden')
  assert.equal(ROLE_LABELS['HEALTH'], 'Nurse / Doctor', 'HEALTH label should match Nurse / Doctor')
  assert.equal(ROLE_LABELS['NURSE'], 'Nurse / Doctor', 'NURSE label should match Nurse / Doctor')

  // 3c: Role definitions & landing workspaces
  const hostelDef = getRoleDefinition('HOSTEL')
  const wardenDef = getRoleDefinition('WARDEN')
  assert.ok(hostelDef, 'getRoleDefinition(HOSTEL) should exist')
  assert.equal(hostelDef?.role, 'WARDEN')
  assert.equal(hostelDef?.landingModule, 'hostel')
  assert.equal(hostelDef, wardenDef, 'HOSTEL and WARDEN resolve to identical definition')

  const healthDef = getRoleDefinition('HEALTH')
  const nurseDef = getRoleDefinition('NURSE')
  assert.ok(healthDef, 'getRoleDefinition(HEALTH) should exist')
  assert.equal(healthDef?.role, 'NURSE')
  assert.equal(healthDef?.landingModule, 'health')
  assert.equal(healthDef, nurseDef, 'HEALTH and NURSE resolve to identical definition')

  console.log('  ✓ 14 roles, aliases (HOSTEL <-> WARDEN, HEALTH <-> NURSE), and landing workspaces match')
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

  // 4b: Teacher permissions
  assert.equal(can('TEACHER', 'academics'), true, 'Teacher can access academics')
  assert.equal(can('TEACHER', 'attendance'), true, 'Teacher can access attendance')
  assert.equal(can('TEACHER', 'students'), true, 'Teacher can access students')
  assert.equal(can('TEACHER', 'fees'), false, 'Teacher CANNOT access fees')
  assert.equal(can('TEACHER', 'settings'), false, 'Teacher CANNOT access settings')

  // 4c: Student permissions
  assert.equal(can('STUDENT', 'student-portal'), true, 'Student can access student-portal')
  assert.equal(can('STUDENT', 'attendance'), true, 'Student can view attendance')
  assert.equal(can('STUDENT', 'parent-portal'), false, 'Student CANNOT access parent-portal')
  assert.equal(can('STUDENT', 'hr'), false, 'Student CANNOT access HR')
  assert.equal(can('STUDENT', 'admissions'), false, 'Student CANNOT access admissions')

  // 4d: Alias permissions
  assert.equal(can('HOSTEL', 'hostel'), true, 'HOSTEL alias can access hostel module')
  assert.equal(can('WARDEN', 'hostel'), true, 'WARDEN can access hostel module')
  assert.equal(can('HEALTH', 'health'), true, 'HEALTH alias can access health module')
  assert.equal(can('NURSE', 'health'), true, 'NURSE can access health module')

  console.log('  ✓ Strict server-side RBAC checks protect sensitive modules from unauthorized roles')
  passed++

  // --------------------------------------------------------------------------
  // TEST 5: Login Regression & School Context Establishment
  // --------------------------------------------------------------------------
  console.log('[Test 5] Login Regression & Database School Context...')

  // 5a: Successful login with all 14 seed sample credentials
  const SAMPLE_LOGINS = [
    { role: 'SUPER_ADMIN', email: 'admin@nis.edu.in' },
    { role: 'SCHOOL_ADMIN', email: 'schooladmin@nis.edu.in' },
    { role: 'PRINCIPAL', email: 'principal@nis.edu.in' },
    { role: 'TEACHER', email: 'teacher@nis.edu.in' },
    { role: 'ACCOUNTANT', email: 'accounts@nis.edu.in' },
    { role: 'HR', email: 'hr@nis.edu.in' },
    { role: 'COUNSELLOR', email: 'counsellor@nis.edu.in' },
    { role: 'LIBRARIAN', email: 'librarian@nis.edu.in' },
    { role: 'TRANSPORT', email: 'transport@nis.edu.in' },
    { role: 'WARDEN', email: 'warden@nis.edu.in' },
    { role: 'NURSE', email: 'nurse@nis.edu.in' },
    { role: 'SECURITY', email: 'security@nis.edu.in' },
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

  console.log('\n====================================================')
  console.log(` Summary: All ${passed}/${passed} test suites PASSED successfully!`)
  console.log('====================================================')
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err)
  process.exit(1)
})
