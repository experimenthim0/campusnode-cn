# CampusNode — Temporary Isolated Launch Rollout

## 1. What the Rollout Module Does

The temporary rollout module implements a staged user rollout exclusively for the initial production launch of CampusNode (beginning **27 September 2026**). It restricts access to application features on both the frontend and server-side based on verified database user identity and institutional email allowlists, while keeping authentication and registration accessible to all.

### Rollout Stages:
- **Stage 0 (27 September 2026)**: Administration, Faculty, and Temporary Early-Access Student Club Leads/Heads.
- **Stage 1 (Configurable)**: B.Tech 3rd & 4th Year.
- **Stage 2 (Configurable)**: B.Tech 1st & 2nd Year.
- **Stage 3 (Configurable)**: M.Tech (all years).
- **Stage 4 (Configurable)**: All remaining eligible programs (M.Sc, MBA, Ph.D, Other) and external users.

---

## 2. Files Belonging to the Rollout Module

All rollout code is strictly grouped in isolated folders:

### Backend (`server/temporary-rollout/`)
- `config.js`: Configuration, master toggle, IST timezone handling, and centralized stage schedule.
- `earlyAccessEmails.js`: Official institutional email allowlist for current Student Club Leads/Heads.
- `rolloutService.js`: Core evaluation service using trusted database identities and `calculateAcademicProgress`.
- `rolloutMiddleware.js`: Express middleware enforcing server-side rollout access control on application APIs.
- `index.js`: Module entry point.
- `README.md`: This operational and removal guide.
- `__tests__/rollout.test.js`: Vitest test suite verifying disabled mode, stage timing, and early access.

### Frontend (`client/src/temporary-rollout/`)
- `RolloutGate.jsx`: React gate component that inspects user rollout status.
- `RolloutBlocked.jsx`: Clean, on-brand CampusNode phased launch screen with group, availability date, and sign-out button.
- `index.js`: Frontend module entry point.

---

## 3. Existing Files with Integration Points

Only **4 existing files** contain integration hooks, each marked with `// [TEMPORARY ROLLOUT INTEGRATION]`:

1. `server/index.js`:
   - Imports `rolloutMiddleware` from `./temporary-rollout/index.js`.
   - Mounts `app.use(rolloutMiddleware)` before application routes.
2. `server/routes/users.js`:
   - In `GET /api/users/me`, attaches `rollout: await evaluateRolloutAccess(req.user)` to user payload.
3. `server/routes/auth.js`:
   - In `/login` and `/verify-2fa`, attaches `rollout: await evaluateRolloutAccess(user)` to auth response.
4. `client/src/components/ProtectedRoute.jsx`:
   - If `user?.rollout?.allowed === false`, renders `<RolloutBlocked rollout={user.rollout} />`.

---

## 4. Configuration & Environment Variables

- `CAMPUSNODE_ROLLOUT_ENABLED`: Set to `"true"` to activate production rollout gating. Defaults to `"false"`.
- `ROLLOUT_DATE_STAGE_0`: Launch start date for Admin, Faculty, and Early-Access Club Leads (default: `"2026-09-27T00:00:00+05:30"`).
- `ROLLOUT_DATE_STAGE_1`: ISO date for B.Tech 3rd & 4th Year (optional, e.g. `"2026-09-28T09:00:00+05:30"`).
- `ROLLOUT_DATE_STAGE_2`: ISO date for B.Tech 1st & 2nd Year (optional).
- `ROLLOUT_DATE_STAGE_3`: ISO date for M.Tech (optional).
- `ROLLOUT_DATE_STAGE_4`: ISO date for remaining programs & external users (optional).

All dates use Indian Standard Time (`Asia/Kolkata`, UTC+05:30).

---

## 5. How to Disable Immediately

If any issue occurs in production or during testing:
```bash
# In .env:
CAMPUSNODE_ROLLOUT_ENABLED=false
```
Or restart the process without setting this variable. When `false`:
- The rollout module immediately passes through all requests (`return next()`).
- No dates, databases, or email lists are evaluated.
- CampusNode behaves 100% normally as an unrestricted application.

---

## 6. Steps to Remove After Launch

Once all rollout stages have concluded, remove the temporary rollout completely:

### Step A: Delete Temporary Directories
```bash
# From workspace root:
rm -rf server/temporary-rollout/
rm -rf client/src/temporary-rollout/
```

### Step B: Remove Integration Lines
1. In `server/index.js`:
   - Remove `import { rolloutMiddleware } from "./temporary-rollout/index.js";`
   - Remove `app.use(rolloutMiddleware);`
2. In `server/routes/users.js`:
   - Remove `import { evaluateRolloutAccess } from "../temporary-rollout/index.js";`
   - In `GET /api/users/me`, remove the `rollout` property from the returned JSON.
3. In `server/routes/auth.js`:
   - Remove `import { evaluateRolloutAccess } from "../temporary-rollout/index.js";`
   - In `/login` and `/verify-2fa`, remove the `rollout` property from the returned JSON.
4. In `client/src/components/ProtectedRoute.jsx`:
   - Remove `import { RolloutBlocked } from '../temporary-rollout';`
   - Remove the `if (user?.rollout?.allowed === false) ...` check.

### Step C: Clean Environment
- Remove `CAMPUSNODE_ROLLOUT_ENABLED` and any `ROLLOUT_DATE_STAGE_*` variables from `.env`.

**No database migrations, no Prisma schema updates, and no SQL cleanup are required.**

---

## 7. How to Verify Removal

Run the standard test suite:
```bash
cd server
npm test
```
Verify that all existing tests pass with zero errors. Verify that users of any year or program can log in, access application routes, and participate in events with no rollout blocking.
