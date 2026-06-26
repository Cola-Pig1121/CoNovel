# Multi-stage Dockerfile for CoNovel

# ===== Base Stage =====
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ===== Dependencies Stage =====
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/studio/package.json ./packages/studio/
RUN pnpm install --frozen-lockfile || pnpm install

# ===== Build Core Stage =====
FROM base AS build-core
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY . .
RUN pnpm --filter @conovel/core build

# ===== Build Studio Stage =====
FROM base AS build-studio
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/studio/node_modules ./packages/studio/node_modules
COPY --from=build-core /app/packages/core/dist ./packages/core/dist
COPY --from=build-core /app/packages/core/package.json ./packages/core/
COPY . .
RUN pnpm --filter @conovel/studio build

# ===== Studio Production Stage =====
FROM node:20-alpine AS studio
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/studio/node_modules ./packages/studio/node_modules
COPY --from=build-core /app/packages/core/dist ./packages/core/dist
COPY --from=build-core /app/packages/core/package.json ./packages/core/
COPY --from=build-studio /app/packages/studio/.next ./packages/studio/.next
COPY --from=build-studio /app/packages/studio/public ./packages/studio/public
COPY --from=build-studio /app/packages/studio/package.json ./packages/studio/

WORKDIR /app/packages/studio

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]

# ===== API Production Stage (Optional) =====
FROM node:20-alpine AS api
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=build-core /app/packages/core/dist ./packages/core/dist
COPY --from=build-core /app/packages/core/package.json ./packages/core/

# Copy CLI for API mode
COPY packages/cli/package.json ./packages/cli/
COPY --from=deps /app/packages/cli/node_modules ./packages/cli/node_modules

EXPOSE 3001

CMD ["node", "packages/core/dist/api.js"]
