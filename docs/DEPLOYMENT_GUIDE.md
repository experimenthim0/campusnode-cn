# CampusNode — Complete Deployment Guide

**Version:** 1.3.0  
**Project:** CampusNode — NIT Jalandhar Campus Platform  
**Last Updated:** October 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Obtain the Project on a Fresh Laptop](#3-obtain-the-project-on-a-fresh-laptop)
4. [Environment Configuration](#4-environment-configuration)
5. [Start CampusNode on a Fresh Laptop](#5-start-campusnode-on-a-fresh-laptop)
6. [Database Initialization and Prisma Migrations](#6-database-initialization-and-prisma-migrations)
7. [Initial Setup and Administrator Access](#7-initial-setup-and-administrator-access)
8. [Email Testing with Mailpit](#8-email-testing-with-mailpit)
9. [Local Verification Checklist](#9-local-verification-checklist)
10. [Common Problems and Troubleshooting](#10-common-problems-and-troubleshooting)
11. [College Server Deployment — Internal Testing](#11-college-server-deployment--internal-testing)
12. [Server Data, Backups, and Recovery](#12-server-data-backups-and-recovery)
13. [Updating the Application](#13-updating-the-application)
14. [Operational Commands Reference](#14-operational-commands-reference)
15. [Limitations of This Non-Production Deployment](#15-limitations-of-this-non-production-deployment)
16. [Final Deployment Checklists](#16-final-deployment-checklists)
17. [Known Gaps and Required Manual Actions](#17-known-gaps-and-required-manual-actions)
18. [Making CampusNode Accessible Through the College Domain](#18-making-campusnode-accessible-through-the-college-domain)

---

## 1. Overview

### What CampusNode Does

CampusNode is a campus-wide web platform built for NIT Jalandhar. It provides:

- Event creation, registration, and attendance management (including QR-based check-in)
- Club management and membership
- Announcement and notification broadcasting
- Certificate generation and distribution
- Lost and found reporting
- Campus updates feed
- Role-based access control (students, club heads, faculty, administrators)

### What This Guide Covers

This guide enables you to:

1. Set up CampusNode on a **fresh Windows laptop** using Docker
2. Run and test the full application locally
3. Deploy CampusNode on a **college-controlled Linux server** for internal testing and evaluation
4. Troubleshoot common failures

> **This is not a full production deployment guide.** See [Section 15](#15-limitations-of-this-non-production-deployment) for what additional work is required before production use.

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite (served by Nginx) | React 19, Vite 7 |
| Backend | Node.js + Express | Node 22, Express 5 |
| Database | PostgreSQL | 16 (Alpine) |
| ORM | Prisma | 7.7.0 |
| Cache / Queue | Redis + BullMQ | Redis 7 (Alpine) |
| Real-time | Socket.IO | 4.x |
| Web server | Nginx | 1.27 (Alpine) |
| Containerization | Docker + Docker Compose | Compose v2 |
| Email capture (local) | Mailpit | latest |
| DB browser (local) | Adminer | latest |

### Deployment Environments

| Environment | Compose File | Purpose | Who Should Use |
|---|---|---|---|
| **Local laptop** | `compose.yaml` | Development, testing, demonstration | Developers |
| **College server** | `compose.production.yaml` | Internal evaluation and testing | Tech team + college IT |
| **Production** | Not yet configured | Live student use | Requires additional work — see Section 15 |

### Architecture Diagram

```
Browser (Laptop / Phone)
        │
        │  HTTP :80 (or :8080)
        ▼
┌───────────────────────────────┐
│   Nginx (campusnode-frontend) │  ← Serves React SPA static files
│   Port 80 (host) → 80 (int)  │    Gzip, caching, security headers
└──────────┬────────────────────┘
           │
    /api/* and /socket.io/*
    reverse-proxied internally
           │
           ▼
┌──────────────────────────────────────────┐
│   Express Backend (campusnode-backend)   │
│   Internal port 5000 (not on host)       │
│   ├── REST API routes (/api/*)           │
│   ├── Socket.IO real-time events         │
│   ├── BullMQ email worker (embedded)     │
│   └── QR signing service                │
└────────────┬──────────────┬─────────────┘
             │              │
     Prisma (pg)         IORedis
             │              │
             ▼              ▼
┌────────────────┐  ┌──────────────────────┐
│  PostgreSQL 16 │  │  Redis 7             │
│  campusnode-   │  │  campusnode-redis     │
│  postgres      │  │  BullMQ job queues   │
│  (internal)    │  │  Session caching     │
└────────────────┘  └──────────────────────┘
             │
   (local only)
             ▼
┌──────────────────────────────────────────┐
│ Mailpit (campusnode-mailpit)             │
│ SMTP capture :1025  Web UI :8025         │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ Adminer (campusnode-adminer)             │
│ PostgreSQL web browser :8081 (localhost) │
└──────────────────────────────────────────┘
```

**Internal service communication:** All containers communicate on the internal Docker network `campusnode-network`. PostgreSQL port 5432 and Redis port 6379 are **not exposed to the host** — only the application ports are published.

---

## 2. Prerequisites

### 2.1 Windows Laptop Prerequisites

#### Git

Download from https://git-scm.com/download/win and install with default settings.

Verify:
```powershell
git --version
# Expected: git version 2.x.x
```

#### Docker Desktop (includes Docker Compose v2)

1. Enable **WSL 2** on Windows first (required by Docker Desktop):
   ```powershell
   # Run as Administrator
   wsl --install
   # Restart your computer after this completes
   ```
2. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
3. Install and start Docker Desktop. Wait for the whale icon to appear in the system tray and show "Running".

Verify:
```powershell
docker --version
# Expected: Docker version 26.x.x or later

docker compose version
# Expected: Docker Compose version v2.x.x
```

> **Note:** Docker Desktop must be running before you execute any `docker compose` command. If you see "Cannot connect to the Docker daemon", Docker Desktop is not running.

#### Recommended System Resources

These are recommendations, not verified minimum requirements:

| Resource | Recommendation |
|---|---|
| RAM | 8 GB or more |
| Free disk space | 10 GB or more (images + data) |
| CPU | 4 cores or more |

#### Terminal

Use **Windows PowerShell** (built into Windows) or **Windows Terminal**. All local commands in this guide are written for PowerShell. Do not use Command Prompt (cmd.exe) — some commands will not work.

---

### 2.2 College Linux Server Prerequisites

| Requirement | Details |
|---|---|
| Operating system | Ubuntu 22.04 LTS or Debian 12 (recommended). Other modern Linux distributions are likely compatible but unverified. |
| Docker Engine | Version 24 or later — install via https://docs.docker.com/engine/install/ |
| Docker Compose plugin | Version 2.x — installed automatically with Docker Engine on Ubuntu |
| SSH access | Required with permission to run `sudo` or to execute Docker commands |
| Firewall | Port 80 must be open for internal network access. Port 443 if HTTPS is configured. Ports 5432 and 6379 must remain closed to the outside. |
| Disk space | Minimum 20 GB free recommended |
| RAM | 4 GB minimum; 8 GB recommended |

Install Docker Engine on Ubuntu:
```bash
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER
# Log out and back in for group membership to take effect
```

Verify:
```bash
docker --version
docker compose version
```

---

## 3. Obtain the Project on a Fresh Laptop

### Clone the Repository

```powershell
# Replace <REPO_URL> with the actual GitHub repository URL
git clone <REPO_URL> campusnode-sep
cd campusnode-sep
```

### Directory Structure Relevant to Deployment

```
campusnode-sep/
├── compose.yaml                    ← Local development Compose file
├── compose.production.yaml         ← College server / production Compose file
├── .env.example                    ← Root environment template (copy to .env)
├── .env                            ← Your actual secrets (never commit this)
├── server/
│   ├── Dockerfile                  ← Backend image definition
│   ├── prisma.config.js            ← Prisma 7 configuration
│   ├── prisma/
│   │   ├── schema.prisma           ← Database schema (source of truth)
│   │   └── migrations/
│   │       └── 20261028000000_initial_baseline/
│   │           └── migration.sql   ← Single clean baseline migration
│   └── scripts/
│       ├── seed-admin.js           ← Administrator seeder
│       └── generate-staging-secrets.js ← Secret generator
├── client/
│   ├── Dockerfile                  ← Frontend image definition
│   ├── nginx.conf                  ← Nginx configuration
│   └── .env.example                ← Frontend environment template
└── docs/
    └── DEPLOYMENT_GUIDE.md         ← This file
```

### Identify the Correct Compose File

| Situation | Command |
|---|---|
| Local laptop testing | `docker compose -f compose.yaml ...` or just `docker compose ...` (default) |
| College Linux server | `docker compose -f compose.production.yaml ...` |

> The default `compose.yaml` is automatically used when you run `docker compose` without `-f`. On the college server, always specify `-f compose.production.yaml`.

---

## 4. Environment Configuration

### 4.1 Understanding Environment Files

CampusNode uses two environment files:

| File | Location | Purpose |
|---|---|---|
| Root `.env` | `campusnode-sep/.env` | All backend secrets, database credentials, Redis, JWT, SMTP, and Docker Compose variables |
| Client `.env` | `client/.env` | Frontend-only build-time variables (safe to commit only if they contain no secrets) |

**For Docker Compose deployment (local laptop and college server), only the root `.env` is needed.**

The `client/.env` is used only when running the frontend outside Docker (e.g., `npm run dev` in the client directory). During Docker builds, frontend variables are passed as build arguments from the root `.env`.

### 4.2 Create the Root .env File

```powershell
# From the repository root (campusnode-sep/)
Copy-Item .env.example .env
```

Then open `.env` in a text editor and fill in all required values (see the table below).

### 4.3 Environment Variable Reference

> **Security rules:**
> - Never commit `.env` to Git. It is already in `.gitignore`.
> - Never copy secrets from another developer's `.env`. Generate your own.
> - Frontend variables (`VITE_*`) are embedded in the compiled JavaScript bundle and are visible to anyone who opens the browser. Never put passwords, API keys, or tokens in `VITE_*` variables.
> - Avoid printing your `.env` in terminals where others can see the screen.

#### Group 1 — Application and Network

| Variable | Required? | Local Testing Value | Purpose |
|---|---|---|---|
| `APP_PORT` | No | `80` | Host port that Nginx binds to. Change to `8080` if port 80 is occupied |
| `NODE_ENV` | No | `production` | Node.js environment mode |
| `PORT` | No | `5000` | Internal Express port (keep as 5000) |
| `CLIENT_URL` | Yes | `http://localhost` | Public frontend URL. Used for CORS validation and email verification links |
| `ALLOWED_ORIGINS` | No | `http://localhost,http://127.0.0.1` | Additional CORS-allowed origins (comma-separated) |
| `MAINTENANCE_MODE` | No | `false` | Set to `true` to block all API access with a 503 response |
| `MAINTENANCE_MESSAGE` | No | _(default text)_ | Custom message shown during maintenance mode |

#### Group 2 — PostgreSQL Database

| Variable | Required? | Local Testing Value | Purpose |
|---|---|---|---|
| `POSTGRES_DB` | No | `campusnode` | Database name inside the PostgreSQL container |
| `POSTGRES_USER` | No | `campusnode_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **Yes** | _(generate a strong password)_ | PostgreSQL password — must match the password in `DATABASE_URL` |
| `DATABASE_URL` | **Yes** | See below | Full Prisma connection string |

```
# DATABASE_URL format for Docker Compose (service name 'postgres' is the hostname):
DATABASE_URL=postgresql://campusnode_user:YOUR_POSTGRES_PASSWORD@postgres:5432/campusnode?sslmode=disable
```

> The hostname in `DATABASE_URL` must be `postgres` (the Docker service name), not `localhost`. Inside containers, `localhost` refers to that container itself.

#### Group 3 — Redis

| Variable | Required? | Local Testing Value | Purpose |
|---|---|---|---|
| `REDIS_PASSWORD` | **Yes** | _(generate a strong password)_ | Redis authentication password |
| `REDIS_URL` | **Yes** | See below | Full Redis connection string used by Express and BullMQ |

```
# REDIS_URL format (service name 'redis' is the hostname):
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis:6379
```

#### Group 4 — Authentication and Security

| Variable | Required? | Local Testing Value | Purpose |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | _(generate — see below)_ | JWT signing secret. Must be high-entropy random hex |
| `ADMIN_EMAIL` | No | `admin@nitj.ac.in` | Email for the initial administrator account |
| `ADMIN_PASS` | No | _(generate a strong password)_ | Password for the initial administrator account |
| `COMMON_PASSWORD` | No | _(generate a strong password)_ | Password for seeded test student accounts |

**Generate `JWT_SECRET`:**
```powershell
# Run from anywhere with Node.js installed
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Group 5 — Ed25519 QR Ticket Signing

Required for the QR check-in feature. The keys must be in PEM format on a single line with `\n` replacing real newlines.

| Variable | Required? | Purpose |
|---|---|---|
| `QR_SIGNING_KEY_ID` | No | Identifier for key rotation tracking (e.g., `cn-qr-nitj-2026-01`) |
| `QR_SIGNING_PRIVATE_KEY` | No | Ed25519 private key PEM (single-line with `\n`) |
| `QR_SIGNING_PUBLIC_KEY` | No | Ed25519 public key PEM (single-line with `\n`) |

**Generate QR keys:**
```powershell
# Run from the server directory
cd server
node scripts/generate-qr-keypair.js
```

Or generate all secrets at once (JWT + QR + VAPID + passwords):
```powershell
cd server
node scripts/generate-staging-secrets.js
```

Copy the output values into your `.env` file manually. **Do not commit the generated values.**

#### Group 6 — Email (SMTP)

| Variable | Required? | Local Testing Value | Purpose |
|---|---|---|---|
| `SMTP_HOST` | No | `mailpit` | SMTP server hostname. For local Docker: `mailpit` (service name). For real SMTP: your provider's host |
| `SMTP_PORT` | No | `1025` | SMTP port. Mailpit: `1025`. Real SMTP (STARTTLS): `587`. SSL: `465` |
| `SMTP_SECURE` | No | `false` | Set to `true` only when using port 465 with SSL |
| `SMTP_USER` | No | _(empty for Mailpit)_ | SMTP username for authenticated providers |
| `SMTP_PASS` | No | _(empty for Mailpit)_ | SMTP password for authenticated providers |
| `EMAIL_FROM` | No | `CampusNode <no-reply@campusnode.nitj.ac.in>` | Sender name and address shown in emails |
| `EMAIL_FROM_NAME` | No | `CampusNode Support` | Sender display name |

> **Important:** When running in Docker Compose, `SMTP_HOST` must be set to `mailpit` (the Docker service name), not `localhost`. From inside the backend container, `localhost` refers to the backend container itself, not Mailpit.

#### Group 7 — External Integrations (Optional)

| Variable | Required? | Purpose |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary account name for image uploads (event banners, club logos) |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `CLOUDINARY_FOLDER_PREFIX` | No | Folder prefix for uploaded assets |
| `VAPID_PUBLIC_KEY` | No | Web Push public key (P-256). Required for browser push notifications |
| `VAPID_PRIVATE_KEY` | No | Web Push private key |
| `VAPID_SUBJECT` | No | Contact email for push notification authority |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for AI-powered feedback analysis |
| `OPENROUTER_MODEL` | No | Model identifier for OpenRouter |

**Generate VAPID keys** (included in `generate-staging-secrets.js` output, or run separately):
```powershell
cd server
node scripts/generate-staging-secrets.js
# Look for the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY lines in the output
```

#### Group 8 — Frontend Build Variables (client/.env or Compose build args)

These are baked into the React bundle at build time.

| Variable | Required? | Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | No | _(empty string)_ | Backend API base URL. Leave empty — Nginx proxies `/api/*` to the backend automatically |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | No | Your Apps Script URL | Google Apps Script endpoint for contact/feedback forms |
| `VITE_MAINTENANCE_MODE` | No | `false` | Locks the frontend UI during maintenance |
| `VITE_DEV_COMMUNITY_URL` | No | Telegram link | Developer community link shown in the UI |

> `VITE_API_URL` must remain empty (`""`) in Docker Compose deployments. Nginx handles all `/api/` and `/socket.io/` proxying internally. Setting it to a URL causes double-prefixing (`/api/api/...`).

#### Group 9 — Production Docker Registry (college server only)

| Variable | Required? | Purpose |
|---|---|---|
| `BACKEND_IMAGE` | No | Docker image path for backend (used by `compose.production.yaml` to pull from a registry) |
| `FRONTEND_IMAGE` | No | Docker image path for frontend |
| `IMAGE_TAG` | No | Image version tag |

For local builds (laptop), these are not needed — images are built from source.

### 4.4 Generating Secure Passwords

For all passwords and secrets, use cryptographically random values. Do not reuse passwords between services or environments.

```powershell
# Generate a strong random password (32 bytes = 43 base64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Generate a JWT secret (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate PostgreSQL password (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Generate Redis password (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 4.5 Minimum Local .env for First Run

The following is the minimum set of variables you must set in `.env` for a successful local Docker Compose startup. Replace all placeholder values:

```env
# Minimum local .env
APP_PORT=80
NODE_ENV=production
CLIENT_URL=http://localhost
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

POSTGRES_DB=campusnode
POSTGRES_USER=campusnode_user
POSTGRES_PASSWORD=<your-strong-postgres-password>
DATABASE_URL=postgresql://campusnode_user:<your-strong-postgres-password>@postgres:5432/campusnode?sslmode=disable

REDIS_PASSWORD=<your-strong-redis-password>
REDIS_URL=redis://:<your-strong-redis-password>@redis:6379

JWT_SECRET=<64-byte-hex-from-node-crypto>

ADMIN_EMAIL=admin@nitj.ac.in
ADMIN_PASS=<your-strong-admin-password>

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
```

---

## 5. Start CampusNode on a Fresh Laptop

All commands in this section are run in PowerShell from the **repository root** (`campusnode-sep/`), unless stated otherwise.

### Step 1 — Navigate to the Project Directory

```powershell
cd C:\path\to\campusnode-sep
```

### Step 2 — Verify Docker is Running

```powershell
docker info
# Expected: Shows server information including container count.
# If you see "Cannot connect to the Docker daemon", open Docker Desktop first.
```

### Step 3 — Configure Environment Files

```powershell
# Only needed on first run — skip if .env already exists
Copy-Item .env.example .env
```

Open `.env` and fill in all required values as described in [Section 4](#4-environment-configuration).

Verify the file exists and is not empty:
```powershell
Get-Item .env
```

### Step 4 — Build Docker Images

```powershell
docker compose build
```

This builds the backend (Node.js + Prisma) and frontend (React + Nginx) images from source. The first build downloads base images and installs dependencies — it may take 5–15 minutes on a fresh system. Subsequent builds are faster due to Docker layer caching.

Expected output ends with something like:
```
 => => naming to docker.io/library/campusnode-backend:latest
 => => naming to docker.io/library/campusnode-frontend:latest
```

### Step 5 — Start All Services

```powershell
docker compose up -d
```

This starts the following services in the correct dependency order:
1. `campusnode-postgres` — PostgreSQL starts and becomes healthy
2. `campusnode-redis` — Redis starts and becomes healthy
3. `campusnode-mailpit` — Mailpit starts
4. `campusnode-migration` — Applies Prisma migrations (runs once, then exits)
5. `campusnode-backend` — Starts only after `migration` completes successfully
6. `campusnode-frontend` — Starts only after `backend` becomes healthy
7. `campusnode-adminer` — Starts after `postgres` is healthy

### Step 6 — Check Service Health

```powershell
docker compose ps
```

After about 60–90 seconds, expected state:

```
NAME                    STATUS
campusnode-postgres     Up X minutes (healthy)
campusnode-redis        Up X minutes (healthy)
campusnode-mailpit      Up X minutes
campusnode-migration    Exited (0)              ← Expected: completed successfully
campusnode-backend      Up X minutes (healthy)
campusnode-frontend     Up X minutes (healthy)
campusnode-adminer      Up X minutes
```

> The `migration` service exiting with code 0 is correct and expected. It is a one-shot service.

### Step 7 — View Logs

```powershell
# All services
docker compose logs

# Follow live logs
docker compose logs -f

# Specific service
docker compose logs backend
docker compose logs -f backend

# Migration service (see if migrations applied correctly)
docker compose logs migration
```

### Step 8 — Open the Application

| Service | URL | Notes |
|---|---|---|
| Frontend (CampusNode app) | http://localhost | Main application |
| Backend health check | http://localhost/health | Should return `{"ok":true,...}` |
| Mailpit web UI | http://localhost:8025 | Email capture inbox |
| Adminer (DB browser) | http://localhost:8081 | Local only |

### Step 9 — Stop Services

```powershell
# Stop all containers (preserves data volumes)
docker compose down

# Stop a single service
docker compose stop backend
```

> **Never run `docker compose down -v`** during normal development. The `-v` flag deletes all data volumes including your PostgreSQL database.

### Step 10 — Restart Services

```powershell
# Restart all services
docker compose up -d

# Restart a single service
docker compose restart backend
```

---

## 6. Database Initialization and Prisma Migrations

> **⚠️ WARNING — Read before running any database command:**
>
> Never run `docker compose down -v`, `prisma migrate reset`, volume deletion, or destructive SQL as routine troubleshooting. These operations permanently delete all stored data.
>
> If a fresh database is genuinely required, first verify that the target database contains no important data by running COUNT(*) queries on application tables. Only then proceed with a controlled reset.

### 6.1 How Migrations Work in This Project

CampusNode uses **Prisma 7** with a single clean baseline migration:

```
server/prisma/migrations/
└── 20261028000000_initial_baseline/
    └── migration.sql        ← Creates all 32 tables and 12 enums
```

The migration is applied automatically by the `migration` service when you run `docker compose up`. You do not need to run migration commands manually for a standard startup.

The Prisma 7 configuration file is `server/prisma.config.js`. This file also contains a **database safety guard** that blocks destructive operations (`migrate reset`, `db push`, `migrate dev`) if the target database is flagged as production.

### 6.2 Verify Migration Status

Check that the migration was applied:

```powershell
# Check migration service logs
docker compose logs migration

# Expected output includes:
# Applying migration `20261028000000_initial_baseline`
# All migrations have been successfully applied.
```

Check inside the database directly:

```powershell
echo 'SELECT id, migration_name, applied_steps_count, finished_at FROM _prisma_migrations;' | docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode
```

Expected output:
```
id | migration_name                      | applied_steps_count | finished_at
---+-------------------------------------+---------------------+------------------------
...| 20261028000000_initial_baseline     | 1                   | 2026-...
```

Check Prisma migration status from the backend container:
```powershell
docker exec campusnode-backend npx prisma migrate status --schema prisma/schema.prisma
```

Expected:
```
Database schema is up to date!
```

### 6.3 Applying Migrations Manually (If Needed)

If you need to apply migrations manually (e.g., after adding a new migration file):

```powershell
# Run from repository root
docker exec campusnode-migration npx prisma migrate deploy
# OR, if the migration container has already exited:
docker compose run --rm migration
```

### 6.4 Generating the Prisma Client (During Development)

If you modify `schema.prisma` during development and need to regenerate the Prisma client:

```powershell
cd server
npx prisma generate
```

The Prisma client is also generated automatically during `docker compose build`.

### 6.5 Creating a New Migration (Development Only)

> **Do not run `migrate dev` against the production database.**

```powershell
# From the server directory, with server/.env pointing to your local database
cd server
npx prisma migrate dev --name your_migration_name
```

This command is blocked by the database safety guard if `CAMPUSNODE_DB_ENV=production` is set.

### 6.6 Seeding Initial Data

CampusNode has a separate seed command for the administrator account. See [Section 7](#7-initial-setup-and-administrator-access).

Venue data is seeded automatically when the backend starts (via `ensureVenuesTableAndSeed` in the venues route).

### 6.7 Inspecting the Database State

Using Adminer (visual):
- Open http://localhost:8081
- Login: Server=`postgres`, Username=`campusnode_user`, Password=_(from your .env)_, Database=`campusnode`

Using psql (command line):
```powershell
# List all tables
echo '\dt' | docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode

# Count rows in a table
echo 'SELECT count(*) FROM "Venue";' | docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode
```

---

## 7. Initial Setup and Administrator Access

### 7.1 How the Administrator Account Is Created

CampusNode does **not** automatically create an administrator account during migration. You must run the seed script manually after the database is initialized.

The seed script reads `ADMIN_EMAIL` and `ADMIN_PASS` from your `.env` file and creates (or updates) the administrator record using an `upsert` — running it multiple times is safe.

### 7.2 Run the Admin Seed

```powershell
# From the repository root
docker exec campusnode-backend node scripts/seed-admin.js
```

Expected output:
```
Seeding CampusNode Admin User...
Successfully seeded Admin: admin@nitj.ac.in (Role: admin)
Clubs and coordinators can be managed directly via the Admin Dashboard.
```

If the script fails with `ADMIN_EMAIL not found`:
- Verify that `ADMIN_EMAIL` and `ADMIN_PASS` are set in your root `.env`
- Verify that the backend container loaded the `.env` (restart with `docker compose up -d` after changing `.env`)

### 7.3 Admin Login Credentials

| Field | Value |
|---|---|
| URL | http://localhost/admin _(verify the actual admin route in the application)_ |
| Email | The value of `ADMIN_EMAIL` in your `.env` |
| Password | The value of `ADMIN_PASS` in your `.env` |

> If you do not set `ADMIN_EMAIL` and `ADMIN_PASS` in your `.env`, the seed script falls back to `admin@nitj.ac.in` and `admin@123`. **Change these defaults immediately** — never use the fallback credentials on any shared or networked machine.

### 7.4 Permissions and Reference Data

Role-based permissions (`Permission` table) are seeded automatically when the backend starts via the `seedPermissions` utility in `server/utils/rbac.js`. You do not need to run a separate command for permissions.

Venue data is seeded automatically at backend startup. You should see 17 venues after a fresh start.

### 7.5 Verify Login

1. Open http://localhost in your browser
2. Navigate to the login page
3. Log in with your `ADMIN_EMAIL` and `ADMIN_PASS`
4. Verify that the admin dashboard loads

If login fails:
```powershell
# Check that the admin record exists
echo 'SELECT email, role FROM "AdminRole";' | docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode
```

---

## 8. Email Testing with Mailpit

### 8.1 How Mailpit Works

Mailpit is a local SMTP capture server. All emails sent by the CampusNode backend are captured by Mailpit and viewable in its web inbox. **No emails are delivered to real inboxes.**

### 8.2 Mailpit Configuration in Docker

| Setting | Value | Why |
|---|---|---|
| `SMTP_HOST` | `mailpit` | Docker service name — reachable from backend container |
| `SMTP_PORT` | `1025` | Mailpit's internal SMTP listener |
| `SMTP_SECURE` | `false` | Mailpit does not require TLS |
| `SMTP_USER` | _(empty)_ | Mailpit does not require authentication |
| `SMTP_PASS` | _(empty)_ | Mailpit does not require authentication |

> **Critical:** `SMTP_HOST` must be `mailpit`, not `localhost`. From inside the `campusnode-backend` container, `localhost` refers to the backend container itself (port 5000). Only Docker service names resolve across containers on the same network.

### 8.3 Open the Mailpit Web UI

Navigate to http://localhost:8025 in your browser.

### 8.4 Trigger a Test Email

Emails are sent during:
- User registration (verification email)
- Login with OTP enabled
- Password reset request
- Password change notification

Example: Click "Forgot Password" on the login page and enter any registered email address. The email will appear in Mailpit within seconds.

### 8.5 Inspect Email Worker Logs

```powershell
# Backend logs include email worker activity
docker compose logs -f backend

# Look for lines containing "email", "queue", or "BullMQ"
docker compose logs backend | Select-String -Pattern "email|queue|bull" -CaseSensitive:$false
```

### 8.6 Test SMTP Connectivity from the Backend Container

```powershell
# Confirm Mailpit is reachable from inside the backend container
docker exec campusnode-backend node -e "
const net = require('net');
const s = net.connect(1025, 'mailpit', () => {
  console.log('SMTP connection to mailpit:1025 OK');
  s.destroy();
});
s.on('error', (e) => console.error('SMTP connection failed:', e.message));
"
```

### 8.7 Using a Real Email Provider

To use a real SMTP provider (e.g., college SMTP server) instead of Mailpit:

1. Update `.env`:
   ```env
   SMTP_HOST=smtp.nitj.ac.in
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@nitj.ac.in
   SMTP_PASS=your-email-password
   ```
2. Restart the backend: `docker compose restart backend`

> Mailpit and a real SMTP provider use completely different credentials and settings. Do not mix them.

---

## 9. Local Verification Checklist

After completing startup, verify each item:

- [ ] `docker compose ps` shows all services. `campusnode-postgres` and `campusnode-redis` are `(healthy)`. `campusnode-migration` exited with code 0. `campusnode-backend` is `(healthy)`. `campusnode-frontend` is `(healthy)`.
- [ ] `http://localhost` loads the CampusNode frontend without errors.
- [ ] `http://localhost/health` returns JSON with `"ok": true`.
- [ ] `http://localhost:8025` shows the Mailpit inbox.
- [ ] `http://localhost:8081` shows the Adminer login page.
- [ ] The `_prisma_migrations` table contains one row: `20261028000000_initial_baseline` with `applied_steps_count = 1`.
- [ ] `SELECT count(*) FROM "Venue"` returns 17.
- [ ] `SELECT count(*) FROM "Permission"` returns a non-zero number.
- [ ] The admin seed ran successfully (`docker exec campusnode-backend node scripts/seed-admin.js`).
- [ ] Admin login works at http://localhost using `ADMIN_EMAIL` and `ADMIN_PASS`.
- [ ] **Test (perform manually):** Register a student account. Check that the verification email appears in Mailpit.
- [ ] **Test (perform manually):** Trigger a password reset. Check that the email appears in Mailpit.
- [ ] **Test (perform manually):** Log in as admin. Navigate to Events, Clubs, and Announcements sections.
- [ ] **Test (perform manually):** Verify Socket.IO connects — look for "Socket connected:" in the backend logs after logging in.
- [ ] No `ERROR` or `FATAL` messages appear in `docker compose logs backend` at startup (rate limiter warnings and CORS notices are normal).

---

## 10. Common Problems and Troubleshooting

### Problem Table

| Problem | Likely Cause | Diagnostic Command | Solution |
|---|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop is not running | `docker info` | Open Docker Desktop, wait for whale icon |
| Port 80 already in use | Another web server (IIS, WAMP) is on port 80 | `netstat -ano \| findstr :80` | Set `APP_PORT=8080` in `.env`, then restart |
| Port 8025 already in use | Another app on that port | `netstat -ano \| findstr :8025` | Change Mailpit host port in `compose.yaml` |
| Container exits immediately | Missing required env variable or bad `.env` | `docker compose logs migration` or `docker compose logs backend` | Check `.env` for all required variables. Look for error in logs. |
| `Error: DATABASE_URL is required` | `DATABASE_URL` not in `.env` | `docker compose config` | Add `DATABASE_URL` to `.env` |
| Backend cannot connect to PostgreSQL | `postgres` service not healthy; wrong hostname | `docker compose ps`, `docker compose logs postgres` | Wait for postgres to be healthy. Ensure `DATABASE_URL` uses hostname `postgres`, not `localhost` |
| Prisma migration fails | Invalid SQL; missing table | `docker compose logs migration` | Check full migration log. If this is a fresh DB, the baseline migration should work. Check that `DATABASE_URL` points to the right database. |
| `Prisma Client not generated` | Build did not run `prisma generate` | `docker compose logs backend` for Prisma errors | Run `docker compose build --no-cache backend` |
| Redis connection refused | Redis not started or wrong password | `docker compose ps redis`, `docker compose logs redis` | Verify `REDIS_PASSWORD` in `.env` matches the password in `REDIS_URL`. Restart redis. |
| `SMTP ECONNREFUSED 127.0.0.1:1025` | `SMTP_HOST=localhost` in `.env` instead of `mailpit` | `docker compose logs backend \| Select-String smtp` | Set `SMTP_HOST=mailpit` in `.env`, restart backend |
| Mailpit reachable but no email appears | Email job queued but not processed; wrong SMTP config | `docker compose logs backend` | Check BullMQ logs for job failures. Verify SMTP settings. |
| Frontend calls wrong backend URL | `VITE_API_URL` set to a non-empty value | Browser DevTools → Network tab — look at request URLs | Set `VITE_API_URL=` (empty) in `.env` and rebuild frontend: `docker compose build frontend` |
| CORS error in browser console | Your request origin is not in `ALLOWED_ORIGINS` or `CLIENT_URL` | Browser DevTools → Console → CORS error details | Add the origin to `ALLOWED_ORIGINS` in `.env`. Restart backend. |
| Socket.IO connection fails | CORS on Socket.IO; wrong `CLIENT_URL` | `docker compose logs backend` | Ensure `CLIENT_URL` matches the URL you use in the browser. Restart backend. |
| Missing environment variable error | `.env` not loaded or variable name misspelled | `docker compose config` | Verify `.env` exists in the repo root and variable names match `.env.example` exactly |
| Frontend/backend image build fails | Dependency install failure; network issue | `docker compose build 2>&1` | Check internet connectivity. Try `docker compose build --no-cache`. Check `server/package.json` and `client/package.json` for typos. |
| Permission errors on Linux | Running Docker as root; wrong file ownership | `ls -la` on project directory | Add your user to the `docker` group: `sudo usermod -aG docker $USER`, then log out and back in |
| Service shows healthy but feature broken | Application-level bug; seeding not run | `docker compose logs backend -f` | Check backend logs while reproducing the issue. Verify seed has been run. |
| `campusnode-migration` exited with non-zero code | Migration SQL error or database connection problem | `docker compose logs migration` | Check full log for the specific SQL error. Do not delete volumes — investigate the error first. |

### Useful Diagnostic Commands

```powershell
# Check all container statuses and health
docker compose ps

# Tail live logs from all services
docker compose logs -f

# Enter the backend container shell
docker exec -it campusnode-backend bash

# Enter the PostgreSQL shell
docker exec -it campusnode-postgres psql -U campusnode_user -d campusnode

# Test network connectivity from backend to postgres
docker exec campusnode-backend node -e "
const net = require('net');
const s = net.connect(5432, 'postgres', () => { console.log('postgres reachable'); s.destroy(); });
s.on('error', e => console.error('postgres unreachable:', e.message));
"

# Test Redis from backend
docker exec campusnode-backend node -e "
const net = require('net');
const s = net.connect(6379, 'redis', () => { console.log('redis reachable'); s.destroy(); });
s.on('error', e => console.error('redis unreachable:', e.message));
"

# Check backend health endpoint directly
docker exec campusnode-backend node -e "fetch('http://localhost:5000/health').then(r=>r.json()).then(console.log)"
```

---

## 11. College Server Deployment — Internal Testing

> **This deployment is for internal testing, evaluation, and demonstration — not a claim of production readiness.** See [Section 15](#15-limitations-of-this-non-production-deployment) for what is required before production.

All commands in this section are run on the **Linux server via SSH** unless stated otherwise. Use `bash`, not PowerShell.

### Step 1 — Confirm Server Access and Permissions

```bash
# Confirm your user and server
whoami
hostname

# Confirm you can run Docker
docker info

# If you see permission denied, add your user to the docker group
sudo usermod -aG docker $USER
# Log out and SSH back in
```

### Step 2 — Check Server Resources and Docker

```bash
# Check OS
uname -a
cat /etc/os-release

# Check available disk space (need at least 10 GB free)
df -h

# Check RAM
free -h

# Check Docker version
docker --version
docker compose version
```

### Step 3 — Clone the Repository

```bash
# Choose a deployment directory — /opt or /srv are conventional on Linux
sudo mkdir -p /opt/campusnode
sudo chown $USER:$USER /opt/campusnode

cd /opt/campusnode
git clone <REPO_URL> .
```

### Step 4 — Create the Server .env File

```bash
cp .env.example .env
nano .env   # or use vim, or transfer using scp
```

> **Generate unique secrets for the server.** Do not copy `.env` from a developer laptop. Each environment (local, server) must have its own JWT secret, PostgreSQL password, Redis password, and QR signing keys.

**Server-specific variables that differ from a local laptop:**

```env
# Server-specific settings
APP_PORT=80
NODE_ENV=production
CLIENT_URL=http://<SERVER_IP_OR_HOSTNAME>
ALLOWED_ORIGINS=http://<SERVER_IP_OR_HOSTNAME>

# If the college provides a domain name and IP
# CLIENT_URL=http://campusnode.nitj.ac.in
# ALLOWED_ORIGINS=http://campusnode.nitj.ac.in

# SMTP: Use college SMTP if available, otherwise set up Mailpit and access via SSH port forwarding
SMTP_HOST=<college-smtp-host-or-mailpit>
SMTP_PORT=<587-or-1025>
```

> **`localhost` on the server ≠ `localhost` on your laptop.** When you SSH to the server, `localhost` in your browser on your laptop does not reach the server. Use the server's actual IP address or hostname.

### Step 5 — Generate Server-Side Secrets

```bash
# Node.js must be installed on the server, OR use the Docker container
# Option A: If Node.js is installed on the server
cd /opt/campusnode/server
node scripts/generate-staging-secrets.js

# Option B: Use the backend Docker image to generate (no local Node.js needed)
docker run --rm node:22-bookworm-slim node -e "
const c = require('crypto');
console.log('JWT_SECRET=' + c.randomBytes(64).toString('hex'));
console.log('POSTGRES_PASSWORD=' + c.randomBytes(32).toString('base64url'));
console.log('REDIS_PASSWORD=' + c.randomBytes(32).toString('base64url'));
"
```

Copy the generated values into `/opt/campusnode/.env`.

### Step 6 — Configure Frontend-to-Backend Communication

In the Docker Compose configuration, `VITE_API_URL` is left empty — Nginx proxies `/api/` and `/socket.io/` to the backend internally. **Do not set `VITE_API_URL` to the server IP.** The Nginx reverse proxy handles routing without requiring the frontend to know the backend's address.

The frontend image must be rebuilt with the correct `CLIENT_URL` passed through environment variables. Edit `.env`:

```env
CLIENT_URL=http://<YOUR_SERVER_IP_OR_DOMAIN>
```

### Step 7 — Configure CORS

The backend reads `CLIENT_URL` and `ALLOWED_ORIGINS` to determine valid CORS origins. For the college server:

```env
CLIENT_URL=http://<SERVER_IP_OR_DOMAIN>
ALLOWED_ORIGINS=http://<SERVER_IP_OR_DOMAIN>
```

If testers access the application from both a domain and an IP address, add both:
```env
ALLOWED_ORIGINS=http://192.168.1.100,http://campusnode.nitj.ac.in
```

### Step 8 — Review Nginx and Published Ports

The production `compose.production.yaml` exposes:
- Port 80 → frontend (Nginx)

The following ports are **internal only** and must not be exposed publicly:
- 5432 (PostgreSQL)
- 6379 (Redis)
- 5000 (backend)

If the college provides HTTPS via a domain:
- Confirm with the IT team that they will configure a reverse proxy or SSL termination
- Update `CLIENT_URL` to use `https://`
- Update `SMTP_SECURE` if needed

### Step 9 — Confirm DNS and Network with College IT

Confirm with the college IT team:
- [ ] Which IP address or hostname is assigned to the server
- [ ] Whether port 80 (and 443) are open on the network firewall
- [ ] Whether a domain name is available (e.g., campusnode.nitj.ac.in)
- [ ] Whether internet access is available from the server (needed for pulling Docker images on first run)
- [ ] Whether the server can send emails to an external SMTP server

### Step 10 — Build and Start Services

```bash
cd /opt/campusnode

# Build images from source (first time or after code changes)
docker compose -f compose.production.yaml build

# Start all services
docker compose -f compose.production.yaml up -d
```

### Step 11 — Verify Migration Applied

```bash
docker compose -f compose.production.yaml logs migration
# Expected: "All migrations have been successfully applied."

docker exec campusnode-postgres psql -U campusnode_user -d campusnode \
  -c "SELECT migration_name, applied_steps_count FROM _prisma_migrations;"
```

### Step 12 — Seed the Administrator

```bash
docker exec campusnode-backend node scripts/seed-admin.js
```

### Step 13 — Verify Application Access from Another Device

From a laptop or phone on the same network:
1. Open a browser and navigate to `http://<SERVER_IP>`
2. The CampusNode frontend should load
3. Log in with the admin credentials
4. Verify the admin dashboard loads

If the page does not load:
```bash
# Check if the frontend container is publishing on port 80
docker compose -f compose.production.yaml ps
# Check that the server firewall allows port 80
sudo ufw status    # Ubuntu
sudo firewall-cmd --list-ports   # CentOS/Fedora
```

### Step 14 — Test Email on the Server

If using Mailpit on the server:
- Mailpit web UI is on port 8025 on the server
- Access it via SSH port forwarding from your laptop:
  ```powershell
  # On your laptop (PowerShell)
  ssh -L 8025:localhost:8025 username@<SERVER_IP>
  # Then open http://localhost:8025 in your browser
  ```
- Note: Mailpit is in `compose.yaml` (local) but **not** in `compose.production.yaml`. For server email capture, add Mailpit to `compose.production.yaml` or configure a real SMTP server.

### Step 15 — Check Logs and Health

```bash
# All services
docker compose -f compose.production.yaml logs -f

# Backend health
curl http://localhost/health

# Container status
docker compose -f compose.production.yaml ps
```

### Step 16 — Test Persistence After Restart

```bash
# Controlled restart (data is preserved)
docker compose -f compose.production.yaml down
docker compose -f compose.production.yaml up -d

# Verify data still exists after restart
docker exec campusnode-postgres psql -U campusnode_user -d campusnode \
  -c "SELECT count(*) FROM \"Venue\";"
# Expected: 17
```

### Step 17 — Stop and Start Commands for the College Server

```bash
# Start all services
docker compose -f compose.production.yaml up -d

# Stop all services (data preserved)
docker compose -f compose.production.yaml down

# Restart a specific service
docker compose -f compose.production.yaml restart backend

# View service status
docker compose -f compose.production.yaml ps
```

---

## 12. Server Data, Backups, and Recovery

### 12.1 Persistent Data Volumes

| Volume | Docker Name | Content |
|---|---|---|
| `postgres_data` | `campusnode_postgres_data` | All PostgreSQL data: users, events, clubs, registrations |
| `redis_data` | `campusnode_redis_data` | Redis AOF persistence: job queues, cached data |

These volumes exist independently of containers. Stopping or removing containers does **not** delete volumes. Only `docker compose down -v` or explicit `docker volume rm` destroys them.

### 12.2 Back Up PostgreSQL

```bash
# Create a timestamped dump
docker exec campusnode-postgres pg_dump \
  -U campusnode_user \
  -d campusnode \
  --no-password \
  -Fc \
  > campusnode-backup-$(date +%Y%m%d-%H%M%S).dump

# Verify the backup file
ls -lh campusnode-backup-*.dump
```

### 12.3 Restore a Backup to a Test Database

> **Never restore a backup directly over a live database.** Create a separate test database first.

```bash
# Create a test database
docker exec campusnode-postgres psql -U campusnode_user -d postgres \
  -c "CREATE DATABASE campusnode_restore_test OWNER campusnode_user;"

# Restore the backup into the test database
docker exec -i campusnode-postgres pg_restore \
  -U campusnode_user \
  -d campusnode_restore_test \
  --no-password \
  < campusnode-backup-<timestamp>.dump

# Drop the test database when done
docker exec campusnode-postgres psql -U campusnode_user -d postgres \
  -c "DROP DATABASE campusnode_restore_test;"
```

### 12.4 Preserve Data During Container Updates

The standard update procedure does not delete volumes:
```bash
docker compose -f compose.production.yaml down   # Stop containers (volumes preserved)
git pull                                          # Get new code
docker compose -f compose.production.yaml build  # Rebuild images
docker compose -f compose.production.yaml up -d  # Restart with new images
```

### 12.5 Verify Persistence After Restart

```bash
# After restarting, verify data is intact
docker exec campusnode-postgres psql -U campusnode_user -d campusnode \
  -c "SELECT count(*) FROM \"Venue\"; SELECT count(*) FROM \"Permission\";"
```

---

## 13. Updating the Application

### Standard Update Procedure

**Run these commands on the server (or locally):**

```bash
# 1. Pull latest code
git pull origin main

# 2. Review changed .env.example for new variables
# Compare .env.example to your .env and add any new variables
diff .env.example .env

# 3. Review any new migration files
ls server/prisma/migrations/

# 4. Build updated images
docker compose -f compose.production.yaml build

# 5. Stop current services (data preserved)
docker compose -f compose.production.yaml down

# 6. Start services (migration runs automatically before backend starts)
docker compose -f compose.production.yaml up -d

# 7. Verify migration applied
docker compose -f compose.production.yaml logs migration

# 8. Verify backend health
curl http://localhost/health

# 9. Check logs for errors
docker compose -f compose.production.yaml logs backend
```

> **⚠️ Database schema changes can complicate rollback.** If a new migration has been applied and you need to roll back to a previous version, the database schema may be incompatible with the old application code. Always take a backup before applying updates.

---

## 14. Operational Commands Reference

**PowerShell (local laptop):** Use `docker compose ...`  
**Linux server:** Use `docker compose -f compose.production.yaml ...`

The table below shows local commands. Add `-f compose.production.yaml` for server use.

### Service Control

| Action | Command |
|---|---|
| Start all services | `docker compose up -d` |
| Stop all services (keep data) | `docker compose down` |
| Restart all services | `docker compose down` then `docker compose up -d` |
| Restart one service | `docker compose restart backend` |
| Rebuild images | `docker compose build` |
| Rebuild one image (no cache) | `docker compose build --no-cache backend` |

### Monitoring

| Action | Command |
|---|---|
| View service status | `docker compose ps` |
| View all logs | `docker compose logs` |
| Follow live logs | `docker compose logs -f` |
| Follow one service logs | `docker compose logs -f backend` |
| Inspect container details | `docker inspect campusnode-backend` |

### Container Shells

| Action | Command |
|---|---|
| Shell inside backend | `docker exec -it campusnode-backend bash` |
| Shell inside frontend/nginx | `docker exec -it campusnode-frontend sh` |
| PostgreSQL CLI | `docker exec -it campusnode-postgres psql -U campusnode_user -d campusnode` |

### Connectivity Tests

| Action | Command |
|---|---|
| Test backend → PostgreSQL | `docker exec campusnode-backend node -e "const n=require('net');const s=n.connect(5432,'postgres',()=>{console.log('OK');s.destroy()});s.on('error',e=>console.error(e.message))"` |
| Test backend → Redis | `docker exec campusnode-backend node -e "const n=require('net');const s=n.connect(6379,'redis',()=>{console.log('OK');s.destroy()});s.on('error',e=>console.error(e.message))"` |
| Test backend → Mailpit SMTP | `docker exec campusnode-backend node -e "const n=require('net');const s=n.connect(1025,'mailpit',()=>{console.log('OK');s.destroy()});s.on('error',e=>console.error(e.message))"` |
| Test backend health | `docker exec campusnode-backend node -e "fetch('http://localhost:5000/health').then(r=>r.json()).then(console.log)"` |

### Database and Migrations

| Action | Command |
|---|---|
| Check migration status | `docker exec campusnode-backend npx prisma migrate status --schema prisma/schema.prisma` |
| Apply pending migrations | `docker compose run --rm migration` |
| Run admin seed | `docker exec campusnode-backend node scripts/seed-admin.js` |
| PostgreSQL interactive shell | `docker exec -it campusnode-postgres psql -U campusnode_user -d campusnode` |
| List all tables | `echo '\dt' \| docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode` |
| Count table rows | `echo 'SELECT count(*) FROM "Venue";' \| docker exec -i campusnode-postgres psql -U campusnode_user -d campusnode` |

### Backups

| Action | Command |
|---|---|
| Create PostgreSQL backup | `docker exec campusnode-postgres pg_dump -U campusnode_user -d campusnode -Fc > backup.dump` |
| List Docker volumes | `docker volume ls` |
| Inspect a volume | `docker volume inspect campusnode_postgres_data` |

### Secret Generation

| What | Command |
|---|---|
| JWT secret (64-byte hex) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| Random password (32-byte base64url) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| QR Ed25519 keypair | `node server/scripts/generate-qr-keypair.js` |
| All staging secrets (JWT + QR + VAPID + passwords) | `node server/scripts/generate-staging-secrets.js` |
| Rotate a specific key (preview) | `node server/scripts/rotate-key.js jwt` |
| Rotate JWT key and apply to server/.env | `node server/scripts/rotate-key.js jwt --apply` |
| Rotate QR keypair and apply | `node server/scripts/rotate-key.js qr --apply` |
| Rotate all keys (preview) | `node server/scripts/rotate-key.js all` |

---

## 15. Limitations of This Non-Production Deployment

This Docker Compose setup is suitable for development, testing, and internal demonstration. It does **not** automatically guarantee:

| Area | Gap |
|---|---|
| **High availability** | Single-node deployment. Any container failure takes down that feature. No automatic failover. |
| **Disaster recovery** | No automated backup schedule. Manual backups only. |
| **Monitoring and alerting** | No production monitoring stack (Prometheus, Grafana, alerting). Health checks are container-level only. |
| **Load testing** | No load tests have been run in this deployment. Capacity for concurrent users is unknown. |
| **Security hardening** | No TLS/HTTPS. No WAF. No intrusion detection. Default security headers only. |
| **Production email deliverability** | Mailpit is for capture only. Real SMTP provider, SPF/DKIM/DMARC records not configured. |
| **Formal incident response** | No runbooks, escalation paths, or on-call procedures. |
| **GDPR / Data compliance** | Data retention, privacy policies, and consent flows not audited. |
| **Automated testing gate** | CI/CD not configured. Code is not automatically tested before deployment. |
| **Secret rotation** | Secrets are static in `.env`. Key rotation exists but is manual. |

### Pre-Production Checklist

Before CampusNode can be considered production-ready:

- [ ] HTTPS/TLS configured (Let's Encrypt or college SSL certificate)
- [ ] `CLIENT_URL` and `ALLOWED_ORIGINS` updated to HTTPS
- [ ] Cookie security flags (`Secure`, `SameSite=Strict`) enabled
- [ ] Production SMTP configured with SPF, DKIM, and DMARC
- [ ] Automated PostgreSQL backups with offsite storage
- [ ] Production monitoring and alerting (uptime, error rates, disk usage)
- [ ] Load testing completed; resource limits tuned
- [ ] Security audit of authentication, authorization, and input validation
- [ ] Rate limiting reviewed and tuned for production traffic
- [ ] Cloudinary or equivalent media storage properly configured
- [ ] Admin password changed from seed default and stored securely
- [ ] All secrets rotated from staging values
- [ ] CI/CD pipeline configured
- [ ] Rollback procedure documented and tested
- [ ] Data retention and privacy policy reviewed

---

## 16. Final Deployment Checklists

### A. Fresh Laptop Setup Checklist

**Prerequisites**
- [ ] WSL 2 enabled and installed
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] Repository cloned

**Configuration**
- [ ] `.env` created from `.env.example`
- [ ] `POSTGRES_PASSWORD` set to a strong unique value
- [ ] `DATABASE_URL` updated to match `POSTGRES_PASSWORD` (hostname: `postgres`)
- [ ] `REDIS_PASSWORD` set to a strong unique value
- [ ] `REDIS_URL` updated to match `REDIS_PASSWORD` (hostname: `redis`)
- [ ] `JWT_SECRET` generated with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] `ADMIN_EMAIL` and `ADMIN_PASS` set
- [ ] `SMTP_HOST=mailpit` and `SMTP_PORT=1025` set
- [ ] `CLIENT_URL=http://localhost`
- [ ] QR signing keys generated (optional for initial testing)

**Database Initialization**
- [ ] `docker compose build` completed without errors
- [ ] `docker compose up -d` completed
- [ ] `campusnode-migration` exited with code 0
- [ ] `_prisma_migrations` contains the baseline entry

**Startup**
- [ ] All services running: `docker compose ps`
- [ ] http://localhost returns frontend ✓
- [ ] http://localhost/health returns `{"ok":true}` ✓
- [ ] http://localhost:8025 shows Mailpit inbox ✓

**Functional Verification**
- [ ] Admin seed run: `docker exec campusnode-backend node scripts/seed-admin.js`
- [ ] Admin login works
- [ ] Student registration works and email appears in Mailpit
- [ ] Venue count = 17 (`SELECT count(*) FROM "Venue"`)

**Safe Shutdown**
- [ ] `docker compose down` stops all services
- [ ] `docker compose up -d` restarts cleanly
- [ ] Data persists after restart

---

### B. College Server Internal Testing Checklist

**Prerequisites**
- [ ] SSH access to server confirmed
- [ ] User added to `docker` group
- [ ] Docker Engine and Compose v2 installed and verified
- [ ] Port 80 confirmed open on server firewall
- [ ] At least 10 GB disk space available

**Configuration**
- [ ] Repository cloned to `/opt/campusnode` (or equivalent)
- [ ] `.env` created with server-specific values (not copied from laptop)
- [ ] All secrets generated fresh for the server
- [ ] `CLIENT_URL` set to server IP or hostname
- [ ] `ALLOWED_ORIGINS` matches `CLIENT_URL`
- [ ] `SMTP_HOST` configured for server email (college SMTP or Mailpit)
- [ ] `DATABASE_URL` hostname is `postgres` (Docker service name)
- [ ] `REDIS_URL` hostname is `redis` (Docker service name)

**Database Initialization**
- [ ] `docker compose -f compose.production.yaml build` completed
- [ ] `docker compose -f compose.production.yaml up -d` started
- [ ] Migration service exited with code 0
- [ ] Baseline migration applied confirmed

**Startup Verification**
- [ ] `docker compose -f compose.production.yaml ps` — all services healthy
- [ ] `http://<SERVER_IP>` reachable from another device on the same network
- [ ] `http://<SERVER_IP>/health` returns `{"ok":true}`
- [ ] Admin seed run on server

**Functional Testing**
- [ ] Admin login works from a networked device
- [ ] Student can register and receive email
- [ ] Key application pages load without errors

**Persistence Test**
- [ ] `docker compose -f compose.production.yaml down` then `up -d` — data verified intact after restart

**Documentation for College IT**
- [ ] Server IP/hostname documented
- [ ] Port 80 access confirmed
- [ ] Admin credentials stored securely (not in plain text documents)
- [ ] How to stop and start the application documented

---

## 17. Known Gaps and Required Manual Actions

The following gaps were identified during repository inspection. None of them have been changed — they are recorded here for awareness.

| Gap | Description | Action Required |
|---|---|---|
| **Mailpit missing from production Compose** | `compose.production.yaml` has no `mailpit` service. Email on the college server requires a real SMTP provider or manually adding Mailpit to the production Compose file. | Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for the college SMTP server, or add Mailpit to `compose.production.yaml` and restrict it to internal access. |
| **Adminer missing from production Compose** | Adminer is only in `compose.yaml`. This is intentional — Adminer must not be exposed on a shared server without authentication. | If database browsing is needed on the server, use SSH port forwarding to access PostgreSQL, or use psql directly. |
| **Google Apps Script URL** | `VITE_GOOGLE_APPS_SCRIPT_URL` in `client/.env.example` requires a real Google Apps Script deployment URL. Without this, contact/feedback forms may not work. | Deploy the Google Apps Script and set the URL in `.env` before rebuilding the frontend image. |
| **VAPID / Web Push** | `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are empty in `.env.example`. Push notifications are disabled until these are generated and configured. | Run `node server/scripts/generate-staging-secrets.js` and copy VAPID keys to `.env`. |
| **Cloudinary not configured** | Image uploads (event banners, club logos) require Cloudinary credentials. Features that upload images will fail without these. | Create a Cloudinary account, obtain credentials, and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`. |
| **HTTPS not configured** | Both Compose files expose only port 80. TLS/HTTPS requires additional infrastructure (reverse proxy, certificate). | For production: configure a reverse proxy (e.g., Caddy or Nginx outside Docker) with Let's Encrypt, or obtain an SSL certificate from the college. |
| **No automated backup** | Database backups are manual. There is no scheduled backup script in the repository. | Set up a cron job on the server to run the pg_dump command daily and store dumps to a separate location. |
| **Seed scripts require running manually** | The admin seed is not triggered automatically. First-time deployers must remember to run it. | Document this clearly and consider adding it to the startup checklist for all new deployments. _(Already done in this guide.)_ |

---

## 18. Making CampusNode Accessible Through the College Domain

For detailed step-by-step guidance, ready-to-send email templates, and architectural diagrams on college domain routing, refer to the dedicated manual:  
👉 **[`docs/COLLEGE_DOMAIN_DEPLOYMENT.md`](COLLEGE_DOMAIN_DEPLOYMENT.md)**

### Key Requirements Summary for Domain Access

1. **DNS Allocation:** College IT must create an **A record** mapping your approved subdomain (e.g., `campusnode.nitj.ac.in`) to the server's static IP.
2. **Reverse Proxy & TLS:**
   - **Model A (Central Gateway):** The college edge proxy terminates HTTPS with institute SSL certificates and forwards HTTP traffic to port 80.
   - **Model B (Direct Host):** Nginx on the server listens on port 443 with an institutional or Let's Encrypt SSL certificate and redirects port 80 to HTTPS.
3. **Application Configuration (`.env`):**
   - `CLIENT_URL=https://campusnode.nitj.ac.in` (NO trailing slash, must NOT be `localhost`).
   - `ALLOWED_ORIGINS=https://campusnode.nitj.ac.in` (required for CORS and Socket.IO handshake).
   - `VITE_API_URL=` (leave empty so Axios uses relative paths proxied via Nginx).
4. **Cookie & HTTPS Interaction:** In `NODE_ENV=production`, authentication cookies set `SameSite=None; Secure=true`. Browsers **require HTTPS** to accept these cookies. Plain HTTP in production will cause login failures.

### Information to Obtain from College IT (Fill-in Checklist)

Use this form when coordinating with the institute IT department:

- **Approved Domain:** `________________________________________` (e.g., `campusnode.nitj.ac.in`)
- **Server IP:** `________________________________________` (e.g., `10.10.x.x` or public IP)
- **Private or Public Access:** `[ ] Intranet (Campus Wi-Fi/LAN/VPN)   [ ] Public Internet`
- **DNS Administrator:** `________________________________________`
- **Server Administrator:** `________________________________________`
- **Firewall Contact:** `________________________________________`
- **Reverse-Proxy Arrangement:** `[ ] Model A (Central College Gateway)   [ ] Model B (Direct on Server)`
- **TLS Certificate Arrangement:** `[ ] Central SSL Termination   [ ] College CRT Files   [ ] Let's Encrypt`
- **Allowed Inbound Ports:** `[ ] Port 80 (HTTP)   [ ] Port 443 (HTTPS)`
- **Campus-only or External Access:** `[ ] Campus/VPN Only   [ ] External Public Access`
- **Email Delivery Arrangement:** `________________________________________` (Host, Port, Relay policy)
- **Backup Responsibility:** `[ ] Hypervisor VM Snapshots   [ ] Manual Database Dumps by Team`

### Pre-Deployment Checklist (Domain)
- [ ] Subdomain approved and DNS A record active.
- [ ] Static IP assigned to the server host.
- [ ] Inbound ports 80 and 443 permitted through firewall.
- [ ] Server `.env` updated with `CLIENT_URL` and `ALLOWED_ORIGINS`.
- [ ] PostgreSQL (5432) and Redis (6379) verified as **not** exposed on public interfaces.

### Post-Deployment Verification Checklist (Domain)
- [ ] DNS resolution confirmed: `nslookup campusnode.nitj.ac.in`.
- [ ] Browser navigates to `https://campusnode.nitj.ac.in` without security warnings.
- [ ] Super-administrator seeded and able to log in.
- [ ] Verification emails contain working links with the college domain.
- [ ] Real-time Socket.IO connection confirms successful handshake.

### Assumptions and Unresolved Questions
- **Assumption:** Deployment is primarily scoped for internal campus Wi-Fi, lab LAN, and VPN testing.
- **To Confirm:** Whether external students (off-campus) require direct internet access without VPN.
- **To Confirm:** Whether the institute issues official wildcard SSL certificates or delegates ACME verification.

---

*Document generated by inspection of the CampusNode repository at NIT Jalandhar, October 2026.*  
*All commands verified against the actual repository configuration. This document must be updated whenever the Compose files, environment variables, migration files, or seed scripts change.*

