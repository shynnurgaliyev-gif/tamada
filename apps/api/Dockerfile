# ---- Builder ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy manifests for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/config/ ./packages/config/
COPY packages/types/ ./packages/types/
COPY packages/utils/ ./packages/utils/
COPY apps/api/ ./apps/api/

# Build packages in order
RUN pnpm --filter @tamada/types build
RUN pnpm --filter @tamada/config build
RUN pnpm --filter @tamada/utils build
RUN pnpm --filter @tamada/api build

# Create lightweight production bundle
RUN pnpm --filter @tamada/api deploy --legacy /deploy
RUN cp -r apps/api/dist /deploy/dist

# ---- Runner ----
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/dist ./dist
COPY --from=builder /deploy/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
