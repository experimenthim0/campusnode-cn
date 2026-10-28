# ==============================================================================
# CampusNode Backend — Multi-stage Production Dockerfile
# Base: Debian Bookworm Slim for native Sharp & Prisma 7 engine stability
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install build prerequisites and OpenSSL for Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \ 
    && rm -rf /var/lib/apt/lists/*

# Build-time placeholder allows offline Prisma client generation during npm ci / postinstall
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./
COPY scripts ./scripts/

# Install all dependencies (including devDependencies needed for Prisma generation)
RUN npm ci

# Generate Prisma 7 Client
RUN npx prisma generate

# Prune devDependencies to keep runtime node_modules minimal
RUN npm prune --omit=dev

# --- Stage 2: Production Runtime ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install minimal runtime libraries (OpenSSL for Prisma engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

# Copy production node_modules and generated Prisma client with correct non-root permissions
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.js ./prisma.config.js

# Copy application source files
COPY --chown=node:node . .

USER node

EXPOSE 5000

# Docker-level health check against backend /health endpoint (using native Node 22 fetch)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start Express server with OpenTelemetry preloaded
CMD ["node", "--import", "./lib/telemetry/index.js", "index.js"]
