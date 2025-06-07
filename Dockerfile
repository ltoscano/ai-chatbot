# Multi-stage Dockerfile per Next.js
FROM node:18-alpine AS base

# Installa dipendenze solo quando necessario
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installa dipendenze basate sul package manager preferito
COPY package.json pnpm-lock.yaml* ./
RUN \
    if [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm i --frozen-lockfile; \
    else \
    npm ci; \
    fi

# Stage di sviluppo
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Espone la porta 3000
EXPOSE 3000

# Comando di default per sviluppo
CMD ["npm", "run", "dev"]

# Rebuild delle dipendenze solo quando necessario
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disabilita la telemetria durante il build
ENV NEXT_TELEMETRY_DISABLED 1

# Build dell'applicazione
RUN \
    if [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm run build; \
    else \
    npm run build; \
    fi

# Stage di produzione
FROM base AS production
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia i file necessari
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
