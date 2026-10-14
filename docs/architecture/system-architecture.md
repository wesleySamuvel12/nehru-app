# Technical Stack & Service Boundaries

| Tier | Technology | Purpose |
|---|---|---|
| Backend Framework | NestJS (Express adapter) | Modular enterprise backend |
| ORM | Prisma ORM | Type-safe schema migrations & database access |
| Database | PostgreSQL 16 | Relational store for users, enrollment, financials |
| Cache & PubSub | Redis 7 | Session store, rate limiting, and real-time events |
| Frontend Tier | Next.js 15 + React 19 + Tailwind CSS | Role-specific lightweight SPAs |
| Shared Monorepo | pnpm workspaces | Zero-redundancy shared types and schemas |
