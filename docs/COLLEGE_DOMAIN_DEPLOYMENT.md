# Making CampusNode Accessible Through the College Domain

**Target Audience:** CampusNode developers, student leads, and NIT Jalandhar IT/System Administrators  
**Context:** Internal testing, demonstration, and evaluation deployment on college infrastructure  
**Illustrative Domain:** `campusnode.nitj.ac.in` *(subject to formal college approval and DNS allocation)*  
**Last Updated:** October 2026

---

> ### ⚠️ Crucial Operational Notice
> This document guides an **internal testing deployment** on college-controlled infrastructure. It enables authorized campus testing and evaluation.  
> It is **not a claim of production hardening or enterprise security**. External public exposure carries serious security obligations (see [Section 11](#11-security-and-operational-boundaries)).  
> **Never modify college DNS records, institutional firewalls, or shared university servers without written authorization from the NIT Jalandhar IT team.**

---

## Table of Contents

1. [Understand the Deployment Options](#1-understand-the-deployment-options)
2. [Request the Domain from College IT](#2-request-the-domain-from-college-it)
3. [DNS Configuration](#3-dns-configuration)
4. [Network and Firewall Requirements](#4-network-and-firewall-requirements)
5. [Nginx and Reverse Proxy Configuration](#5-nginx-and-reverse-proxy-configuration)
6. [HTTPS and TLS Certificates](#6-https-and-tls-certificates)
7. [Application Configuration for the Domain](#7-application-configuration-for-the-domain)
8. [Docker Compose and Service Exposure](#8-docker-compose-and-service-exposure)
9. [Step-by-Step Deployment Procedure](#9-step-by-step-deployment-procedure)
10. [Domain and HTTPS Troubleshooting](#10-domain-and-https-troubleshooting)
11. [Security and Operational Boundaries](#11-security-and-operational-boundaries)
12. [Information to Obtain from College IT (Fill-in Checklist)](#12-information-to-obtain-from-college-it-fill-in-checklist)
13. [Pre-Deployment and Post-Deployment Checklists](#13-pre-deployment-and-post-deployment-checklists)
14. [Assumptions and Unresolved Questions](#14-assumptions-and-unresolved-questions)

---

## 1. Understand the Deployment Options

CampusNode can be accessed in four distinct ways. Choosing the right option depends on your testing goals, college network policies, and firewall rules.

### Access Levels Comparison

| Level | Access Method | Reachability | Typical Use Case |
|---|---|---|---|
| **Level 1** | `localhost` | Only the local laptop or host machine running Docker | Developer offline testing |
| **Level 2** | Private Server IP (e.g., `http://192.168.x.x` or `http://10.x.x.x`) | Any device connected to the same campus Wi-Fi / LAN subnet | Closed testing inside a club room, lab, or department |
| **Level 3** | College Subdomain on Campus Network (e.g., `http://campusnode.nitj.ac.in` via internal DNS) | Students & faculty connected to campus Wi-Fi, hostel LAN, or college VPN | **Recommended:** Campus-wide beta testing, internal trials, faculty evaluations |
| **Level 4** | College Subdomain with Public Internet Access (Public IP + Public DNS) | Anyone with an internet connection anywhere in the world | Full production rollout *(requires thorough security auditing first)* |

### Deployment Decision Tree

```
                       Where do users need to access CampusNode from?
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
   Only on my own                                                   Other devices need
     laptop/PC                                                           access
         │                                                                   │
         ▼                                                   ┌───────────────┴───────────────┐
   [ Option 1 ]                                              ▼                               ▼
  Use `localhost`                                   Only within Campus             From anywhere on the
(Follow DEPLOYMENT_GUIDE.md)                         Wi-Fi / LAN / VPN                  Internet
                                                             │                               │
                                            ┌────────────────┴────────────────┐              ▼
                                            ▼                                 ▼        [ Option 4 ]
                                    IP-only testing?                  Domain-based?      Public IP +
                                            │                                 │          Public DNS +
                                            ▼                                 ▼       Strict Hardening
                                      [ Option 2 ]                      [ Option 3 ]   (Requires CISO/
                                   Use Private IP LAN               Internal Campus     IT Approval)
                                   (e.g., 10.x or 192.168.x)        DNS + Subdomain
                                                                    (Recommended Target)
```

> **Key Rule:** External internet access does **not** happen automatically just because a domain name is assigned. Whether an address is reachable from home depends entirely on whether the college router forwards traffic from a public IP to your server, or if the server lives in a private intranet zone (RFC 1918).

---

## 2. Request the Domain from College IT

You must coordinate directly with the NIT Jalandhar Computer Centre / IT Services team. Never attempt to bypass institutional network security.

### Questions to Clarify with the IT Team

Before writing or submitting your request, be prepared to discuss:

1. **Server Provisioning:** Is a dedicated Linux VM (Ubuntu 22.04 LTS or Debian 12 recommended) available, or do you provide physical hardware?
2. **Network Scope:** Should the server be accessible strictly within the campus intranet/Wi-Fi/hostel LAN, or will external traffic be forwarded through the college firewall?
3. **Subdomain Name:** Can the college allocate a dedicated subdomain (e.g., `campusnode.nitj.ac.in` or `clubsetu.nitj.ac.in`)?
4. **Authoritative DNS:** Who controls DNS management for `nitj.ac.in` records, and what is the standard TTL?
5. **Static IP Assignment:** Will the server receive a reserved static private IP (e.g., via DHCP reservation or static assignment) to prevent IP drift on reboot?
6. **Firewall Access:** Can inbound TCP ports **80** (HTTP) and **443** (HTTPS) be whitelisted for the server?
7. **Reverse Proxy Architecture:** Does the institute mandate routing traffic through an existing central gateway/reverse proxy (e.g., university F5 / HAProxy / Nginx), or does the server terminate traffic directly?
8. **TLS/SSL Provisioning:** Will the college IT team issue an institutional wild-card/subdomain SSL certificate, will the central proxy terminate HTTPS, or is Let's Encrypt permitted via ACME?
9. **Outbound SMTP:** Can the server connect outbound on port 587 or 465 to the university SMTP relay (`smtp.nitj.ac.in`) to send transactional notifications?

---

### Ready-to-Send Request Template for College IT

Copy, customize, and email this request to the Head of Computer Centre / Network Administrator:

```text
Subject: Request for Subdomain Allocation and Network Whitelisting for CampusNode Project

Respected Sir/Madam,

We are developing CampusNode, a centralized campus event, club activity, and digital notification portal designed specifically for the students and faculty of NIT Jalandhar.

We would like to request internal server hosting and domain routing assistance for a non-production beta testing deployment:

1. Requested Subdomain: campusnode.nitj.ac.in (or an approved alternative)
2. Target Server: Linux Ubuntu 22.04 LTS Server running Docker containerized services
3. Access Scope: Internal Campus Network (Campus Wi-Fi, Lab LAN, Hostel LAN, and College VPN)
4. Required Inbound Ports:
   - Port 80 (HTTP) — for standard web traffic / redirect
   - Port 443 (HTTPS) — for secure encrypted access
5. Network Isolation:
   - Database (PostgreSQL 16) and Cache (Redis 7) run in isolated internal Docker bridge networks and will NOT be exposed to the host or campus network.
6. HTTPS / SSL:
   - We request guidance on whether the institute provides an official SSL certificate for *.nitj.ac.in or if our server reverse proxy should handle Let's Encrypt validation.
7. Outbound Connectivity:
   - Access to institute SMTP server for transactional OTP and registration verification emails.

We are ready to provide an architecture walkthrough and adhere strictly to institute cyber security and network usage guidelines.

Thank you for your time and guidance.

Sincerely,
[Your Name / Student Roll Number]
[Department / Society / Project Team]
National Institute of Technology, Jalandhar
Contact: [Phone / Official Email]
```

---

## 3. DNS Configuration

A Domain Name System (DNS) record translates human-readable names (like `campusnode.nitj.ac.in`) into machine-readable IP addresses.

### DNS Record Types

| Record Type | Purpose | Illustrative Example | When to Use |
|---|---|---|---|
| **A** | Maps a domain directly to an **IPv4** address | `campusnode.nitj.ac.in. IN A 10.10.24.50` | When pointing directly to the server's private or public IPv4 address |
| **AAAA** | Maps a domain directly to an **IPv6** address | `campusnode.nitj.ac.in. IN AAAA 2001:db8::50` | When the campus network natively routes IPv6 |
| **CNAME** | Aliases one domain name to another canonical name | `events.nitj.ac.in. IN CNAME campusnode.nitj.ac.in.` | When pointing alternative names to an existing server record |

### Illustrative DNS Record Definition

```dns
; CampusNode Internal Testing Record Example (Managed by NITJ DNS Team)
campusnode.nitj.ac.in.    3600    IN    A    10.10.x.x
```
*(Replace `10.10.x.x` with the actual approved static IP provided by college IT. Never guess or fabricate an IP).*

### Private IP vs. Public IP Realities

- **Private IP (RFC 1918):** Ranges such as `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`.
  - If `campusnode.nitj.ac.in` points to `10.10.x.x`, the domain will **only resolve and connect for devices connected to campus Wi-Fi or college VPN**.
  - Someone opening the URL from home over mobile data or residential Wi-Fi will receive `DNS_PROBE_FINISHED_NXDOMAIN` or a timeout (`ERR_CONNECTION_TIMED_OUT`).
- **Public IP:** A globally routable IP assigned to the college's internet edge.
  - A public DNS entry makes the name discoverable globally, but college firewall NAT rules determine whether incoming packets reach the server.

### Verifying DNS Resolution

#### On Windows (PowerShell):
```powershell
# Query default DNS server
Resolve-DnsName -Name campusnode.nitj.ac.in

# Query using specific university DNS resolver (e.g., 10.1.1.1)
Resolve-DnsName -Name campusnode.nitj.ac.in -Server 10.1.1.1

# Classic nslookup check
nslookup campusnode.nitj.ac.in
```

#### On Linux (Bash):
```bash
# Query address with dig
dig +short campusnode.nitj.ac.in

# Comprehensive trace
dig campusnode.nitj.ac.in A

# Using host utility
host campusnode.nitj.ac.in
```

### Interpreting Common DNS Failures

| Diagnostic Output | Root Cause | Action Required |
|---|---|---|
| `NXDOMAIN` / `Non-existent domain` | The domain name has not been added to the authoritative DNS zone file. | Contact college IT DNS administrator to confirm record entry. |
| Resolves to `127.0.0.1` | A developer's local `hosts` file has overridden the name, or dummy DNS was configured. | Check `C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`. |
| Resolves, but connection times out | DNS is working, but a firewall is blocking port 80/443, or the server IP has changed. | Verify server IP with `ip addr show` and test port reachability with `Test-NetConnection` or `nc`. |
| Resolves to old IP address | DNS cache has not expired (TTL still active). | Flush cache: `ipconfig /flushdns` (Windows) or `resolvectl flush-caches` (Linux). |

---

## 4. Network and Firewall Requirements

CampusNode containerized services require strict perimeter control.

### Port Allocation Rules

```
                      INTERNET / CAMPUS LAN
                                │
               ┌────────────────┴────────────────┐
               │  Inbound Port 80 (HTTP)         │
               │  Inbound Port 443 (HTTPS)       │
               └────────────────┬────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │  Host Network Interface │
                   └────────────┬────────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│  campusnode-frontend:80     │         │ campusnode-frontend:443     │
│  (Nginx Reverse Proxy)      │         │ (If TLS terminates on host) │
└──────────────┬──────────────┘         └──────────────┬──────────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   │
                     INTERNAL DOCKER BRIDGE ONLY
                     (campusnode-network)
                                   │
               ┌───────────────────┼───────────────────┐
               ▼                   ▼                   ▼
    ┌────────────────────┐ ┌───────────────┐ ┌────────────────┐
    │campusnode-backend  │ │campusnode-    │ │campusnode-     │
    │Port 5000 (hidden)  │ │postgres:5432  │ │redis:6379      │
    │                    │ │(hidden)       │ │(hidden)        │
    └────────────────────┘ └───────────────┘ └────────────────┘
```

### Minimum Firewall Matrix

| Port | Protocol | Scope | Direction | Purpose |
|---|---|---|---|---|
| **80** | TCP | Campus LAN / Public | Inbound | HTTP access and automatic redirect to HTTPS; ACME HTTP-01 challenge if applicable |
| **443** | TCP | Campus LAN / Public | Inbound | Secure HTTPS browser access |
| **22** | TCP | IT Admin Subnet / VPN Only | Inbound | Secure SSH server administration |
| **5000** | TCP | **Internal Docker Only** | **NEVER Expose** | Express API and WebSockets |
| **5432** | TCP | **Internal Docker Only** | **NEVER Expose** | PostgreSQL database service |
| **6379** | TCP | **Internal Docker Only** | **NEVER Expose** | Redis queue and cache service |
| **8025 / 8081** | TCP | Localhost / SSH Tunnel | **NEVER Expose** | Mailpit and Adminer development viewers |

### Host Firewall Verification Checklist (Linux UFW / iptables)

Run these checks on the college Linux server:

```bash
# Check UFW firewall status
sudo ufw status verbose

# Allow required web ports only
sudo ufw allow 80/tcp comment 'CampusNode HTTP'
sudo ufw allow 443/tcp comment 'CampusNode HTTPS'
sudo ufw allow 22/tcp comment 'SSH Administration'

# Ensure internal ports are NOT allowed through UFW
sudo ufw status numbered
```

> **Docker Firewall Bypass Note:** On Linux, Docker by default manipulates `iptables` directly, which can bypass UFW rules for published ports. Because CampusNode's `compose.production.yaml` only publishes `${APP_PORT:-80}:80`, ports 5432, 6379, and 5000 are **physically not published to any host interface**, ensuring absolute isolation.

---

## 5. Nginx and Reverse Proxy Configuration

In CampusNode, the frontend container (`campusnode-frontend`) runs Alpine Nginx 1.27. It serves both the built React 19 SPA static assets and acts as the internal reverse proxy.

### Inspection of Existing Repository Configuration (`client/nginx.conf`)

The repository's current `client/nginx.conf` features:
- `client_max_body_size 25M;` (supports photo/file upload limits)
- `location /api/ { proxy_pass http://backend:5000; }` (reverse proxies REST endpoints)
- `location /socket.io/ { proxy_pass http://backend:5000; ... }` (handles WebSocket upgrade and 86400s timeouts)
- `location = /health { proxy_pass http://backend:5000/health; }` (direct health probe passthrough)
- React SPA fallback routing (`try_files $uri $uri/ /index.html;`)

### The Two Reverse Proxy Architectural Models

Depending on college IT policy, your deployment will follow one of two models:

---

### Model A: Central College Reverse Proxy Terminates TLS (Most Common)

In university environments, a central gateway (e.g., F5 BIG-IP, HAProxy, or central Nginx) often sits at the network edge. It holds the `*.nitj.ac.in` SSL certificate, terminates HTTPS, and forwards plain HTTP traffic to internal department servers.

```
Browser  ──[ HTTPS :443 ]──►  Central College Gateway (SSL Terminated)
                                      │
                                      ▼
                             [ Internal HTTP :80 ]
                                      │
                                      ▼
                        CampusNode Server (Port 80)
```

#### What You Need to Do for Model A:
1. Keep the standard `compose.production.yaml` publishing port 80.
2. In `client/nginx.conf`, ensure that forwarded proto headers are respected.
3. Express already includes `app.set("trust proxy", 1);` in `server/index.js`, so it correctly recognizes that requests originated as HTTPS via `X-Forwarded-Proto`.

---

### Model B: CampusNode Server Terminates TLS Directly

If the college gives you a dedicated public or private IP and assigns `campusnode.nitj.ac.in` directly to your server, your server's Nginx must handle TLS termination on port 443 and redirect port 80.

```
Browser  ──[ HTTPS :443 ]──►  CampusNode Server (Nginx with SSL Cert)
```

#### Illustrative Production Nginx Config with Direct SSL (`client/nginx.conf`):

```nginx
# HTTP — Redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name campusnode.nitj.ac.in;

    # Allow ACME challenge for Let's Encrypt certificate renewal
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS — Secure Application Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name campusnode.nitj.ac.in;

    ssl_certificate /etc/nginx/ssl/campusnode.crt;
    ssl_certificate_key /etc/nginx/ssl/campusnode.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 25M;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
    }

    # REST API Proxy
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
        proxy_buffering off;
    }

    # Socket.IO Realtime WebSocket Proxy
    location /socket.io/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_send_timeout 86400s;
        proxy_read_timeout 86400s;
    }

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. HTTPS and TLS Certificates

Accessing a college platform over plain HTTP triggers scary browser warnings ("Not Secure"), prevents Progressive Web App (PWA) installation, and causes browsers to reject authentication cookies (see Section 7).

### TLS Options for College Deployments

| Option | Provider | How Validation Works | Ideal Situation |
|---|---|---|---|
| **1. Central Proxy SSL** | College IT Gateway | College team configures SSL on their central appliance | Server sits on private LAN; no certificate management needed on your host |
| **2. College Institutional Cert** | College IT / InCommon / Sectigo | College IT signs and issues `.crt` and `.key` files to place on your server | Server is private or public; domain is officially recognized |
| **3. Let's Encrypt (HTTP-01)** | Let's Encrypt CA | Port 80 must be reachable from the public internet by Let's Encrypt servers | Server has a public IP or public port forwarding on port 80 |
| **4. Let's Encrypt (DNS-01)** | Let's Encrypt CA | Requires adding a `_acme-challenge` TXT record into authoritative DNS | Server is on a private network, but IT gives you automated DNS API access |

### Crucial Caveat on Let's Encrypt in College Networks
- **Let's Encrypt HTTP-01 CANNOT issue certificates for internal-only private IP addresses (like `10.x.x.x`).**
- The Let's Encrypt verification servers validate from the public internet. If `campusnode.nitj.ac.in` resolves to an internal private IP, Let's Encrypt HTTP-01 validation will **fail immediately**.
- In an intranet-only setup, you must obtain an institutional certificate from college IT or rely on the central university reverse proxy.

> **Absolute Rule:** Never disable TLS/SSL validation in your code or instruct students to click through browser certificate warnings.

---

## 7. Application Configuration for the Domain

When CampusNode shifts from `localhost` to `campusnode.nitj.ac.in`, several core application behaviors change.

### Required Environment Variables in `.env`

Edit `/opt/campusnode/.env` on the server:

```env
# ------------------------------------------------------------------------------
# 1. APPLICATION & DOMAIN URLS
# ------------------------------------------------------------------------------
# Set to the exact approved scheme and domain (NO trailing slash)
CLIENT_URL=https://campusnode.nitj.ac.in

# Whitelist both apex and www variants if applicable
ALLOWED_ORIGINS=https://campusnode.nitj.ac.in,http://campusnode.nitj.ac.in

# Production mode enforces security controls
NODE_ENV=production
```

### Why `CLIENT_URL` Must NOT Be `localhost`

The `CLIENT_URL` variable is actively used in:
1. **Email Verification Links (`server/routes/auth.js` line 257):**
   ```javascript
   const verifyUrl = `${clientUrl}/verify-email/${rawToken}`;
   ```
   If `CLIENT_URL` is `http://localhost`, a student clicking the verification email on their phone will attempt to open `localhost` on their phone, which fails.
2. **Password Reset Links:**
   Generates links pointing to the public domain so users can reset passwords from any device.
3. **CORS Validation (`server/utils/corsConfig.js`):**
   Incoming browser requests with `Origin: https://campusnode.nitj.ac.in` are compared against `allowedOrigins`. If missing, Express responds with HTTP 403 `Not allowed by CORS origin`.

### Frontend `VITE_API_URL` Must Remain Empty

In `client/src/services/api.js`:
```javascript
const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
const api = axios.create({ baseURL: cleanBaseUrl, withCredentials: true });
```
- When `VITE_API_URL` is empty string (`""`), Axios makes relative calls: `GET /api/events`.
- Because the browser is on `https://campusnode.nitj.ac.in`, the request goes to `https://campusnode.nitj.ac.in/api/events`.
- Nginx intercepts `/api/` and routes it internally to `http://backend:5000/api/events`.
- **Result:** Zero CORS latency, zero cross-domain preflight overhead, and zero hardcoded port numbers!

> **Warning:** If you change any `VITE_*` variable, you **must rebuild the frontend container image** (`docker compose -f compose.production.yaml build frontend`). Frontend environment variables are compiled into static JS files at build time.

### Authentication Cookies and HTTPS Interaction

Inspect `server/routes/auth.js` (lines 60–65):
```javascript
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: isProduction,               // true when NODE_ENV === 'production'
  sameSite: isProduction ? "none" : "lax",
  maxAge,
});
```

- When `NODE_ENV=production`, Express sets `secure: true` and `sameSite: "none"`.
- Modern browsers (Chrome, Edge, Firefox, Safari) enforce that any cookie with `SameSite=None` **must** also have `Secure=true` (which requires an HTTPS connection).
- If you access the application over plain `http://` while `NODE_ENV=production`, **the browser will silently discard login cookies**, and login will appear broken!
- **Guidance:** Always use HTTPS when `NODE_ENV=production`. If you are performing temporary unencrypted HTTP tests, set `NODE_ENV=development` in `.env` so cookies use `SameSite=Lax` without the mandatory Secure requirement.

---

## 8. Docker Compose and Service Exposure

For the college server, use `compose.production.yaml` exclusively.

### Key Inspectable Properties in `compose.production.yaml`

1. **Port Exposure:**
   ```yaml
   ports:
     - "${APP_PORT:-80}:80"
   ```
   Only the Nginx frontend container exposes a port to the host.
2. **PostgreSQL & Redis Isolation:**
   Neither `postgres` nor `redis` define a `ports:` section. They exist solely inside the internal bridge network `campusnode-network`. They cannot be reached by network scanners or attackers on the campus LAN.
3. **Dedicated Migration Runner:**
   The `migration` service runs `npx prisma migrate deploy` before the backend container starts, ensuring database consistency without manual intervention.

---

## 9. Step-by-Step Deployment Procedure

Follow these ordered steps to deploy on the college server under the approved domain:

```
[Phase 1: Approvals] ──► [Phase 2: Server Prep] ──► [Phase 3: Config] ──► [Phase 4: Launch] ──► [Phase 5: Verification]
```

### Phase 1: Institutional Approvals & DNS Setup
- [ ] **Step 1:** Submit the formal request to the NIT Jalandhar IT team (see template in [Section 2](#2-request-the-domain-from-college-it)).
- [ ] **Step 2:** Obtain written confirmation of:
  - Approved domain (e.g., `campusnode.nitj.ac.in`)
  - Server static IP (e.g., `10.10.x.x`)
  - DNS resolution status (A record added)
  - TLS termination model (Model A: Central Gateway vs. Model B: Direct Server SSL)

### Phase 2: Server Preparation
- [ ] **Step 3:** SSH into the Linux server:
  ```bash
  ssh username@<SERVER_IP>
  ```
- [ ] **Step 4:** Verify Docker and Docker Compose v2:
  ```bash
  docker --version
  docker compose version
  ```
- [ ] **Step 5:** Clone the repository to `/opt/campusnode`:
  ```bash
  sudo mkdir -p /opt/campusnode
  sudo chown $USER:$USER /opt/campusnode
  cd /opt/campusnode
  git clone <REPO_URL> .
  ```

### Phase 3: Configuration & Secret Generation
- [ ] **Step 6:** Create the server `.env` file:
  ```bash
  cp .env.example .env
  ```
- [ ] **Step 7:** Generate cryptographically secure server secrets:
  ```bash
  # Generate unique server secrets
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
  node -e "console.log('POSTGRES_PASSWORD=' + require('crypto').randomBytes(32).toString('base64url'))"
  node -e "console.log('REDIS_PASSWORD=' + require('crypto').randomBytes(32).toString('base64url'))"
  ```
- [ ] **Step 8:** Configure domain settings in `/opt/campusnode/.env`:
  ```env
  APP_PORT=80
  NODE_ENV=production
  CLIENT_URL=https://campusnode.nitj.ac.in
  ALLOWED_ORIGINS=https://campusnode.nitj.ac.in

  POSTGRES_DB=campusnode
  POSTGRES_USER=campusnode_user
  POSTGRES_PASSWORD=<generated-postgres-password>
  DATABASE_URL=postgresql://campusnode_user:<generated-postgres-password>@postgres:5432/campusnode?sslmode=disable

  REDIS_PASSWORD=<generated-redis-password>
  REDIS_URL=redis://:<generated-redis-password>@redis:6379

  JWT_SECRET=<generated-jwt-secret>

  ADMIN_EMAIL=admin@nitj.ac.in
  ADMIN_PASS=<strong-unique-admin-password>
  ```

### Phase 4: Build & Launch
- [ ] **Step 9:** Build application container images:
  ```bash
  docker compose -f compose.production.yaml build
  ```
- [ ] **Step 10:** Start all services in detached mode:
  ```bash
  docker compose -f compose.production.yaml up -d
  ```
- [ ] **Step 11:** Verify migration executed cleanly:
  ```bash
  docker compose -f compose.production.yaml logs migration
  # Look for: "All migrations have been successfully applied."
  ```
- [ ] **Step 12:** Seed the initial super-administrator:
  ```bash
  docker exec campusnode-backend node scripts/seed-admin.js
  ```

### Phase 5: Verification & Testing
- [ ] **Step 13:** Check container health:
  ```bash
  docker compose -f compose.production.yaml ps
  ```
- [ ] **Step 14:** Test local health response on the server:
  ```bash
  curl -i http://localhost/health
  # Expected: HTTP/1.1 200 OK with {"ok":true}
  ```
- [ ] **Step 15:** Test DNS resolution from a campus client laptop:
  ```powershell
  Resolve-DnsName campusnode.nitj.ac.in
  ```
- [ ] **Step 16:** Open `https://campusnode.nitj.ac.in` in a web browser on campus Wi-Fi.
- [ ] **Step 17:** Log in with the administrator credentials and verify event dashboard access.
- [ ] **Step 18:** Register a test student account and confirm email verification dispatch.
- [ ] **Step 19:** Document server configuration in the team records.

---

## 10. Domain and HTTPS Troubleshooting

When a domain deployment behaves unexpectedly, use this matrix to diagnose the exact layer causing the problem.

| Symptom | Diagnostic Command | Root Cause | Solution |
|---|---|---|---|
| `DNS_PROBE_FINISHED_NXDOMAIN` | `nslookup campusnode.nitj.ac.in` | Record not in DNS or local DNS cache stale. | Check with college IT DNS team; run `ipconfig /flushdns`. |
| Resolves to wrong IP | `dig +short campusnode.nitj.ac.in` | Outdated A record in college DNS server. | Request DNS administrator update the record to the current static IP. |
| Works on server, but not on laptop | `Test-NetConnection -ComputerName <SERVER_IP> -Port 80` (from laptop) | Firewall blocking port 80/443 between laptop subnet and server subnet. | Request IT whitelist traffic between student Wi-Fi and server IP on port 80/443. |
| Works on campus, fails from home | `ping campusnode.nitj.ac.in` (from home) | Server is assigned a private IP (`10.x.x.x`). Normal for intranet deployments. | Expected behavior for internal testing. Users must connect via Campus VPN to access. |
| `NET::ERR_CERT_COMMON_NAME_INVALID` | Check browser SSL padlock details | Certificate issued for different domain or self-signed. | Ensure the certificate installed matches `campusnode.nitj.ac.in` exactly. |
| HTTP works, HTTPS times out | `curl -Iv https://campusnode.nitj.ac.in` | Port 443 is blocked on the firewall or Nginx is not listening on 443. | Confirm port 443 open in UFW and college firewall; check Nginx SSL configuration. |
| Login succeeds, but refreshes immediately back to login | Browser DevTools → Application → Cookies | Cookies discarded due to `Secure` flag on unencrypted HTTP. | Deploy valid HTTPS, or set `NODE_ENV=development` in `.env` for temporary plain HTTP testing. |
| API calls fail with CORS error in console | Check browser console: `Not allowed by CORS origin` | Browser origin does not match `CLIENT_URL` or `ALLOWED_ORIGINS` in `.env`. | Add the exact URL to `ALLOWED_ORIGINS` in `.env`, then run `docker compose -f compose.production.yaml restart backend`. |
| Socket.IO fails to connect (`WebSocket connection failed`) | Browser console → Network → WS filter | Missing `Upgrade` and `Connection` headers in upstream reverse proxy. | Ensure Nginx has `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`. |
| Nginx returns `502 Bad Gateway` | `docker compose -f compose.production.yaml logs backend` | Express backend container is crashed or restarting. | Check backend logs for missing env variables or database connection errors. |
| Upload fails with `413 Request Entity Too Large` | Check upload request size | File exceeds Nginx limit. | `client/nginx.conf` sets `client_max_body_size 25M;`. Keep uploads under 25MB or adjust config. |

---

## 11. Security and Operational Boundaries

Making CampusNode accessible via a college domain increases its visibility. Keep these operational boundaries in mind:

### What This Non-Production Deployment Does NOT Guarantee

1. **No DDoS Mitigation:** A high volume of simultaneous requests during a major fest could overwhelm the single server.
2. **No Automated Failover:** If the host machine reboots or suffers a hardware fault, CampusNode will be offline until manually inspected.
3. **No WAF Protection:** There is no Web Application Firewall (like Cloudflare or ModSecurity) inspecting payloads for zero-day vulnerabilities.
4. **Internal Testing Scope:** This deployment is intended for evaluating functionality with dozens or hundreds of users, not tens of thousands of concurrent festival attendees.

### Security Hardening Checklist

Before welcoming campus testers:

- [ ] **Change Admin Defaults:** Ensure `ADMIN_PASS` in `.env` is NOT default (`admin@123`).
- [ ] **Rotate JWT Secret:** Ensure `JWT_SECRET` is a 64-byte high-entropy string generated fresh for this server.
- [ ] **Disable Debug Logging:** Set `NODE_ENV=production` in `.env`.
- [ ] **Verify Network Isolation:** Run `nmap -p 5432,6379 <SERVER_IP>` from an external laptop — both ports **must be closed/filtered**.
- [ ] **Keep Docker Host Updated:** Run `sudo apt-get update && sudo apt-get upgrade` regularly.
- [ ] **Back Up Database Before Testing Events:** Execute a `pg_dump` before any live campus trial (see [Section 12 of DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#12-server-data-backups-and-recovery)).

---

## 12. Information to Obtain from College IT (Fill-in Checklist)

Complete this form before beginning server deployment:

```text
================================================================================
          CAMPUSNODE — COLLEGE IT DEPLOYMENT INFORMATION RECORD
================================================================================

1. DOMAIN & ROUTING
   • Approved Domain / Subdomain : _____________________________________________
   • Assigned Server IPv4        : _____________________________________________
   • Subnet Mask / Gateway       : _____________________________________________
   • Network Scope               : [ ] Campus Intranet Only  [ ] Public Internet

2. ADMINISTRATIVE CONTACTS
   • IT / Network Administrator  : _____________________________________________
   • DNS Administrator Contact   : _____________________________________________
   • Server / VM Administrator   : _____________________________________________
   • Institutional Email/Phone   : _____________________________________________

3. REVERSE PROXY & FIREWALL
   • Reverse Proxy Model         : [ ] Model A (Central Gateway)  [ ] Model B (Direct Host)
   • Inbound Port 80 Whitelisted : [ ] Yes  [ ] No  (Ticket Ref: ______________)
   • Inbound Port 443 Whitelisted: [ ] Yes  [ ] No  (Ticket Ref: ______________)
   • Outbound SMTP Allowed (587) : [ ] Yes  [ ] No

4. TLS / SSL CERTIFICATES
   • SSL Certificate Provided By : [ ] Central Gateway  [ ] College CRT Files  [ ] Let's Encrypt
   • Certificate Expiry Date     : _____________________________________________
   • Renewal Procedure           : _____________________________________________

5. DATA & BACKUP POLICY
   • Automated VM Snapshots      : [ ] Yes (Schedule: _________)  [ ] No (Manual DB dumps)
   • Backup Storage Location     : _____________________________________________

================================================================================
```

---

## 13. Pre-Deployment and Post-Deployment Checklists

### Pre-Deployment Checklist (Before Running Docker)
- [ ] Server access granted via SSH with sudo or docker group permissions.
- [ ] Subdomain allocated by college IT and points to the server IP.
- [ ] Inbound ports 80 and 443 confirmed open on host and network firewalls.
- [ ] `.env` created from `.env.example` with zero placeholder credentials.
- [ ] `DATABASE_URL` references host `postgres` with matching password.
- [ ] `REDIS_URL` references host `redis` with matching password.
- [ ] `CLIENT_URL` and `ALLOWED_ORIGINS` set to the exact approved domain.
- [ ] `VITE_API_URL` left blank in build arguments for relative proxying.

### Post-Deployment Verification Checklist (After `docker compose up -d`)
- [ ] All containers in `compose.production.yaml` show `(healthy)` or `Exited (0)`.
- [ ] `curl -i http://localhost/health` returns HTTP 200 OK with `{"ok":true}`.
- [ ] DNS resolves correctly from an independent laptop on campus Wi-Fi.
- [ ] Domain loads in a web browser via HTTPS with a valid certificate lock icon.
- [ ] Admin user seeded via `docker exec campusnode-backend node scripts/seed-admin.js`.
- [ ] Administrator successfully logs in and views the dashboard.
- [ ] Student registration test dispatches verification email to Mailpit or SMTP server.
- [ ] Real-time Socket.IO connection confirms successful handshake in backend logs.
- [ ] Database data persists after a test container restart (`docker compose down && docker compose up -d`).

---

## 14. Assumptions and Unresolved Questions

Document any unresolved site-specific questions with the college administration:

| Topic | Assumption Made in Documentation | What to Confirm with College IT |
|---|---|---|
| **Domain Name** | Assumed `campusnode.nitj.ac.in` as the target domain. | Confirm the exact permitted subdomain name. |
| **Network Scope** | Assumed deployment is restricted to the internal campus network / Wi-Fi. | Clarify if access from student homes (outside campus) is expected. |
| **SSL Provisioning** | Assumed college IT will either terminate SSL centrally or provide cert files. | Confirm whether institutional certificates or Let's Encrypt will be used. |
| **SMTP Delivery** | Assumed college SMTP server (`smtp.nitj.ac.in`) is available for outbound email. | Obtain valid SMTP credentials and relay policies from the IT team. |
| **Server Hardware** | Assumed an Ubuntu 22.04 LTS VM with 4+ GB RAM and 20+ GB storage. | Verify the actual allocated VM specifications. |
| **Host Backups** | Assumed application team is responsible for manual database dumps. | Inquire whether the hypervisor performs daily VM-level snapshots. |

---

*This document is part of the official CampusNode deployment documentation series.*  
*Main deployment guide: [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)*

