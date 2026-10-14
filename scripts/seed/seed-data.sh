#!/bin/bash
set -e
echo "🌱 Seeding default school data..."
pnpm --filter @school-erp/backend db:seed
echo "✅ Seeding finished."
