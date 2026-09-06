# CampusNode — Key Rotation, Blast Radius & Migration Runbook

This document provides a step-by-step operational guide for teammates who need to rotate, update, or replace any secret, keypair, or configuration variable in CampusNode.

For each credential, this guide explains:
1. **How to generate the new value**
2. **Where to update it**
3. **The exact blast radius (impact on logged-in students, mobile scanner apps, and existing data)**
4. **Step-by-step migration procedure to avoid downtime**

---

## Quick Reference Summary Table

| Credential | Rotation Risk Level | Impact on Existing Users & Services | Requires Client Update? |
| :--- | :---: | :--- | :---: |
| **`JWT_SECRET`** | **Medium** | All active web & mobile sessions expire immediately (HTTP 401). Users must log in again. No data lost. | No |
| **`QR_SIGNING_KEY_ID` & Keys** | **High** | Previously generated QR tickets fail verification if old key is discarded. Offline scanner apps need key update. | App sync needed |
| **`VAPID_PUBLIC_KEY` & Private** | **High** | Existing browser push subscriptions become permanently invalid. Subscriptions must be recreated. | Automatic on re-visit |
| **`DATABASE_URL`** | **Critical** | Service fails if connection string is invalid. Data loss if pointed to un-migrated host. | No |
| **`ADMIN_PASS`** | **Low** | Stored bcrypt hash in DB is unchanged until re-seeded or updated via account settings. | No |
| **`RESEND_API_KEY`** | **Low** | Immediate failure of outgoing emails if key is invalid. Zero session impact. | No |
| **`CLOUDINARY_API_SECRET`** | **Low** | Newly uploaded images fail if invalid. Existing image URLs continue serving via CDN. | No |
| **`OPENROUTER_API_KEY`** | **Low** | AI feedback review fails. Core events and ticketing unaffected. | No |

---

## 1. `JWT_SECRET` (Authentication Session Secret)

The `JWT_SECRET` is used by the backend to sign and verify JSON Web Tokens for students, club officials, faculty coordinators, and administrators.

### Impact on Existing Users & Services:
- **Instant Session Invalidation**: Every currently authenticated user will receive `401 Unauthorized` on their next API request.
- **Client Auto-Recovery**: The client Axios interceptor (`client/src/services/api.js`) automatically detects the 401 status, clears `localStorage` (`user`, `admin`, `role`), and redirects to the login screen.
- **Database Safety**: **No user records, registrations, or permissions are modified**. Users only need to enter their credentials to obtain a new token.
- **Background Jobs**: Scheduled cron tasks or internal service tokens using JWT will fail until restarted.

### How to Rotate:
1. Generate a fresh 64-byte (512-bit) high-entropy hex string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Update the variable:
   - **Local Development**: Update `JWT_SECRET` in `server/.env`.
   - **Staging / Production**: Update `JWT_SECRET` in the Render Web Service Environment Settings.
3. Deploy / restart the backend service.
4. Notify the team that all developers and testers must log in again.

---

## 2. QR Ticket Signing Keys (`QR_SIGNING_KEY_ID`, `PRIVATE_KEY`, `PUBLIC_KEY`)

CampusNode uses asymmetric **Ed25519** digital signatures for event tickets. The private key resides only on the server, while the public key is used by Android scanners to verify tickets both online and offline.

### Impact on Existing Users & Services:
- **Previously Issued Tickets**: QR payloads embed the `keyId` (e.g. `CN1|cn-qr-2026-01|eventId|ticketId`). If you rotate the key without preserving the old public key, **tickets issued prior to the rotation will fail scanner verification** at the gate!
- **Android Scanner Apps (Offline Mode)**: The scanner app (`scanner-app/app/src/main/java/com/campusnode/scanner/crypto/QrVerifier.kt`) pre-seeds trusted keys in `TRUSTED_DEFAULT_KEYS`. If a new `keyId` is issued, offline devices will report:
  `Verification failed: Key ID 'cn-qr-2026-02' not found in cache`.
- **Online Verification**: Works immediately if the scanner has an internet connection and syncs `/api/keys`.

### Safe Zero-Downtime Rotation Procedure:
1. **Increment the Key ID** (e.g., from `cn-qr-2026-01` to `cn-qr-2026-02`).
2. Generate the new Ed25519 keypair:
   ```bash
   node server/scripts/generate-qr-keypair.js
   ```
3. **Do not discard the old public key**. Keep the old public key in the scanner app or server key registry so older valid tickets continue to pass verification until events conclude.
4. Update `QR_SIGNING_KEY_ID`, `QR_SIGNING_PRIVATE_KEY`, and `QR_SIGNING_PUBLIC_KEY` on Render.
5. In the Android scanner repository, add the new public key and `keyId` to `TRUSTED_DEFAULT_KEYS` in `QrVerifier.kt` and distribute an app update to volunteer gatekeepers.

---

## 3. Web Push VAPID Keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)

VAPID (Voluntary Application Server Identification) keys create cryptographic authorization headers for Web Push notifications across desktop and mobile browsers.

### Impact on Existing Users & Services:
- **Permanent Invalidation of Existing Subscriptions**: When a browser creates a push subscription, it registers with the browser vendor push service (Google FCM, Mozilla autopush, Apple Web Push) using the server's `VAPID_PUBLIC_KEY`.
- If the server VAPID keypair changes, future push notifications sent to existing `PushSubscription` records will be rejected with **HTTP 410 Gone** or **HTTP 401 Unauthorized**.
- **User Re-subscription**: Users will not receive push notifications until they re-visit the web application. When they return, the service worker detects the mismatched application server key, cancels the dead subscription, and requests a new one.

### How to Rotate:
1. Generate a new ECDH prime256v1 (P-256) keypair:
   ```bash
   node -e "const c = require('crypto'); const e = c.createECDH('prime256v1'); e.generateKeys(); const toB64 = b => b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); console.log('VAPID_PUBLIC_KEY=' + toB64(e.getPublicKey()) + '\nVAPID_PRIVATE_KEY=' + toB64(e.getPrivateKey()));"
   ```
2. Update `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Render (or `server/.env`).
3. Clean dead push subscription tokens from the database to prevent futile outbound delivery requests:
   ```sql
   -- Run on staging database (or production if rotating prod)
   TRUNCATE TABLE "PushSubscription";
   ```
4. Restart the backend service.

---

## 4. `DATABASE_URL` (PostgreSQL Connection String)

The connection string controls which PostgreSQL database instance the Prisma Client and pg connection pool communicate with.

### Impact on Existing Users & Services:
- **Same Database, New Password**: Brief disruption lasting 10–30 seconds while the backend process restarts with the new credentials. Once restarted, all existing sessions and data continue uninterrupted.
- **Different Database Host**: If switched to a new, empty database without migrating and restoring data:
  - Users cannot log in (`User not found`).
  - Events, clubs, and registrations will not appear.
  - Potential foreign key errors.

### Safe Migration Checklist:
1. **Never change `DATABASE_URL` directly in production without pre-migrating**:
   ```bash
   # Run against the new database connection string before switching traffic:
   npx prisma migrate deploy
   ```
2. Verify the target database with the safety guard:
   ```bash
   npm --prefix server run db:verify
   ```
3. If moving data from an existing database, perform a full `pg_dump` and `pg_restore`:
   ```bash
   pg_dump -d "<OLD_DATABASE_URL>" --no-owner --clean | psql -d "<NEW_DATABASE_URL>"
   ```
4. Update `DATABASE_URL` in the Render dashboard and deploy.

---

## 5. `CLOUDINARY_*` Credentials & Folder Prefix

Controls cloud asset storage for event banners, club logos, certificates, and student profile photos.

### Variables:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX`

### Impact on Existing Users & Services:
- **Existing Images**: Images uploaded to Cloudinary are served through static HTTPS CDN URLs stored in the database (`https://res.cloudinary.com/<cloud>/image/upload/...`). Rotating credentials does **NOT** break existing image display.
- **New Uploads**: If the API key or secret is invalid, new uploads (creating events, updating avatars, issuing certificates) will fail with HTTP 500.
- **Folder Prefix**: Changing `CLOUDINARY_FOLDER_PREFIX` (e.g. from `campusnode/staging` to `campusnode/v2`) only directs newly uploaded files into the new directory namespace. Existing images remain at their original URLs.

### How to Rotate:
1. Generate new API credentials in the Cloudinary Console (`Settings` → `Access Keys`).
2. Update the environment variables in Render or `server/.env`.
3. Test an image upload via event creation or profile photo update.

---

## 6. `RESEND_API_KEY` (Transactional Email Service)

Controls sending student verification OTPs, password reset links, ticket registration confirmations, and admin notifications.

### Impact on Existing Users & Services:
- **Active Sessions**: Zero impact on logged-in users.
- **Email Delivery**: If the key is revoked or expired:
  - New student signups cannot complete verification.
  - "Forgot Password" reset emails will fail to send.
  - In local development (`NODE_ENV !== "production"`), if `RESEND_API_KEY` is empty, the system automatically falls back to `MockTransport` without crashing.

### How to Rotate:
1. In the [Resend Dashboard](https://resend.com/api-keys), click **Create API Key**.
2. Restrict permissions to "Sending access" for the domain `campusnode.in` or `clubsetu.nikhim.me`.
3. Update `RESEND_API_KEY` in Render (or `server/.env`).
4. Trigger a test email using `node server/scripts/testEmail.js`.

---

## 7. `ADMIN_PASS` & `COMMON_PASSWORD`

Governs administrative passwords for `adminRole` accounts and initial club coordinators.

### Impact on Existing Users & Services:
> [!IMPORTANT]
> Changing `ADMIN_PASS` in `server/.env` or Render **does NOT alter passwords already hashed in the database**!
> Passwords in the database are stored as one-way bcrypt hashes. Updating the environment variable only alters what `node scripts/seed.js` uses on its next run.

### How to Change:
- **For an Individual Admin**: Log in and use the "Change Password" settings screen, or use the "Forgot Password" reset flow.
- **Via Database Re-seed (Staging Only)**:
  1. Update `ADMIN_PASS` in `server/.env`.
  2. Run `node server/scripts/seed.js` to update the bcrypt hash for the admin account in the staging database.

---

## 8. `OPENROUTER_API_KEY` (AI Sentiment & Event Feedback)

Governs attendee feedback processing via OpenRouter LLM API.

### Impact on Existing Users & Services:
- **Core Platform**: Zero impact on logins, registration, ticketing, or payments.
- **AI Analytics Feature**: If invalid or quota is exceeded, organizers viewing the "AI Feedback Insights" tab on past events will receive a notification that AI analysis is temporarily unavailable.

### How to Rotate:
1. Generate a new key in the OpenRouter dashboard.
2. Update `OPENROUTER_API_KEY` in Render or `server/.env`.
3. Verify by triggering feedback analysis on any concluded event with submitted feedback.

---

## 9. Comprehensive Rotation Testing Script

To test the health and integrity of all services after rotating any key, run:

```bash
# 1. Verify database safety and connection
npm --prefix server run db:verify

# 2. Run unit tests
npm --prefix server test

# 3. Verify client build
npm --prefix client run build
```

---

## 10. Emergency Checklist: "A Key Has Been Leaked"

If a key was accidentally committed to a public branch or exposed:

1. **Immediate Step**: Revoke the leaked key immediately in the third-party dashboard (Neon, Resend, Cloudinary, OpenRouter).
2. **Rotate Environment Secret**:
   - Generate a replacement key using the commands in Section 1–8.
   - Update the production/staging settings in Render and Vercel.
   - Trigger a manual redeploy.
3. **If Database URL was leaked**:
   - Change the role password immediately in the Neon console.
   - Update `DATABASE_URL` on Render.
4. **If JWT Secret was leaked**:
   - Rotate `JWT_SECRET` immediately. All attackers holding forged tokens will be instantly blocked.
5. **Git Cleanup**:
   - Even after rotating, purge the commit from git history using `git filter-repo` or BFG Repo-Cleaner before pushing.
