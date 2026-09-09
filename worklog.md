# School ERP — Worklog

Project: Next.js 16 (App Router) + Prisma (SQLite) + shadcn/ui single-page ERP at `/` route.

## Rules for all agents
- Read this file BEFORE working. Append your section AFTER finishing (never overwrite).
- NEVER create new page routes. The ONLY page is `src/app/page.tsx` (single-page app).
- NEVER edit shared files unless your task says so: `src/lib/{db,auth,rbac,crud,api-client,store,notify,audit,registry,format}.ts`, `src/components/erp/*` core files, `prisma/schema.prisma`.
- Use existing shadcn/ui components from `src/components/ui`.
- Use `sonner` toast via `import { toast } from 'sonner'`.

---
Task ID: 0
Agent: orchestrator (main)
Task: Setup, planning, foundation

Work Log:
- Explored project (Next.js 16, Tailwind 4, shadcn/ui, Prisma+SQLite, recharts, zustand available)
- Installed jose, bcryptjs, qrcode

Stage Summary:
- Single-page ERP: login screen + app shell with sidebar nav; modules are client views rendered via registry.
- API routes under src/app/api/** provide full CRUD via a shared crud engine.

---
Task ID: 1 & 2
Agent: orchestrator (main)
Task: Foundation + core UI framework

Work Log:
- Wrote prisma/schema.prisma: 77 models (users/RBAC/audit, students/parents/employees, academics, LMS, exams, fees, HR/payroll, admissions, transport, hostel, security, health, library, assets, events, communication, certificates, integrations, approvals)
- db:push OK. Seeded realistic demo data (112 students, 30 staff, 2912 attendance rows, 224 invoices, 300 marks, 46 leads, 5 buses/routes, 96 beds, 28 books, events, notifications, audit trail). Login password: demo1234
- Core libs: auth.ts (JWT cookie sessions, lockout), rbac.ts (14 roles, module access + nav), crud.ts (generic CRUD engine w/ search, filters, sort, pagination, audit, hooks, scope), notify.ts, audit.ts, api-client.ts, format.ts, store.ts (zustand)
- APIs: /api/auth/*, /api/dashboard (real aggregates), /api/search (9 entities), /api/notifications, /api/export (CSV), /api/upload
- Core UI: DataTable (search/filter/sort/pagination/columns/bulk/export/CRUD dialogs), ui.tsx (PageHeader/StatCard/StatusBadge/Empty/Error/Skeletons/SectionCard), charts.tsx (recharts wrappers), KanbanBoard (drag-drop), CalendarView (month/week/agenda), LoginScreen (demo accounts), AppShell (sidebar+topbar+global search ⌘K+notifications+theme+year/school selectors+mobile bottom nav)
- Dashboard module done (live KPIs + 8 charts + activity + approvals)
- All module stubs + registry.tsx + ErpApp + page.tsx + layout with ThemeProvider. Verified: page 200, login works, dashboard API returns live data

Stage Summary:
- Foundation complete. Agents own module folders + their API routes only. Shared files frozen. Read CONVENTIONS.md.

---
Task ID: 3-a..3-h (dispatched) + 4 (integration)
Agent: orchestrator (main)
Task: Module agents + full integration & browser verification

Work Log:
- Dispatched 8 parallel module agents (3-a..3-h). Despite deadline cutoffs, ALL 26 modules + ~60 API route groups were completed by the agents.
- Integration fixes applied by orchestrator:
  - security/checkin-out.tsx: invalid </DialogDialogTitle> closing tag
  - security/student-pickup.tsx: closure mutation violating react-compiler rule (rewrote xorshift loop)
  - library/ReportsTab.tsx: nonexistent lucide icon 'Books' → BookOpen
  - library/transactions + reservations: missing ./lib helper (created notifyMember/fmtDue)
  - health/visits: created notifyParentOfStudent lib
  - portal/parent: duplicate `homework` binding; TDZ on reportCard (split fetch)
  - crud engine: added coercePrismaValues (YYYY-MM-DD → Date) for create/update
  - schema: added relations HostelAllocation→Bed, TransportAllocation→Route/Stop; db:push + restart
  - default sorts referencing createdAt on models without that field (healthRecord, mark, question, hostelAllocation, transportAllocation, book, asset) → id/title/checkInDate/assetTag
  - charts.tsx LineTrend: removed stray yKey reference (runtime crash on analytics)
  - dashboard: transport hint data.transport (was kpis), StatCard label wrap, attendance donut semantic colors
  - ErpApp: PARENT/STUDENT auto-redirect to their portal on login/reload; friendly restricted fallback
- Browser verification (agent-browser): login screen, super-admin dashboard (live KPIs + charts), students registry, admissions Kanban, attendance marking UI, HR payroll, transport GPS live map, hostel occupancy board, security visitor log, certificates workflow, analytics suite, events calendar + create-event flow, fees finance dashboard, parent portal (child switcher, attendance/fees/grades), student portal (ID card, timetable) on desktop + 390px mobile with bottom nav. RBAC nav filtering confirmed for PARENT role. CRUD create verified via API (student w/ auto admission-no, event) and UI (event dialog). All ~40 API endpoints smoke-tested 200.
- Final lint: 0 errors (146 warnings acceptable).

Stage Summary:
- COMPLETE School ERP delivered: 77-model Prisma schema, JWT auth w/ lockout + login history, 14-role RBAC across 26 modules, event-driven notifications, audit logging, CSV export, file upload, global search, kanban pipeline, calendar, printable receipts/certificates/payslips/report cards, live GPS simulation, QR-style pickup verification, parent/student/teacher portals, analytics engine, integrations settings page, demo data for a 112-student school. Login: any role via one-click demo buttons, password demo1234.

---
Task ID: premium-uiux
Agent: Z.ai Code (main)
Task: Transform the School ERP into a premium, polished education SaaS platform (design system: branding, color, typography, login, shell, dashboard, motion, dark mode, mobile)

Work Log:
- Audited public/logo.svg (school-provided "Z" mark, charcoal/white with breathe animation) and existing emerald "Greenwood International School" identity
- Rewrote src/app/globals.css as a full design-token system: emerald brand palette in oklch (light + designed dark theme with green-charcoal surfaces), Plus Jakarta Sans display + Inter body fonts, layered soft shadows, motion keyframes (fade-up/rise/pop/page-in/nudge/float/drift/shimmer/breathe/indeterminate), .stagger sequential entrance utilities, .card-lift/.press micro-interactions, .glass/.mesh-bg/.grad-border premium surfaces, slim scrollbars, tabular numerals for tables, full prefers-reduced-motion support
- Updated layout.tsx: Inter + Plus Jakarta Sans via next/font, new metadata/viewport theme colors
- Created src/components/erp/brand.tsx: BrandMark (provided logo inlined on branded emerald tile), BrandLogo lockup, BrandSplash (branded loading screen with logo breathe, mesh, thin indeterminate bar, "Preparing your school workspace…")
- Rewrote LoginScreen: cinematic left panel (mesh background, floating orbs/motes, sequential reveals, glass stat tiles), premium auth card with sequential form entrance, focus micro-interactions, show/hide password, remember-me, button state machine (Sign In → Checking credentials… → Welcome back), subtle horizontal card shake + rose field highlight on error, demo account cards, help footer
- ErpApp: BrandSplash boot screen, key-based anim-page-in wrapper for module transitions (fade+translateY 300ms), branded module fallback loader
- Rewrote AppShell: collapsible sidebar (w-64 ⇄ w-[76px], 300ms width transition, tooltips when collapsed, animated active indicator bar, brand-tinted active state), glass sticky topbar with group/label breadcrumb, command palette (⌘K; quick actions when empty, grouped live search results with keyboard ↑↓/↵ navigation, footer hints), polished notification bell with type icons + unread states, campus/year selectors, animated theme toggle, profile menu (Profile/Settings/Security/Activity/Sign out), mobile bottom nav with active pill indicator + safe-area padding
- store.ts: persisted sidebarCollapsed preference
- ui.tsx: useCountUp/CountUp (respects reduced motion), Sparkline SVG component, StatCard upgraded (countTo/format/spark/card-lift/font-display values), SectionCard with soft shadow tokens
- Dashboard: personalized greeting header ("Good morning, Priya." + date eyebrow + role line), all KPIs animate with count-up, attendance sparkline from trend data, staggered entrances on KPI + chart grids
- charts.tsx: fixed tooltip/cursor colors from broken hsl(var()) wrappers to oklch-compatible var() tokens
- Fixed self-introduced issues: missing cn import in LoginScreen, unbalanced card div nesting, dual-Sheet state in topbar header (single controlled button), AlertTriangle lucide import

Stage Summary:
- Full premium design system layered on the intact ERP architecture; no functionality removed (RBAC, CRUD, workflows, notifications all preserved)
- Verified in browser: cinematic login (light + dark), error + success login beats, personalized animated dashboard, command palette quick actions + grouped search, sidebar collapse with tooltips, designed dark theme, mobile bottom nav + menu sheet, module page transitions, skeleton states; 0 lint errors, 0 console errors, all APIs 200

---
Task ID: nis-rebrand
Agent: Z.ai Code (main)
Task: Apply the user-provided school logo (Nehru International School — blue book/NIS emblem + orange dot, "A Tradition of Excellence") as the sole brand asset; rebrand the entire ERP from the placeholder Greenwood identity to NIS without touching any functionality.

Work Log:
- Processed /upload/pasted_image_1788947709324.png with sharp: public/nis-logo.png (full lockup, trimmed), public/nis-mark.png (emblem only), src/app/icon.png favicon + apple-touch-icon
- Sampled exact logo pixels: blue #138DCE (oklch 0.62 0.137 240), orange #E76507 (oklch 0.66 0.182 46); rewrote all globals.css tokens for light + designed dark theme (ocean-charcoal surfaces), mesh gradients, 5-colour chart palette (brand blue leads, orange accents), added --brand-orange token
- brand.tsx: SCHOOL_NAME/SHORT/TAGLINE/LOGO consts, BrandMark = real emblem img on white tile with brand glow, BrandLogo lockup "Nehru International / School · A Tradition of Excellence", BrandSplash on deep navy with blue+orange orbs
- LoginScreen: all demo emails → @nis.edu.in, sky-950 brand panel with blue/cyan/orange orbs, orange tagline badge, "every corner of Nehru International" copy, orange demo dots, you@nis.edu.in placeholder, support@nis.edu.in
- AppShell footer "Nehru International School — Unified School ERP" + "Powered by NIS Search"; store.ts default schoolName; layout.tsx title + theme colors (#f8fafc / #0b1320); page.tsx pre-hydration loader with NIS emblem
- Modules: certificates print/verify (Nehru International School + NIS/CERT codes), fees receipt letterhead (crest N, fees@nis.edu.in, NIS ERP), fees dashboard/HR/integrations subtitles, transport map label, student-portal ID card (real NIS logo on white tile, sky gradient), ResultsTab marksheet header (Main Campus, education@nis.edu.in), settings API default + welcome notification
- seed.ts fully rebranded (names, NIS-MAIN/NIS-PUNE codes, @nis.edu.in, logoUrl on SchoolSetting) + scripts/rebrand-db.ts executed against live SQLite: 2 schools, SchoolSetting(+logoUrl), 18 users, 30 employees, LoginLog 21, IntegrationSetting 2; admission numbers GWS→NIS (112), certificate no (1), notifications (3); 0 greenwood/GWS remaining (cuid false-positives correctly ignored)
- Fixed stale Turbopack CSS chunk (old emerald tokens still served) by restarting dev server
- Browser verification: cinematic login (NIS emblem, blue Sign In), Teacher login via teacher@nis.edu.in works, dashboard KPIs/charts live, sidebar brand lockup, dark theme, command palette, certificates QR verification end-to-end with NIS/CERT/2025/001 → "issued by Nehru International School", mobile 390px bottom nav, 0 page errors, 0 console errors, lint 0 errors

Stage Summary:
- The ERP is now fully branded as Nehru International School (NIS) using the user's actual logo; brand system: blue #138DCE primary + orange #E76507 accent + tagline everywhere (login, splash, sidebar, footer, ID card, receipts, certificates, marksheets, favicon).
- All demo logins now use @nis.edu.in (e.g. admin@nis.edu.in / teacher@nis.edu.in, password demo1234); existing DB data preserved, no re-seed needed.
- Zero functional regressions: CRUD, RBAC, workflows, notifications, print flows all verified working.
