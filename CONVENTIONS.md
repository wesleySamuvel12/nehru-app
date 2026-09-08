# ERP Development Conventions (READ FULLY BEFORE CODING)

## Architecture
- Next.js 16 App Router, single-page app. **ONLY page route is `src/app/page.tsx`** — NEVER create other pages/routes (`app/**/page.tsx`). API routes are fine.
- Modules are client views registered in `src/lib/registry.tsx` (already wired). You ONLY create files inside:
  - `src/components/modules/<your-module>/index.tsx` (and sibling files in that folder)
  - `src/app/api/<your-entities>/route.ts` and `src/app/api/<your-entities>/[id]/route.ts`
- DO NOT edit shared files: `src/lib/*`, `src/components/erp/*` (except your own module folder), `prisma/schema.prisma`. If you need a schema change or shared fix, append it to `/home/z/my-project/worklog.md` under a "REQUESTS" section and implement a workaround.
- Prisma client: `import { db } from '@/lib/db'` (SQLite, no enums/Json — String fields).
- Currency INR, Indian school context (Greenwood International School, Mumbai).

## API CRUD engine (`@/lib/crud`) — USE THIS for all entity APIs
```ts
// src/app/api/students/route.ts
import { NextRequest } from 'next/server'
import { defineCrud } from '@/lib/crud'

const crud = defineCrud({
  model: 'student',            // prisma delegate name
  module: 'students',          // rbac module key (see src/lib/rbac.ts)
  searchFields: ['firstName', 'lastName', 'admissionNo'],
  filterFields: ['classId', 'sectionId', 'status', 'gender'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['firstName', 'lastName'],
  include: { parent: true, klass: true, section: true },  // optional prisma include
})

export const GET = crud.list    // supports ?page=&pageSize=&q=&sortBy=&sortDir=&all=1&<filters>
export const POST = crud.create

// src/app/api/students/[id]/route.ts
export const PATCH = crud.update
export const DELETE = crud.remove
```
Auth (JWT cookie) + RBAC + audit logging are automatic. `afterCreate/afterUpdate(row, session)` hooks → use for notifications via `notify()` (`@/lib/notify`) and side effects. `scope(session)` → row-level security extra where (e.g. PARENT sees own children).

List response shape: `{ data: [...], meta: { page, pageSize, total, totalPages } }`.

## Client API helper (`@/lib/api-client`)
- `list(endpoint, {page,pageSize,q,sortBy,sortDir,all:1,...filters})` → `{data, meta}`
- `createOne(endpoint, body)` / `updateOne(endpoint, id, body)` / `deleteOne(endpoint, id)` / `api(path, init)`
- Errors throw `ApiError` with user-friendly `message`. Never expose raw errors.

## DataTable component (`@/components/erp/DataTable`) — PRIMARY building block
Props (all optional except endpoint/columns):
```ts
<DataTable
  endpoint="api/students"
  columns={[{ key:'firstName', label:'First Name' }, { key:'status', label:'Status', badge:true },
            { key:'totalAmount', label:'Amount', money:true }, { key:'dueDate', label:'Due', date:true },
            { key:'actions', label:'', sortable:false, render:(row)=><Badge>...</Badge> }]}
  fields={[{ name:'firstName', label:'First Name', required:true }, { name:'classId', label:'Class', type:'select',
            optionsLoader: async () => (await list('api/academics/classes',{all:1})).data.map(c=>({label:c.name,value:c.id})) },
            { name:'notes', label:'Notes', type:'textarea', colSpan:2 }]}   // enables Create/Edit dialogs
  filters={[{ key:'status', label:'Statuses', options:[{label:'Active',value:'ACTIVE'}] }]}
  defaultSort={{ sortBy:'createdAt', sortDir:'desc' }}
  searchPlaceholder="Search students…"
  exportEntity="students"       // enables CSV export via /api/export
  bulkActions={[{ label:'Delete', danger:true, onClick: async (ids, rows, refresh)=>{...} }]}
  rowActions={(row, {refresh}) => <Button .../>}
  toolbar={({refresh, meta}) => <Button .../>}
  onRowClick={(row)=>...}
  transformSave={(values, mode)=>({ ...values })}   // e.g. recalc totals
  emptyTitle="No students yet" emptyDescription="..."
  refreshKey={n}   // bump to refetch
/>
```
Create/Edit/delete/search/filter/sort/pagination/column-visibility/loading/empty/error states are ALL built in. You compose business logic around it.

## Shared UI helpers (`@/components/erp/ui`)
- `PageHeader{title,subtitle,actions,breadcrumbs}`
- `StatCard{label,value,icon,tone:'default'|'success'|'warning'|'danger'|'info',hint,onClick}`
- `StatusBadge{value}` — auto colors for ACTIVE/PENDING/APPROVED/OVERDUE/etc.
- `EmptyState`, `ErrorState`, `TableSkeleton`, `CardGridSkeleton`
- `SectionCard{title,description,actions,children}` — bordered content card

## Charts (`@/components/erp/charts`) — recharts wrappers
`TrendArea{data,xKey,yKey,color,xFormatter,yFormatter}` · `BarsChart{data,xKey,series[{key,label,color}],stacked,layout:'vertical'}` · `LineTrend` · `DonutChart{data,nameKey,valueKey}` · `GaugeChart{value,label,color}`. Colors: use CHART_COLORS or hex like '#10b981','#0ea5e9','#f59e0b','#8b5cf6','#f43f5e'.

## Other shared components
- `KanbanBoard` (`@/components/erp/KanbanBoard`): `{endpoint, columns:[{key,label}], titleField, subtitleField, renderCard, onChanged}` — drag & drop updates the `stage` field via PATCH.
- `CalendarView` (`@/components/erp/CalendarView`): `{events:[{id,title,startDate,type,color,location,registrationRequired}], initialMode:'month'|'week'|'agenda', onEventClick, onCreateClick}`.
- `FormFields`/`validateForm` from DataTable file for custom dialogs.
- Toasts: `import { toast } from 'sonner'` → `toast.success()`, `toast.error()`.
- shadcn/ui components in `src/components/ui` (dialog, sheet, tabs, select, badge, card, table, dropdown-menu, alert-dialog, popover, calendar, progress, avatar, switch, textarea, command, etc.)
- Icons: `lucide-react`. Format helpers: `@/lib/format` → `inr(), fmtDate(), fmtDateTime(), fmtTime(), titleCase(), timeAgo(), initials()`.
- Store: `useErp()` from `@/lib/store` → `{ session, activeModule, setModule(key, params), moduleParams, academicYearId }`.

## Quality bar (NON-NEGOTIABLE)
- Every button does something real; every form saves via API; dashboards query live data.
- Loading skeletons while fetching; friendly error states with retry; empty states with guidance.
- Responsive: mobile-first, works at 375px; tables scroll or collapse; touch targets ≥ 40px.
- No hardcoded fake numbers — always fetch from your API.
- Status values match seed data (e.g. 'ACTIVE','PENDING','APPROVED','OVERDUE').
- Use `export default function ModuleName()` in your module index.tsx.
- TypeScript strict. ESLint pass: `bun run lint` (only check YOUR files for errors; warnings acceptable).
- Tabs (`Tabs`) for sub-sections of a module; keep one polished primary flow per module.

## Demo data reference (already seeded — verify against it)
- 112 students (grades 1-12), 30 employees (18 teachers), classes Grade 1..12 with sections A/B (A only for 11-12).
- Students include parent, klass, section relations. Parent portal users: parent@greenwood.edu.in (children in Grade 8), student@greenwood.edu.in.
- Fee invoices INV-2025-XXXXX per student (Term1 paid, Term2 pending), payments with receiptNo RCPT-2025-XXXXX.
- Exams: Unit Test 1 + Term 1 (published, marks + report cards), Term 2 scheduled.
- Leads 46 across NEW→ENROLLED; Applications 18; 5 vehicles/routes with stops + GPS; 2 hostels, 96 beds; 28 books; assets; visitors; health records; events; announcements; notifications; audit logs; integrations 12 rows; academic year + terms.

## Endpoints likely existing (check before duplicating)
`/api/auth/login|logout|me`, `/api/dashboard`, `/api/search`, `/api/notifications`, `/api/export?entity=`, `/api/upload` (multipart 'file' → {url}), `/api/settings/schools`, `/api/academics/years` (create if missing — academics agent owns it).
