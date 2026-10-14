#!/bin/bash
set -e
echo "🚀 Initializing School ERP Monorepo Environment..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm could not be found. Please install pnpm."
    exit 1
fi

echo "📦 Installing Monorepo dependencies..."
pnpm install

echo "📄 Copying .env.example to .env..."
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "🗄️ Initializing Prisma database..."
pnpm db:generate
pnpm db:push
pnpm db:seed

echo "✅ Setup complete! Run 'pnpm dev' to start all applications."
