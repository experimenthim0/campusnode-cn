# CampusNode — Secure Environment Separation & Secret Management Guide

## 1. CampusNode Environment Architecture

CampusNode enforces a strict multi-tier environment architecture that separates local development and staging testing from live production. This ensures that feature testing, automated scripts, schema migrations, and credential rotations can never compromise production availability, student privacy, or database integrity.

### Dual-Branch & Multi-Environment Flow

```text
GitHub Repository
├── main      (Production code branch — protected, only receives reviewed PRs)
└── develop   (Staging & active development branch — integration target)
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. LOCAL DEVELOPMENT                                                        │
│ Branch: develop                                                             │
│                                                                             │
│   Browser / Client                               Server Runtime             │
│   http://localhost:5173  ───────────────►        http://localhost:5001      │
│   (Vite dev server)      [REST & Socket.IO]      (Node Express API)         │
│                                                         │                   │
│                                                         ▼                   │
│                                              ┌───────────────────────┐      │
│                                              │   STAGING DATABASE    │      │
│                                              │   (Cloud PostgreSQL)  │      │
│                                              └───────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. STAGING DEPLOYMENT                                                       │
│ Branch: develop                                                             │
│                                                                             │
│   Vercel Staging                                 Render Staging             │
│   https://<staging-app>.vercel.app ────►        https://<staging>.onrender  │
│   (Preview / Develop Deployment)                 (Web Service on develop)   │
│                                                         │                   │
│                                                         ▼                   │
│                                              ┌───────────────────────┐      │
│                                              │   STAGING DATABASE    │      │
│                                              │   (Shared with Local) │      │
│                                              └───────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. PRODUCTION DEPLOYMENT                                                    │
│ Branch: main                                                                │
│                                                                             │
│   Vercel Production                              Render Production          │
│   https://campusnode.in / .vercel.app ─►        https://<prod>.onrender.com │
│   (Production Domain)                            (Web Service on main)      │
│                                                         │                   │
│                                                         ▼                   │
│                                              ┌───────────────────────┐      │
│                                              │  PRODUCTION DATABASE  │      │
│                                              │  (Strictly Isolated)  │      │
│                                              └───────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local vs Staging vs Production Matrix

| Attribute | Local Development | Staging Deployment | Production Deployment |
| :--- | :--- | :--- | :--- |
| **Git Branch** | `develop` | `develop` | `main` |
| **Frontend Host** | `http://localhost:5173` | `https://<staging-app>.vercel.app` | `https://campusnode.in` or production Vercel URL |
| **Frontend API Target** | `http://localhost:5001` | Staging Render URL | Production Render URL |
| **Backend Host** | `http://localhost:5001` | Render Staging Web Service | Render Production Web Service |
| **Database Instance** | **Staging Database** | **Staging Database** | **Production Database** |
| **JWT Secret** | Staging Secret | Staging Secret | Production Secret |
| **QR Signing Key ID** | `cn-qr-staging-2026-01` | `cn-qr-staging-2026-01` | `cn-qr-2026-01` |
| **VAPID Keypair** | Staging VAPID Keys | Staging VAPID Keys | Production VAPID Keys |
| **Cloudinary Folder** | `campusnode/staging/` | `campusnode/staging/` | `campusnode/production/` |
| **Email Delivery** | Mock Transport (or staging test email) | Mock Transport or staging key | Resend Production API Key |
| **Admin Password** | Staging Admin Password | Staging Admin Password | Production Master Password |
| **Verification Bypass** | Allowed for automated tests (`SKIP_VERIFICATION=true`) | `false` | Strictly `false` |

---

## 3. Environment-Variable Classification

Every environment variable in CampusNode belongs to one of three security tiers:

### Tier 1: Critical Secrets (Must Be Completely Different)
These variables must never be shared between staging/local and production. Compromise of staging values must have zero mathematical or administrative correlation to production.
- `DATABASE_URL`
- `JWT_SECRET`
- `QR_SIGNING_KEY_ID`
- `QR_SIGNING_PRIVATE_KEY`
- `QR_SIGNING_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ADMIN_PASS`
- `COMMON_PASSWORD`

### Tier 2: Third-Party Integrations (Preferably Separate)
These credentials connect to external software services. Separate staging accounts or sandboxes should be used whenever feasible.
- `RESEND_API_KEY`: If using the same account, use `onboarding@resend.dev` or leave unset in local dev (safely defaults to `MockTransport`).
- `EMAIL_FROM` & `EMAIL_FROM_NAME`: Staging should identify as test/staging sender.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Use `CLOUDINARY_FOLDER_PREFIX="campusnode/staging"` to partition assets if using a single account.
- `OPENROUTER_API_KEY`: Separate key or free tier model (`openrouter/free`) for testing to protect production quota.

### Tier 3: Runtime Configuration (Environment-Specific Settings)
Non-sensitive configuration governing network bindings and operational flags.
- `PORT`
- `CLIENT_URL`
- `VITE_API_URL`
- `VITE_GOOGLE_APPS_SCRIPT_URL`
- `VITE_MAINTENANCE_MODE`
- `MAINTENANCE_MODE`
- `MAINTENANCE_MESSAGE`
- `SKIP_VERIFICATION`
- `OPENROUTER_MODEL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_SITE_NAME`

---

## 4. Exact Variable Names Used by CampusNode

### Client Variables (`client/.env`)
Vite only exposes variables prefixed with `VITE_` to client-side code:
1. `VITE_API_URL`: Base HTTP/HTTPS URL of the backend API (used by Axios and SocketContext).
2. `VITE_GOOGLE_APPS_SCRIPT_URL`: Google Apps Script deployment URL for feedback/contact modal submissions.
3. `VITE_MAINTENANCE_MODE`: Client-side UI maintenance flag (`true` | `false`).

### Server Variables (`server/.env`)
1. `ADMIN_EMAIL`: Default administrator identity for system seeding and alerts.
2. `ADMIN_PASS`: Master administrator account password.
3. `COMMON_PASSWORD`: Baseline password for seeded club accounts and coordinators.
4. `PORT`: HTTP port on which the Express application listens (default `5001` or `5000`).
5. `CLIENT_URL`: Authorized origin URL used by CORS policy and link generators.
6. `SKIP_VERIFICATION`: Bypasses student email OTP verification when set to `true` (development only).
7. `JWT_SECRET`: High-entropy secret key for signing and validating session tokens.
8. `RESEND_API_KEY`: API authorization key for Resend transactional email transport.
9. `EMAIL_FROM`: Full sender email address (e.g. `CampusNode <notifications@campusnode.in>`).
10. `EMAIL_FROM_NAME`: Display name for transactional outgoing emails.
11. `EMAIL_PASS`: Legacy SMTP credential fallback (leave empty if using Resend).
12. `CLOUDINARY_CLOUD_NAME`: Cloudinary account cloud identifier.
13. `CLOUDINARY_API_KEY`: Cloudinary API access key.
14. `CLOUDINARY_API_SECRET`: Cloudinary API secret for secure server-side signatures.
15. `CLOUDINARY_FOLDER_PREFIX`: Subfolder prefix for environment asset isolation (`campusnode/staging` vs `campusnode/production`).
16. `DATABASE_URL`: PostgreSQL connection string with SSL parameters.
17. `VAPID_PUBLIC_KEY`: Base64URL-encoded public key for Web Push notifications.
18. `VAPID_PRIVATE_KEY`: Base64URL-encoded private key for Web Push notifications.
19. `VAPID_SUBJECT`: Mailto or URL identifier for Web Push application server contact.
20. `QR_SIGNING_KEY_ID`: Versioned identifier for the Ed25519 digital signature key.
21. `QR_SIGNING_PRIVATE_KEY`: PEM-encoded Ed25519 private key for ticket QR digital signatures.
22. `QR_SIGNING_PUBLIC_KEY`: PEM-encoded Ed25519 public key for offline scanner verification.
23. `OPENROUTER_API_KEY`: Bearer token for OpenRouter AI event feedback analysis.
24. `OPENROUTER_MODEL`: LLM identifier (e.g. `openrouter/free` or `google/gemini-2.0-flash-lite-preview-02-05:free`).
25. `OPENROUTER_SITE_URL`: HTTP-Referer header required by OpenRouter rankings.
26. `OPENROUTER_SITE_NAME`: X-Title application name header required by OpenRouter.
27. `MAINTENANCE_MODE`: Backend-wide middleware gate returning HTTP 503 when `true`.
28. `MAINTENANCE_MESSAGE`: User-facing message returned during scheduled maintenance.
29. `PRODUCTION_DB_HOST`: Hostname of the production database (used by `db-safety-guard.js` to block destructive actions).

---

## 5. Which Variables Must Be Generated Separately

| Variable | Why It Must Be Separate | Staging Value Generation Rule |
| :--- | :--- | :--- |
| `DATABASE_URL` | Prevents tests or dev migrations from wiping production rows. | Use separate staging PostgreSQL database instance. |
| `JWT_SECRET` | Prevents a staging auth token from granting access to production endpoints. | Cryptographically strong 64-byte random hex string. |
| `QR_SIGNING_KEY_ID` | Scanners must distinguish staging test passes from production passes. | Use `cn-qr-staging-2026-01`. |
| `QR_SIGNING_PRIVATE_KEY` | If compromised in staging, counterfeit tickets cannot verify on production scanners. | Generate fresh Ed25519 keypair. |
| `QR_SIGNING_PUBLIC_KEY` | Public partner for staging signature verification. | Exported SPKI from staging Ed25519 keypair. |
| `VAPID_PUBLIC_KEY` | Push services bind subscriptions to specific VAPID keys. | Generate fresh prime256v1 ECDH keypair. |
| `VAPID_PRIVATE_KEY` | Isolates staging push triggers from live subscriber endpoints. | Staging ECDH private key. |
| `ADMIN_PASS` | Staging testing must never expose the real production admin credential. | Strong random string (minimum 24 characters). |
| `COMMON_PASSWORD` | Seeds test club accounts without using production passwords. | Strong random string. |

---

## 6. Commands Used to Generate Secrets

Run the built-in generator script in the server package:
```bash
npm --prefix server run secrets:staging
```
Or generate individual secrets via standard Node CLI:

### 1. High-Entropy JWT Secret (64 bytes / 512 bits)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. High-Entropy Passwords
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

---

## 7. How to Generate QR Signing Keys

CampusNode tickets utilize asymmetric **Ed25519** digital signatures. The private key resides exclusively on the backend server to sign ticket payloads (`CN1|{keyId}|{eventId}|{ticketId}`). Scanners verify signatures using the public key.

### Generate Ed25519 Keypair
```bash
node server/scripts/generate-qr-keypair.js
```
This produces:
- `QR_SIGNING_KEY_ID`: `cn-qr-staging-2026-01`
- `QR_SIGNING_PRIVATE_KEY`: One-line PEM formatted for `.env`
- `QR_SIGNING_PUBLIC_KEY`: One-line PEM formatted for `.env`

### Scanner Verification Architecture
- **Online Verification**: Scanners call `/api/scanner/verify` or `/api/keys/public`. The staging server validates tickets against its staging public key.
- **Offline Verification**: Android scanner apps pre-seed known trusted keys in `TRUSTED_DEFAULT_KEYS`. Production devices retain `cn-qr-2026-01`. For staging devices, add `cn-qr-staging-2026-01` to the staging scanner build or sync keys via `/api/keys`.

---

## 8. How to Generate VAPID Keys

Web Push notifications require an **ECDH P-256 (prime256v1)** key pair encoded in base64url format.

### Generate VAPID Keypair Command
```bash
node -e "const c = require('crypto'); const e = c.createECDH('prime256v1'); e.generateKeys(); const toB64 = b => b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); console.log('VAPID_PUBLIC_KEY=' + toB64(e.getPublicKey()) + '\nVAPID_PRIVATE_KEY=' + toB64(e.getPrivateKey()));"
```

### Browser Subscription Invalidation Rule
> [!IMPORTANT]
> When a user grants push notification permissions, the browser service worker creates a subscription mathematically bound to the server's `VAPID_PUBLIC_KEY`.
> - **Never regenerate production VAPID keys** without an intentional migration; changing the key immediately invalidates all existing push subscriptions for real users (push endpoints will return HTTP 410 Gone or 401 Unauthorized).
> - Staging uses its own separate VAPID keypair so staging notifications never interact with or invalidate production device subscriptions.

---

## 9. Database Separation Rules

CampusNode enforces a strict single-database rule for local and staging development:

```text
Local Dev (develop branch) ──┐
                             ├──►  STAGING DATABASE (Neon Staging Branch / Project)
Staging Render (develop)   ──┘

Production Render (main)   ──────► PRODUCTION DATABASE (Neon Production Instance)
```

### Safety Invariants:
1. **Local and Staging share the Staging Database**: Developers work against live staging test data, avoiding divergent local SQLite/PostgreSQL discrepancies.
2. `local DATABASE_URL ≠ production DATABASE_URL`
3. `staging DATABASE_URL ≠ production DATABASE_URL`
4. Production database credentials must NEVER exist in `client/.env`, `server/.env` (on developer machines), or in GitHub pull requests.

---

## 10. Prisma Safety Rules

Prisma operations are strictly guarded to prevent accidental schema corruption:

| Command | Allowed in Local/Staging? | Allowed in Production? | Safety Guard Mechanism |
| :--- | :--- | :--- | :--- |
| `prisma db push` | **Yes** (against Staging DB) | **NO** (Never in prod) | Blocked by `db-safety-guard.js` if `PRODUCTION_DB_HOST` matches |
| `prisma migrate dev` | **Yes** (creates migrations) | **NO** (Never in prod) | Blocked by `db-safety-guard.js` |
| `prisma migrate deploy` | **Yes** (applies migrations) | **Yes** (deployments only) | Safe: only executes versioned, unapplied SQL migrations |
| `prisma db seed` | **Yes** (populates test data) | **NO** | Blocked if target is flagged as production |

### Database Safety Verification Check
Before running any database script, verify your active target:
```bash
npm --prefix server run db:verify
```
If the database host matches `PRODUCTION_DB_HOST` or `CAMPUSNODE_DB_ENV="production"`, all destructive development commands are immediately halted with exit code 1.

---

## 11. Vercel Configuration

CampusNode uses Vercel for hosting the React Single Page Application and dynamic SEO preview serverless functions.

### Git Branch Mapping
- **Production**: Bound to `main` branch.
- **Staging / Preview**: Automatically builds all branches except `main` (specifically `develop`).

### Vercel Environment Variables Configuration
In the **Vercel Project Dashboard** (`Settings` → `Environment Variables`):

| Variable Name | Environment Scope: Production | Environment Scope: Preview (Staging) |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://<production-backend>.onrender.com` | `https://<staging-backend>.onrender.com` |
| `API_URL` | `https://<production-backend>.onrender.com` | `https://<staging-backend>.onrender.com` |
| `SITE_URL` | `https://campusnode.in` | `https://<staging-project>.vercel.app` |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | `<SCRIPT_URL>` | `<SCRIPT_URL>` |
| `VITE_MAINTENANCE_MODE` | `false` | `false` |

> [!TIP]
> Setting `VITE_API_URL` separately under **Preview** ensures that PRs and `develop` builds point exclusively to Render Staging without requiring code modifications.

---

## 12. Render Configuration

The backend Express application resides in the `server/` directory. Deploy two distinct Render Web Services connected to the same GitHub repository:

### Service 1: Staging Backend (`campusnode-staging`)
- **Git Branch**: `develop`
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install` (triggers `postinstall: prisma generate`)
- **Start Command**: `npm start` (or `node index.js`)
- **Environment Variables**:
  - `NODE_ENV`: `production` (or `staging`)
  - `PORT`: `10000`
  - `DATABASE_URL`: `<STAGING_DATABASE_URL>`
  - `CLIENT_URL`: `https://<staging-app>.vercel.app`
  - `JWT_SECRET`: `<STAGING_JWT_SECRET>`
  - `QR_SIGNING_KEY_ID`: `cn-qr-staging-2026-01`
  - `QR_SIGNING_PRIVATE_KEY`: `<STAGING_ED25519_PRIVATE_KEY>`
  - `QR_SIGNING_PUBLIC_KEY`: `<STAGING_ED25519_PUBLIC_KEY>`
  - `VAPID_PUBLIC_KEY`: `<STAGING_VAPID_PUBLIC_KEY>`
  - `VAPID_PRIVATE_KEY`: `<STAGING_VAPID_PRIVATE_KEY>`
  - `VAPID_SUBJECT`: `mailto:staging-admin@campusnode.in`
  - `CLOUDINARY_FOLDER_PREFIX`: `campusnode/staging`
  - `ADMIN_PASS`: `<STAGING_ADMIN_PASS>`
  - `COMMON_PASSWORD`: `<STAGING_COMMON_PASSWORD>`

### Service 2: Production Backend (`campusnode-server`)
- **Git Branch**: `main`
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install && npx prisma migrate deploy`
- **Start Command**: `node index.js`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `10000`
  - `DATABASE_URL`: `<PRODUCTION_DATABASE_URL>`
  - `CLIENT_URL`: `https://campusnode.in`
  - `JWT_SECRET`: `<PRODUCTION_JWT_SECRET>`
  - `QR_SIGNING_KEY_ID`: `cn-qr-2026-01`
  - `QR_SIGNING_PRIVATE_KEY`: `<PRODUCTION_ED25519_PRIVATE_KEY>`
  - `QR_SIGNING_PUBLIC_KEY`: `<PRODUCTION_ED25519_PUBLIC_KEY>`
  - `VAPID_PUBLIC_KEY`: `<PRODUCTION_VAPID_PUBLIC_KEY>`
  - `VAPID_PRIVATE_KEY`: `<PRODUCTION_VAPID_PRIVATE_KEY>`
  - `CLOUDINARY_FOLDER_PREFIX`: `campusnode/production`
  - `PRODUCTION_DB_HOST`: `<PRODUCTION_DATABASE_HOST>`

---

## 13. Git Branch Workflow

CampusNode strictly follows a dual-branch trunk development workflow:

```text
             feature/event-reviews
                 │
                 ▼
develop ───► Pull Request ───► Auto-Deploy Staging ───► QA Verification
  │                                                            │
  │                                                            ▼
  └─────────────────────────────────────────────────────► Pull Request to main
                                                               │
                                                               ▼
                                                     Auto-Deploy Production
```

### Developer Steps:
1. **Start from `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-new-feature
   ```
2. **Local Testing**:
   Ensure `client/.env` and `server/.env` are configured with staging values. Test against the staging database.
3. **Pull Request to `develop`**:
   Open a PR to merge into `develop`. Once merged:
   - Vercel deploys Staging Frontend (`*.vercel.app`).
   - Render deploys Staging Backend.
4. **Validation**: Test the complete flow on Staging.
5. **Release to Production**:
   Open a PR from `develop` to `main`. Once approved and merged, Production automatically deploys.

---

## 14. `.env.example` Structure Reference

The template files in version control contain clear descriptions without real credentials:
- [client/.env.example](file:///c:/Users/yadav/Desktop/campusnode-sep/client/.env.example)
- [server/.env.example](file:///c:/Users/yadav/Desktop/campusnode-sep/server/.env.example)

---

## 15. Secret-Management Rules

1. **Zero Secret Commits**:
   - `client/.env`, `server/.env`, and `*.pem` files are strictly listed in `.gitignore`.
   - Always run `git status` before committing to ensure no untracked credentials appear.
2. **Never Paste Production Secrets in Pull Requests or Issues**:
   - Redact all hostnames, keys, and tokens in error logs or PR descriptions.
3. **Local Files Architecture & Offline Production Storage**:
   - Developers maintain `client/.env` and `server/.env` locally (configured with Staging variables).
   - `server/.env.production` is used strictly for **offline storage & reference** so developers can keep production variables safely recorded locally without loading them into the running application.
   - `server/.env.production` and `client/.env.production` are strictly ignored by `.gitignore` and `server/.dockerignore`.
   - `server/.env.local` is **unused** by `dotenv` in the current backend and should not be used.
4. **Credential Rotation**:
   - To rotate a staging secret, run `npm --prefix server run secrets:staging` and update the Render Staging dashboard. Production is completely unaffected.

---

## 16. Deployment Checklist

### Before Merging to `develop` (Staging Deploy):
- [ ] Working branch is rebased on latest `develop`.
- [ ] No `.env` or `.pem` files are in git staged files.
- [ ] `npm test` passes in `server`.
- [ ] `npm run build` succeeds in `client`.
- [ ] Any new Prisma schema change has a migration generated via `prisma migrate dev`.
- [ ] Staging environment variables in Render/Vercel include any new required keys.

### Before Merging to `main` (Production Release):
- [ ] Feature verified and approved on the Staging Vercel deployment.
- [ ] Schema migrations applied and tested on Staging DB.
- [ ] Production Render service has all necessary environment variables populated.
- [ ] `PRODUCTION_DB_HOST` is set in production environment variables.
- [ ] Zero breaking database changes (all schema migrations are backwards-compatible).

---

## 17. Rollback & Incident Response Notes

If an issue occurs in Staging:
- Redeploy the previous commit on the `develop` branch.
- Reset staging database data if needed using staging seed scripts.

If an incident occurs in Production:
1. **Immediate Maintenance Mode**:
   Set `MAINTENANCE_MODE=true` in Render Production environment settings to pause incoming traffic gracefully with HTTP 503.
2. **Vercel Rollback**:
   In the Vercel dashboard, navigate to `Deployments` and instantly promote the last known stable production deployment.
3. **Render Rollback**:
   Revert the merge commit on `main` or redeploy the previous successful commit from the Render dashboard.
4. **Database Restoration**:
   If a bad migration was deployed, apply a forward corrective migration or restore a point-in-time snapshot via the Neon PostgreSQL console.

---

## 18. Why Changing Staging Secrets Does NOT Affect Production

Changing, rotating, or resetting staging credentials has **zero mathematical, operational, or architectural impact** on production:

1. **Cryptographic Key Isolation**:
   - Staging JWTs are signed with a distinct 512-bit staging secret. If the staging secret is regenerated, existing staging sessions expire, but production tokens verify using the production secret without interruption.
   - Staging QR tickets use Ed25519 key ID `cn-qr-staging-2026-01`. Production scanners reject these as invalid keys, preserving production event security.
2. **Database Isolation**:
   - Staging and production use separate Neon database clusters/projects. Resetting tables, deleting test events, or running migrations on staging executes queries against the staging database host only.
3. **Push Notification Isolation**:
   - VAPID keys create cryptographic handshake tokens for web push services. Staging push broadcasts cannot reach production browser endpoints.
4. **Asset Storage Namespacing**:
   - Cloudinary uploads use `CLOUDINARY_FOLDER_PREFIX="campusnode/staging"`, keeping test posters and logos isolated from production media.

---

## 19. Production Safety Guarantee

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION SAFETY GUARANTEE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT IS FULLY ISOLATED:                                                    │
│  ✔ Databases: Staging queries NEVER touch the production database.         │
│  ✔ JWT Authentication: Tokens cannot be forged across environments.         │
│  ✔ QR Ticket Signing: Staging passes cannot pass production scanners.       │
│  ✔ Web Push: Staging notifications cannot blast production users.           │
│  ✔ Cloudinary Media: Staging images are isolated by folder namespace.       │
│  ✔ Client Preview: Vercel previews cannot fall back to production API.      │
│  ✔ Prisma Safety Guard: Blocks destructive commands on production host.     │
│                                                                             │
│  WHAT COULD STILL AFFECT PRODUCTION IF CONFIGURED INCORRECTLY:             │
│  ⚠ Setting production DATABASE_URL in server/.env on a developer machine.   │
│    (Mitigated by: db-safety-guard.js and PRODUCTION_DB_HOST checks)         │
│  ⚠ Merging untested code directly into the main branch.                    │
│    (Mitigated by: Branch protection rules on GitHub main)                   │
│  ⚠ Using production RESEND_API_KEY in staging without mock transport.       │
│    (Mitigated by: MockTransport default when key is unset)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
