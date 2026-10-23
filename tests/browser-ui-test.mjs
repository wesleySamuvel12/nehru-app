/**
 * Headless Chrome Browser UI Verification Suite
 * Tests actual client-side DOM rendering, user interactions, tabs, search, filters,
 * student profile drawer, and browser console errors in a real Chrome browser.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { createJiti } from 'jiti'

const rootDir = process.cwd()
const jiti = createJiti(import.meta.url, {
  jsx: true,
  alias: { '@': path.join(rootDir, 'src') },
})

const { db } = await jiti.import(path.join(rootDir, 'src/lib/db.ts'))
const { signSession } = await jiti.import(path.join(rootDir, 'src/lib/auth.ts'))

class CdpClient {
  constructor(ws) {
    this.ws = ws
    this.id = 1
    this.callbacks = new Map()
    this.listeners = new Map()

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id)
        this.callbacks.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      } else if (msg.method) {
        const cbs = this.listeners.get(msg.method) || []
        cbs.forEach(cb => cb(msg.params))
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, [])
    this.listeners.get(method).push(cb)
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${res.exceptionDetails.exception?.description || ''})`)
    }
    return res.result?.value
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function runBrowserVerification() {
  console.log('=================================================================')
  console.log(' Headless Chrome Browser UI Verification: Teacher Portal')
  console.log(' Target URL: http://localhost:3000')
  console.log('=================================================================\n')

  const priyaUser = await db.user.findFirst({ where: { email: 'teacher@nis.edu.in' } })
  if (!priyaUser) throw new Error('Teacher Priya Nair not found in database')

  const token = await signSession({
    sub: priyaUser.id,
    name: priyaUser.name,
    role: priyaUser.role,
    email: priyaUser.email,
    schoolId: priyaUser.schoolId,
    employeeId: priyaUser.linkedEmployeeId,
  })

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const profileDir = path.join(rootDir, '.chrome-test-profile')
  fs.mkdirSync(profileDir, { recursive: true })

  console.log('[Step 1] Spawning Headless Google Chrome...')
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1440,900',
  ], { stdio: 'inherit' })

  const cleanup = () => {
    try { chromeProcess.kill() } catch {}
    try { fs.rmSync(profileDir, { recursive: true, force: true }) } catch {}
  }
  process.on('exit', cleanup)
  process.on('SIGINT', cleanup)

  // Wait for CDP
  let version = null
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version')
      if (res.ok) {
        version = await res.json()
        break
      }
    } catch {}
    await sleep(200)
  }

  if (!version) {
    cleanup()
    throw new Error('Failed to connect to Chrome debugging port 9222')
  }
  console.log(`  ✓ Connected to Chrome: ${version['Browser']}`)

  const newTabRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' })
  const newTab = await newTabRes.json()
  const wsUrl = newTab.webSocketDebuggerUrl

  console.log('[Step 2] Establishing WebSocket CDP connection...')
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  const cdp = new CdpClient(ws)

  const consoleLogs = []
  const consoleErrors = []

  cdp.on('Console.messageAdded', (params) => {
    consoleLogs.push(params.message.text)
    if (params.message.level === 'error') {
      consoleErrors.push(params.message.text)
    }
  })

  cdp.on('Runtime.consoleAPICalled', (params) => {
    const text = (params.args || []).map(a => a.value ?? a.description ?? '').join(' ')
    consoleLogs.push(`[${params.type}] ${text}`)
    if (params.type === 'error') {
      consoleErrors.push(text)
    }
  })

  cdp.on('Runtime.exceptionThrown', (params) => {
    const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text
    consoleErrors.push(`[Unhandled Exception] ${desc}`)
  })

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Console.enable')
  await cdp.send('Network.enable')

  console.log('[Step 3] Setting erp_session cookie and navigating to http://localhost:3000...')
  await cdp.send('Network.setCookie', {
    name: 'erp_session',
    value: token,
    url: 'http://localhost:3000',
  })

  await cdp.send('Page.navigate', { url: 'http://localhost:3000' })

  // Wait for AppShell
  console.log('[Step 4] Waiting for AppShell to mount...')
  let appShellReady = false
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try {
      const hasNav = await cdp.eval('Boolean(document.querySelector("nav"))')
      if (hasNav) {
        appShellReady = true
        console.log(`  ✓ App shell mounted successfully (at loop ${i})`)
        break
      }
    } catch (e) {}
  }

  if (!appShellReady) {
    cleanup()
    throw new Error('App shell failed to mount')
  }

  const checklist = []
  function record(feature, status, evidence) {
    checklist.push({ feature, status, evidence })
    const icon = status === 'PASS' ? '✓ [PASS]' : status === 'FAIL' ? '✗ [FAIL]' : '○ [NOT VERIFIED]'
    console.log(`${icon} ${feature}`)
    console.log(`       Evidence: ${evidence}`)
  }

  // ── Step 4B: Verify Teacher Dashboard (Landing Screen) ──
  console.log('\n[Step 4B] Verifying Teacher Dashboard Landing Screen...')
  for (let i = 0; i < 20; i++) {
    const hasDashboardContent = await cdp.eval(`
      Boolean(document.querySelector('h1')) && !document.body.innerText.includes('Something went wrong')
    `)
    if (hasDashboardContent) break
    await sleep(400)
  }

  const dashCheck = await cdp.eval(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText || '';
      const text = document.body.innerText || '';
      const hasSomethingWrong = text.includes('Something went wrong') || text.includes('Unable to load data right now');
      const hasTodayClasses = text.toLowerCase().includes("today's classes");
      const hasAttendanceStatus = text.toLowerCase().includes('attendance status');
      const hasGreeting = h1.includes('Good') || h1.includes('Working') || h1.includes('Priya') || text.includes('Teacher Portal');
      return { h1, hasSomethingWrong, hasTodayClasses, hasAttendanceStatus, hasGreeting };
    })()
  `)

  const dashPass = !dashCheck?.hasSomethingWrong && dashCheck?.hasTodayClasses && dashCheck?.hasGreeting
  record(
    'Teacher Dashboard Landing Screen (Error-Free)',
    dashPass ? 'PASS' : 'FAIL',
    `Dashboard Header: "${dashCheck?.h1}". Has "Today's Classes": ${dashCheck?.hasTodayClasses}. Error State Present: ${dashCheck?.hasSomethingWrong}`
  )

  // Navigate to Students module
  console.log('\n[Step 5] Navigating to Students & Classes module via sidebar...')
  await cdp.eval(`
    (() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const studentBtn = navButtons.find(b => b.innerText && b.innerText.includes('Students'));
      if (studentBtn) studentBtn.click();
    })()
  `)

  // Wait for Students table to load
  for (let i = 0; i < 30; i++) {
    await sleep(400)
    try {
      const title = await cdp.eval('document.querySelector("h1")?.innerText || ""')
      const hasRows = await cdp.eval('document.querySelectorAll("tbody tr").length > 0')
      if (title.includes('Students & Classes') && hasRows) {
        console.log(`  ✓ Students module and rows mounted (at loop ${i})`)
        break
      }
    } catch {}
  }

  // 1. Student Directory Display
  const directoryCheck = await cdp.eval(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const rowData = rows.map(r => {
        const cells = Array.from(r.querySelectorAll('td'));
        return cells.map(c => c.innerText.trim());
      }).filter(r => r.length > 2);

      const tableHeaders = Array.from(document.querySelectorAll('thead th')).map(th => th.innerText.trim());
      return { rowCount: rowData.length, firstRow: rowData[0], headers: tableHeaders };
    })()
  `)
  const dirPass = directoryCheck?.rowCount > 0 && directoryCheck?.firstRow?.length >= 4
  record(
    'Student Directory Table Display',
    dirPass ? 'PASS' : 'FAIL',
    `Rendered ${directoryCheck?.rowCount} student rows in browser DOM. First student: "${directoryCheck?.firstRow?.slice(0, 4)?.join(' | ')}". Headers: [${directoryCheck?.headers?.filter(Boolean)?.join(', ')}]`
  )

  // 2. Stat Cards Rendering (wait for statsLoading to resolve)
  for (let i = 0; i < 20; i++) {
    const hasTotalActive = await cdp.eval(`
      document.body.innerText.toLowerCase().includes('total active')
    `)
    if (hasTotalActive) break
    await sleep(300)
  }

  const statsCheck = await cdp.eval(`
    (() => {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/(TOTAL ACTIVE|Total Active)\\s*(\\d+)[^\\n]*\\n([^\\n]*)/i);
      return {
        found: Boolean(match),
        activeCount: match ? match[2] : null,
        snippet: match ? match[0] : null
      };
    })()
  `)
  const statsPass = Boolean(statsCheck?.found)
  record(
    'Statistics & Roster Summary Cards',
    statsPass ? 'PASS' : 'FAIL',
    `Summary cards found. Active Students count: ${statsCheck?.activeCount}. Snippet: "${statsCheck?.snippet?.replace(/\\n/g, ' ')}"`
  )

  // 3. Search Bar Interaction (React synthetic event simulation)
  console.log('\n[Interaction Test] Testing live Search input in browser...');
  await cdp.eval(`
    (() => {
      const input = document.querySelector('input[placeholder*="Search student name"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'Aarav');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `)
  await sleep(800) // Wait for debounce and re-render

  const searchCheck = await cdp.eval(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => r.innerText.trim());
      return { rowCount: rows.length, rowsSnippet: rows.slice(0, 3) };
    })()
  `)
  const searchPass = searchCheck?.rowCount > 0 && searchCheck?.rowsSnippet?.every(r => r.toLowerCase().includes('aarav'))
  record(
    'Student Directory Search Filtering',
    searchPass ? 'PASS' : 'FAIL',
    `Typed "Aarav" into search input. Result: ${searchCheck?.rowCount} row(s) rendered: "${searchCheck?.rowsSnippet?.[0]?.replace(/\\n/g, ' ')}"`
  )

  // Clear search
  await cdp.eval(`
    (() => {
      const input = document.querySelector('input[placeholder*="Search student name"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `)
  await sleep(700)

  // 4. Class and Section Filter Dropdowns
  console.log('\n[Interaction Test] Testing Class & Section filters in browser...');
  const filterElements = await cdp.eval(`
    (() => {
      const triggers = Array.from(document.querySelectorAll('button[role="combobox"]'));
      return triggers.map(t => t.innerText.trim());
    })()
  `)
  const hasFilterDropdowns = filterElements.some(t => t.includes('Class') || t.includes('Classes') || t.includes('All'))
  record(
    'Class and Section Filter Dropdowns',
    hasFilterDropdowns ? 'PASS' : 'FAIL',
    `Filter dropdown triggers present in DOM: [${filterElements.join(', ')}]`
  )

  // 5. My Classes Tab Navigation & Badges
  console.log('\n[Interaction Test] Switching to "My Classes" Tab...');
  const tabsInfo = await cdp.eval(`
    Array.from(document.querySelectorAll('[role="tab"]')).map(t => ({
      text: t.innerText.trim(),
      state: t.getAttribute('data-state'),
      value: t.getAttribute('value'),
      id: t.id
    }))
  `)
  console.log('Detected tabs on page:', JSON.stringify(tabsInfo))

  await cdp.eval(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const tab = tabs.find(t => t.innerText && t.innerText.includes('My Classes'));
      if (tab) {
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        tab.click();
      }
    })()
  `)

  // Wait for My Classes tab content to become active and cards to render
  for (let i = 0; i < 20; i++) {
    await sleep(300)
    const hasMyClassesCards = await cdp.eval(`
      Boolean(document.querySelector('[data-slot="tabs-content"][data-state="active"] [data-slot="card"]'))
    `)
    if (hasMyClassesCards) break
  }

  const myClassesCheck = await cdp.eval(`
    (() => {
      const activeContent = document.querySelector('[data-slot="tabs-content"][data-state="active"]');
      if (!activeContent) return { cardCount: 0 };
      const cards = Array.from(activeContent.querySelectorAll('[data-slot="card"]'));
      const classCards = cards.filter(c => c.innerText && (c.innerText.includes('Curriculum Subjects') || c.innerText.includes('Allocated Room')));
      const badges = Array.from(activeContent.querySelectorAll('span, div')).map(s => s.innerText ? s.innerText.trim() : '');
      const hasSubjectFaculty = badges.some(b => b === 'Subject Faculty');
      const hasClassTeacher = badges.some(b => b === 'Class Teacher');
      const sampleCard = classCards[0] ? classCards[0].innerText.trim().replace(/\\n+/g, ' | ') : '';
      return { cardCount: classCards.length, hasSubjectFaculty, hasClassTeacher, sampleCard };
    })()
  `)
  const myClassesPass = myClassesCheck?.cardCount > 0 && myClassesCheck?.hasSubjectFaculty
  record(
    'My Classes Cards & Role Badges',
    myClassesPass ? 'PASS' : 'FAIL',
    `Rendered ${myClassesCheck?.cardCount} assigned class cards in browser. Subject Faculty badge present: ${myClassesCheck?.hasSubjectFaculty}. Sample Card: "${myClassesCheck?.sampleCard?.slice(0, 110)}..."`
  )

  // 6. Course Roster Drilldown Button
  console.log('\n[Interaction Test] Clicking "Course Roster" drill-down button...');
  await cdp.eval(`
    (() => {
      const activeContent = document.querySelector('[data-slot="tabs-content"][data-state="active"]');
      const btns = Array.from((activeContent || document).querySelectorAll('button'));
      const rosterBtn = btns.find(b => b.innerText && (b.innerText.includes('Course Roster') || b.innerText.includes('Class Roster')));
      if (rosterBtn) {
        rosterBtn.click();
      }
    })()
  `)
  await sleep(700)

  const rosterDrillCheck = await cdp.eval(`
    (() => {
      const banner = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('Viewing roster for'));
      const bannerText = banner ? banner.innerText.trim().replace(/\\n+/g, ' ') : '';
      const rows = Array.from(document.querySelectorAll('tbody tr')).length;
      return { bannerText, rows };
    })()
  `)
  const drillPass = Boolean(rosterDrillCheck?.bannerText) && rosterDrillCheck?.rows > 0
  record(
    'Course/Class Roster Drilldown Action',
    drillPass ? 'PASS' : 'FAIL',
    `Drilldown navigated back to Directory. Banner displayed: "${rosterDrillCheck?.bannerText}". Scoped students rendered: ${rosterDrillCheck?.rows}`
  )

  // Clear Roster Filter to return to full view
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const clearBtn = btns.find(b => b.innerText && b.innerText.includes('Show all students'));
      if (clearBtn) clearBtn.click();
    })()
  `)
  await sleep(500)

  // 7. Student Profile Sheet Open & Academic Breakdown
  console.log('\n[Interaction Test] Opening Student Profile Drawer...');
  await cdp.eval(`
    (() => {
      const eyeBtns = Array.from(document.querySelectorAll('button[aria-label*="View profile"]'));
      if (eyeBtns[0]) eyeBtns[0].click();
      else {
        const firstRow = document.querySelector('tbody tr');
        if (firstRow) firstRow.click();
      }
    })()
  `)
  await sleep(1000)

  for (let i = 0; i < 20; i++) {
    const hasData = await cdp.eval(`
      Boolean(document.querySelector('[role="dialog"] h2, [role="dialog"] [class*="title"]')?.innerText?.trim())
    `)
    if (hasData) break
    await sleep(300)
  }

  const sheetCheck = await cdp.eval(`
    (() => {
      const sheet = document.querySelector('[role="dialog"]');
      if (!sheet) return { open: false };
      const text = sheet.innerText || '';
      const hasAttendance = text.includes('Attendance') || text.includes('Present');
      const hasAcademic = text.includes('Marks') || text.includes('Gradebook') || text.includes('Academic');
      const hasParent = text.includes('Parent') || text.includes('Guardian') || text.includes('Bio & Contact');
      const hasRedactedFinancials = !text.includes('Transaction History') && !text.includes('Payment Method');
      const title = sheet.querySelector('h2, [class*="title"]')?.innerText?.trim() || '';
      return {
        open: true,
        title,
        hasAttendance,
        hasAcademic,
        hasParent,
        hasRedactedFinancials,
        snippet: text.slice(0, 150).replace(/\\n+/g, ' '),
      };
    })()
  `)
  const sheetPass = sheetCheck?.open && sheetCheck?.hasAttendance && sheetCheck?.hasRedactedFinancials
  record(
    'Student Profile Drawer & Data Isolation',
    sheetPass ? 'PASS' : 'FAIL',
    `Drawer opened: ${sheetCheck?.open}. Student Header: "${sheetCheck?.title}". Academic performance tabs present: ${sheetCheck?.hasAcademic}. Confidential financials excluded: ${sheetCheck?.hasRedactedFinancials}. Preview: "${sheetCheck?.snippet}..."`
  )

  // Close sheet
  await cdp.eval(`
    (() => {
      const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg.lucide-x)');
      if (closeBtn) closeBtn.click();
    })()
  `)
  await sleep(500)

  // 8. Class Notice Modal Dialog
  console.log('\n[Interaction Test] Testing Class Notice Modal Dialog...');
  await cdp.eval(`
    (() => {
      const tab = document.querySelector('[id*="trigger-my-classes"]') ||
                  Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.innerText && t.innerText.includes('My Classes'));
      if (tab) {
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        tab.click();
      }
    })()
  `)
  await sleep(800)

  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const noticeBtn = btns.find(b => b.innerText && b.innerText.includes('Notice'));
      if (noticeBtn) {
        noticeBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        noticeBtn.click();
      }
    })()
  `)
  await sleep(700)

  const noticeModalCheck = await cdp.eval(`
    (() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { open: false };
      const title = modal.querySelector('h2, [class*="title"]')?.innerText?.trim() || '';
      const hasTitleInput = Boolean(modal.querySelector('input'));
      const hasBodyTextarea = Boolean(modal.querySelector('textarea'));
      const hasSubmitBtn = Array.from(modal.querySelectorAll('button')).some(b => b.innerText && (b.innerText.includes('Publish Notice') || b.innerText.includes('Broadcast')));
      return { open: true, title, hasTitleInput, hasBodyTextarea, hasSubmitBtn };
    })()
  `)
  const noticeModalPass = noticeModalCheck?.open && noticeModalCheck?.hasSubmitBtn
  record(
    'Broadcast Class Notice Modal Dialog',
    noticeModalPass ? 'PASS' : 'FAIL',
    `Modal Dialog opened: ${noticeModalCheck?.open}. Title: "${noticeModalCheck?.title}". Form elements: Title=${noticeModalCheck?.hasTitleInput}, Body=${noticeModalCheck?.hasBodyTextarea}, Broadcast Button=${noticeModalCheck?.hasSubmitBtn}`
  )

  // Close Notice modal
  await cdp.eval(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText && b.innerText.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    })()
  `)
  await sleep(400)

  // 9. Browser Console Errors Analysis
  console.log('\n[Step 6] Analyzing Browser Console Output...');
  const filteredErrors = consoleErrors.filter(err => {
    return !err.includes('favicon.ico') && !err.includes('[HMR]') && !err.includes('allowedDevOrigins')
  })
  record(
    'Browser Console Health (Zero Uncaught Errors)',
    filteredErrors.length === 0 ? 'PASS' : 'FAIL',
    filteredErrors.length === 0
      ? '0 uncaught exceptions or error-level console logs during full interactive UI execution.'
      : `${filteredErrors.length} console errors detected: ${filteredErrors.join(' | ')}`
  )

  // Cleanup
  console.log('\n[Step 7] Shutting down Headless Chrome session...');
  cleanup()

  console.log('\n=================================================================')
  const totalPass = checklist.filter(c => c.status === 'PASS').length
  console.log(` Browser Verification Summary: ${totalPass} / ${checklist.length} verified`)
  console.log('=================================================================')
}

runBrowserVerification().catch(err => {
  console.error('Fatal Browser Test Error:', err)
  process.exit(1)
})
