#!/usr/bin/env bash
# ==============================================================================
# CampusNode — Production Operations & Deployment CLI
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Default configuration files
ENV_FILE="${PROJECT_ROOT}/.env"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Fallback to compose.yaml if compose.production.yaml is missing
if [ ! -f "${PROJECT_ROOT}/${COMPOSE_FILE}" ]; then
  COMPOSE_FILE="compose.yaml"
fi

# Detect Docker Compose binary
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "Error: Docker Compose is not installed or not in PATH." >&2
  exit 1
fi

# Text formatting
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BLUE="\033[34m"
RESET="\033[0m"

log_info() { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# Verify .env file exists
check_env() {
  if [ ! -f "${ENV_FILE}" ]; then
    log_error "Missing .env configuration file."
    echo "  Please create one from the template:"
    echo "    cp .env.example .env"
    echo "  Then edit .env to configure secure production passwords and secrets."
    exit 1
  fi
}

# Load environment variables safely
load_env() {
  check_env
  # Export non-comment lines from .env
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
}

# ------------------------------------------------------------------------------
# Subcommand: help
# ------------------------------------------------------------------------------
cmd_help() {
  echo -e "${BOLD}CampusNode Management CLI${RESET}"
  echo "Institutional Event & Club Management Platform (NIT Jalandhar)"
  echo ""
  echo -e "${BOLD}USAGE:${RESET}"
  echo "  ./scripts/campusnode.sh <command> [options]"
  echo ""
  echo -e "${BOLD}COMMANDS:${RESET}"
  echo "  install    Validate prerequisites, check disk space, and build/pull images"
  echo "  start      Start database, cache, and application containers with health checks"
  echo "  stop       Gracefully stop all CampusNode containers (preserves data)"
  echo "  restart    Gracefully restart containers"
  echo "  status     Display container status, ports, and healthcheck results"
  echo "  logs       Follow live logs (e.g. ./scripts/campusnode.sh logs backend)"
  echo "  migrate    Safely apply Prisma database migrations (prisma migrate deploy)"
  echo "  seed       Seed initial administrator account (requires manual confirmation)"
  echo "  backup     Create a compressed PostgreSQL database snapshot (pg_dump)"
  echo "  update     Safe update workflow (Backup -> Pull -> Migrate -> Restart -> Verify)"
  echo "  help       Show this help message"
  echo ""
  echo -e "${BOLD}ACTIVE CONFIG:${RESET}"
  echo "  Compose file : ${COMPOSE_FILE}"
  echo "  Project root : ${PROJECT_ROOT}"
  echo ""
}

# ------------------------------------------------------------------------------
# Subcommand: install
# ------------------------------------------------------------------------------
cmd_install() {
  log_info "Running initial prerequisite check for CampusNode..."
  check_env
  load_env

  # Check Docker daemon
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker Engine or Docker Desktop."
    exit 1
  fi

  # Check disk space (minimum 5GB recommended)
  FREE_KB=$(df -k "${PROJECT_ROOT}" | awk 'NR==2 {print $4}')
  if [ "${FREE_KB}" -lt 5242880 ]; then
    log_warn "Low disk space detected: $((${FREE_KB} / 1024)) MB available. At least 5 GB is recommended."
  fi

  log_info "Validating Docker Compose configuration..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" config --quiet

  log_info "Preparing application container images..."
  if [ "${COMPOSE_FILE}" = "compose.production.yaml" ]; then
    log_info "Pulling production images from registry..."
    $DOCKER_COMPOSE -f "${COMPOSE_FILE}" pull || {
      log_warn "Registry pull failed or images not yet published. Building locally as fallback..."
      $DOCKER_COMPOSE -f "${COMPOSE_FILE}" build
    }
  else
    log_info "Building images locally..."
    $DOCKER_COMPOSE -f "${COMPOSE_FILE}" build
  fi

  log_success "CampusNode installed and ready to start."
  echo "  Next steps:"
  echo "    1. Start services:  ./scripts/campusnode.sh start"
  echo "    2. Run migrations:  ./scripts/campusnode.sh migrate"
  echo "    3. Seed admin:      ./scripts/campusnode.sh seed"
}

# ------------------------------------------------------------------------------
# Subcommand: start
# ------------------------------------------------------------------------------
cmd_start() {
  load_env
  log_info "Starting CampusNode stack using ${COMPOSE_FILE}..."

  # Start PostgreSQL and Redis first
  log_info "Starting PostgreSQL and Redis..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" up -d postgres redis

  # Wait for postgres health
  log_info "Waiting for database to become healthy..."
  for i in {1..30}; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' campusnode-postgres 2>/dev/null || echo '"unknown"')
    if [ "${STATUS}" = '"healthy"' ]; then
      log_success "PostgreSQL is healthy."
      break
    fi
    if [ "$i" -eq 30 ]; then
      log_error "PostgreSQL failed to report healthy within 30 seconds."
      docker logs --tail 50 campusnode-postgres
      exit 1
    fi
    sleep 1
  done

  # Start backend and frontend
  log_info "Starting backend and frontend services..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" up -d backend frontend

  # Wait for backend health
  log_info "Waiting for backend API healthcheck..."
  for i in {1..40}; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' campusnode-backend 2>/dev/null || echo '"unknown"')
    if [ "${STATUS}" = '"healthy"' ]; then
      log_success "Backend is healthy."
      break
    fi
    if [ "$i" -eq 40 ]; then
      log_warn "Backend is still starting or healthcheck timed out. Check logs with:"
      echo "  ./scripts/campusnode.sh logs backend"
    fi
    sleep 1
  done

  log_success "CampusNode is up and running!"
  echo "  Access URL: ${CLIENT_URL:-http://localhost}"
}

# ------------------------------------------------------------------------------
# Subcommand: stop
# ------------------------------------------------------------------------------
cmd_stop() {
  log_info "Stopping CampusNode containers gracefully (preserving persistent database volumes)..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" stop
  log_success "CampusNode containers stopped."
}

# ------------------------------------------------------------------------------
# Subcommand: restart
# ------------------------------------------------------------------------------
cmd_restart() {
  log_info "Restarting CampusNode stack..."
  cmd_stop
  cmd_start
}

# ------------------------------------------------------------------------------
# Subcommand: status
# ------------------------------------------------------------------------------
cmd_status() {
  echo -e "${BOLD}CampusNode Container Status:${RESET}"
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" ps
  echo ""

  load_env
  echo -e "${BOLD}Health Endpoints Probe:${RESET}"
  # Check backend internal health
  if docker exec campusnode-backend node -e "fetch('http://localhost:5000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" 2>/dev/null; then
    echo -e "  Backend API (/health)       : ${GREEN}ONLINE (200 OK)${RESET}"
  else
    echo -e "  Backend API (/health)       : ${RED}OFFLINE or UNHEALTHY${RESET}"
  fi

  # Check redis
  if docker exec campusnode-redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
    echo -e "  Redis Server (PING)         : ${GREEN}PONG (Authenticated)${RESET}"
  else
    echo -e "  Redis Server (PING)         : ${RED}FAILED${RESET}"
  fi

  # Check postgres
  if docker exec campusnode-postgres pg_isready -U "${POSTGRES_USER:-campusnode_user}" -d "${POSTGRES_DB:-campusnode}" 2>/dev/null | grep -q "accepting connections"; then
    echo -e "  PostgreSQL Database         : ${GREEN}ACCEPTING CONNECTIONS${RESET}"
  else
    echo -e "  PostgreSQL Database         : ${RED}NOT ACCEPTING CONNECTIONS${RESET}"
  fi
}

# ------------------------------------------------------------------------------
# Subcommand: logs
# ------------------------------------------------------------------------------
cmd_logs() {
  shift || true
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" logs -f --tail=100 "$@"
}

# ------------------------------------------------------------------------------
# Subcommand: migrate
# ------------------------------------------------------------------------------
cmd_migrate() {
  load_env
  log_info "Applying Prisma production database migrations..."
  
  # Ensure backend container is running to execute migrations
  if ! docker ps --format '{{.Names}}' | grep -q "^campusnode-backend$"; then
    log_info "Backend container is not running. Launching ephemeral runner..."
    $DOCKER_COMPOSE -f "${COMPOSE_FILE}" run --rm backend npx prisma migrate deploy
  else
    docker exec -t campusnode-backend npx prisma migrate deploy
  fi

  log_success "Database migrations successfully applied."
}

# ------------------------------------------------------------------------------
# Subcommand: seed
# ------------------------------------------------------------------------------
cmd_seed() {
  load_env
  echo -e "${YELLOW}${BOLD}WARNING: You are about to seed the initial super-admin account.${RESET}"
  echo "Admin Email: ${ADMIN_EMAIL:-admin@nitj.ac.in}"
  read -rp "Are you sure you want to proceed? (yes/no): " CONFIRM
  if [ "${CONFIRM}" != "yes" ]; then
    log_info "Seeding cancelled by user."
    exit 0
  fi

  log_info "Seeding initial admin account..."
  if ! docker ps --format '{{.Names}}' | grep -q "^campusnode-backend$"; then
    $DOCKER_COMPOSE -f "${COMPOSE_FILE}" run --rm backend node scripts/seed-admin.js
  else
    docker exec -t campusnode-backend node scripts/seed-admin.js
  fi
  log_success "Administrator account seeded."
}

# ------------------------------------------------------------------------------
# Subcommand: backup
# ------------------------------------------------------------------------------
cmd_backup() {
  load_env
  mkdir -p "${BACKUP_DIR}"

  TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
  BACKUP_FILE="${BACKUP_DIR}/campusnode_backup_${TIMESTAMP}.sql.gz"

  log_info "Creating PostgreSQL database snapshot..."
  
  if ! docker ps --format '{{.Names}}' | grep -q "^campusnode-postgres$"; then
    log_error "PostgreSQL container (campusnode-postgres) is not running. Cannot take backup."
    exit 1
  fi

  docker exec -t campusnode-postgres pg_dump \
    -U "${POSTGRES_USER:-campusnode_user}" \
    -d "${POSTGRES_DB:-campusnode}" \
    --no-owner \
    --clean \
    --if-exists | gzip > "${BACKUP_FILE}"

  # Verify file is not empty
  if [ -s "${BACKUP_FILE}" ]; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_success "Database backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"
    
    # Retention: keep last 14 days of backups
    find "${BACKUP_DIR}" -name "campusnode_backup_*.sql.gz" -mtime +14 -delete 2>/dev/null || true
  else
    log_error "Backup failed or generated an empty file."
    rm -f "${BACKUP_FILE}"
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# Subcommand: update
# ------------------------------------------------------------------------------
cmd_update() {
  load_env
  log_info "Starting safe application update workflow..."

  # Step 1: Pre-update snapshot
  log_info "Step 1/5: Taking pre-update database snapshot..."
  cmd_backup

  # Step 2: Pull updated images
  log_info "Step 2/5: Pulling updated container images..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" pull

  # Step 3: Run database migrations
  log_info "Step 3/5: Running database migrations..."
  cmd_migrate

  # Step 4: Recreate application containers
  log_info "Step 4/5: Recreating application containers..."
  $DOCKER_COMPOSE -f "${COMPOSE_FILE}" up -d --no-deps backend frontend

  # Step 5: Post-update health verification
  log_info "Step 5/5: Verifying health check..."
  sleep 5
  for i in {1..30}; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' campusnode-backend 2>/dev/null || echo '"unknown"')
    if [ "${STATUS}" = '"healthy"' ]; then
      log_success "Update completed successfully. Backend is healthy."
      break
    fi
    if [ "$i" -eq 30 ]; then
      log_error "Backend health verification failed after update."
      echo "  To inspect logs:   ./scripts/campusnode.sh logs backend"
      echo "  To rollback:       Review docs/deployment/04-UPDATE-AND-ROLLBACK.md"
      exit 1
    fi
    sleep 1
  done

  log_success "CampusNode has been updated cleanly to the target version."
}

# ------------------------------------------------------------------------------
# Command Dispatcher
# ------------------------------------------------------------------------------
COMMAND="${1:-help}"

case "${COMMAND}" in
  install)  cmd_install ;;
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  status)   cmd_status ;;
  logs)     cmd_logs "$@" ;;
  migrate)  cmd_migrate ;;
  seed)     cmd_seed ;;
  backup)   cmd_backup ;;
  update)   cmd_update ;;
  help|-h|--help) cmd_help ;;
  *)
    log_error "Unknown command: ${COMMAND}"
    cmd_help
    exit 1
    ;;
esac
