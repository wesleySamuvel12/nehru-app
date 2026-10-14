#!/bin/bash
set -e
echo "🗄️ Running database initialization..."
pnpm --filter @school-erp/backend db:push
pnpm --filter @school-erp/backend db:seed
echo "✅ Database ready."
