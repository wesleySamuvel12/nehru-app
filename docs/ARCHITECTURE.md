# School ERP Architecture

## Core layers

```text
src/
├── app/                 Next.js pages and HTTP API routes
├── components/
│   ├── erp/             application shell, login, navigation, reusable ERP UI
│   ├── modules/         shared business-domain screens
│   └── ui/              shadcn/Radix primitives
├── lib/                 authentication, RBAC, database, API client, utilities
└── roles/               role-owned landing entrypoints and login definitions
```

## Role folders

Every supported login owns a folder in `src/roles/<role>/`.

Each folder contains:

- `index.ts` — the role identifier, display label, and landing module.
- `dashboard.tsx` — the role-owned entrypoint into its existing dashboard or domain workspace.

The current roles are:

| Role | Folder | Landing workspace |
| --- | --- | --- |
| Super Admin | `super-admin` | `dashboard` |
| School Admin | `school-admin` | `dashboard` |
| Principal | `principal` | `dashboard` |
| Teacher | `teacher` | `academics` |
| Accountant | `accountant` | `fees` |
| HR | `hr` | `hr` |
| Counsellor | `counsellor` | `admissions` |
| Librarian | `librarian` | `library` |
| Transport Manager | `transport` | `transport` |
| Hostel Warden | `warden` | `hostel` |
| Nurse / Doctor | `nurse` | `health` |
| Security Staff | `security` | `security` |
| Parent | `parent` | `parent-portal` |
| Student | `student` | `student-portal` |

## Login and navigation flow

```text
LoginScreen
  → /api/auth/login
  → src/roles/index.ts resolves the landing module
  → ErpApp loads the matching role dashboard entrypoint
  → shared domain module
  → API route
  → Prisma / SQLite
```

## Collaboration rules

1. Put role-only composition and future role-specific screens in `src/roles/<role>/`.
2. Keep cross-role business screens in `src/components/modules/<domain>/`.
3. Keep reusable UI primitives in `src/components/ui/` and shell-level UI in `src/components/erp/`.
4. Keep API contracts under `src/app/api/<domain>/`; do not move database access into role folders.
5. Keep authentication in `src/lib/auth.ts` and authorization in `src/lib/rbac.ts`.
6. Preserve shared modules instead of copying equivalent screens into multiple role folders.
7. Add a new role in `src/lib/rbac.ts`, create its `src/roles/<role>/` folder, register it in `src/roles/index.ts` and `src/roles/client.tsx`, then add RBAC/API coverage.

## Ownership boundaries

| Area | Owner boundary |
| --- | --- |
| Role landing and role-only UI | `src/roles/` |
| Business-domain UI | `src/components/modules/` |
| Shared UI and shell | `src/components/ui/`, `src/components/erp/` |
| Authentication, RBAC, data helpers | `src/lib/` |
| Route handlers | `src/app/api/` |
| Data schema and seed data | `prisma/` |
