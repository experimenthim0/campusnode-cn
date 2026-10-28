# ==============================================================================
# CampusNode Frontend — Multi-stage Production Dockerfile
# Stage 1: Vite 7 Production Bundle Builder
# Stage 2: Lightweight Nginx Alpine Runtime
# ==============================================================================

# --- Stage 1: Build Application Bundle ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies using reproducible lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build-time environment variable arguments (defaults enable relative same-origin API proxying)
ARG VITE_API_URL=""
ARG VITE_GOOGLE_APPS_SCRIPT_URL=""
ARG VITE_MAINTENANCE_MODE="false"
ARG VITE_DEV_COMMUNITY_URL="https://t.me/+lWss-PdCbGQ0ZDNl"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_APPS_SCRIPT_URL=$VITE_GOOGLE_APPS_SCRIPT_URL
ENV VITE_MAINTENANCE_MODE=$VITE_MAINTENANCE_MODE
ENV VITE_DEV_COMMUNITY_URL=$VITE_DEV_COMMUNITY_URL

# Build optimized production bundle into /app/dist
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check against internal Nginx endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
