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
