# Monorepo Workspace Guide

We use **pnpm workspaces** to coordinate dependencies across apps and shared packages.

### Commands
- Run all dev apps: `pnpm dev`
- Run backend only: `pnpm dev:backend`
- Run admin web only: `pnpm dev:admin`
- Build entire workspace: `pnpm build`
- Run tests across workspace: `pnpm test`
