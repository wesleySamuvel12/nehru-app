#!/bin/bash
set -e
echo "⚠️ Resetting database..."
pnpm --filter @school-erp/backend prisma migrate reset --force
echo "✅ Database reset and seeded."
