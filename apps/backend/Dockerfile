FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages ./packages/
RUN pnpm install --filter @school-erp/backend...

FROM dependencies AS builder
COPY . .
RUN pnpm --filter @school-erp/backend db:generate
RUN pnpm --filter @school-erp/backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/main.js"]
