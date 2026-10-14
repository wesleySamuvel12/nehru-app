# Nehru App - School ERP Enterprise Monorepo

Enterprise-grade, multi-tenant School Management & ERP System engineered with a unified monorepo architecture.

## Architecture Overview

```
nehru-app/
├── apps/
│   ├── admin-web/         # Next.js App for Super-Admin, School Admin, Accountant, HR, Librarian, etc.
│   ├── teacher-web/       # Next.js App for Teachers (grading, attendance, timetable, assignments)
│   ├── student-web/       # Next.js App for Students (results, fees, courses, announcements)
│   ├── parent-web/        # Next.js App for Parents (ward progress, fee payments, communications)
│   └── backend/           # NestJS REST & WebSocket API with Prisma ORM & Multi-Tenant Support
├── packages/
│   ├── types/             # Shared TypeScript models and interfaces
│   ├── constants/         # Shared Enums, Role definitions, Status codes
│   ├── validation/        # Zod request/response validation schemas
│   ├── design-tokens/     # Design system tokens (colors, typography, spacing)
│   └── api-client/        # Type-safe isomorphic HTTP API client
├── infrastructure/
│   ├── docker/            # Production Dockerfiles
│   ├── nginx/             # Reverse proxy routing
│   └── monitoring/        # Prometheus & Grafana monitoring
├── docs/                  # Architecture, API, Database, and Security guides
└── scripts/               # Setup, Seeding, and Database Backup scripts
```

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL >= 15
- Redis >= 7

### Installation
```bash
# 1. Install all dependencies across workspace
pnpm install

# 2. Setup environment variables
cp .env.example .env

# 3. Generate Prisma client & migrate database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Start all applications in development mode
pnpm dev
```

### Application URLs (Default)
| Service | URL | Role / Purpose |
|---|---|---|
| Admin Web | `http://localhost:3000` | Super Admin, School Admin, Accountant, HR, Librarian, Security, Health |
| Teacher Web | `http://localhost:3001` | Teachers, Department Heads |
| Student Web | `http://localhost:3002` | Students |
| Parent Web | `http://localhost:3003` | Parents & Guardians |
| Backend API | `http://localhost:4000/api/v1` | NestJS Core API Engine |
| API Docs (Swagger) | `http://localhost:4000/api/docs` | OpenAPI / Swagger Documentation |
