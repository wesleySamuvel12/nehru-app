FROM node:20-alpine AS builder
ARG APP_NAME=admin-web
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY apps/${APP_NAME}/package.json ./apps/${APP_NAME}/
COPY packages ./packages/

RUN pnpm install --filter @school-erp/${APP_NAME}...

COPY apps/${APP_NAME} ./apps/${APP_NAME}/
WORKDIR /app/apps/${APP_NAME}
RUN pnpm build

FROM node:20-alpine AS runner
ARG APP_NAME=admin-web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/${APP_NAME}/.next ./.next
COPY --from=builder /app/apps/${APP_NAME}/public ./public
COPY --from=builder /app/apps/${APP_NAME}/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
