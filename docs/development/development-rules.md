# CampusNode Core Development Rules 📜

These rules are non-negotiable architectural constraints for all engineers, contributors, and AI assistants working on CampusNode.

---

## 1. Database Layer Rules

1. **No Duplicate Identity Tables**:
   - **NEVER** create a new user table when adding a new role.
   - Always evaluate whether the persona is fundamentally a `StudentUser` (enrolled student) or an `AdminRole` (faculty/staff authority).
2. **Never Confuse Identity with Organizational Responsibility**:
   - Students who become Club Heads, Coordinators, or Event Staff retain their `StudentUser` identity. Their leadership is modeled through relationship tables (`ClubMembership`, `EventStaff`), never as an `AdminRole` record.
3. **Use Migrations for Schema Changes**:
   - Never manually run raw DDL queries against PostgreSQL production databases.
   - All changes must be authored in `server/prisma/schema.prisma` and applied via `npm run prisma:migrate` or `npm run prisma:push`.
4. **Enforce Referential Integrity**:
   - All foreign keys must define explicit relations with clear `@relation(..., onDelete: Cascade | SetNull)` policies.
5. **Primary Key Standardization**:
   - All models must use 24-character hexadecimal ID strings (`id String @id @db.VarChar(24)`).

---

## 2. Backend Layer Rules

1. **Centralize Business Rules in the Backend**:
   - Seat limits, registration deadlines, eligibility criteria, and payment verification checks must be enforced authoritatively on the backend.
   - Client applications (Web and Flutter) must **not** duplicate authoritative business logic.
2. **Never Trust Client Payloads**:
   - All incoming HTTP bodies, parameters, and query strings must be validated with Zod schemas and sanitized before touching database queries.
3. **Guard Endpoints with Granular RBAC**:
   - Privileged mutations must be protected by `verifyToken` and `requirePermission()`.
4. **Log Critical Administrative Actions**:
   - Any operation that alters event status, approves finances, or changes user roles must create a record in `AuditLog`.

---

## 3. Web Frontend Layer Rules

1. **Strict Separation of UI and Network Logic**:
   - React components must never import raw `axios` or execute direct HTTP calls. All calls must be routed through `client/src/services/*.js`.
2. **No Direct Database Access**:
   - The frontend communicates exclusively via HTTP REST APIs and WebSockets.
3. **Reactive State Updates**:
   - Avoid `window.location.reload()`. Use `AuthContext` state updates, React Router navigations, and local state management for reactive UI transitions.
4. **Consistent Design Tokens**:
   - All UI elements must use Tailwind CSS v4 styling tokens and support dark/light modes via `ThemeContext`.

---

## 4. Flutter Mobile Layer Rules

1. **Connect Directly to the Shared Backend**:
   - The Flutter mobile app must connect to the **same Node.js Express backend** as the web client.
   - The mobile app must **never** create a separate backend or connect directly to PostgreSQL.
2. **Presentation Freedom with Shared Business Logic**:
   - Mobile-specific screens, touch gestures, bottom navigation bars, and hardware camera scanner integrations are encouraged, provided they adhere to the same backend API contracts.
3. **Secure Token Storage**:
   - JWT tokens must be stored in hardware-encrypted storage via `flutter_secure_storage`, not in plaintext shared preferences.
4. **Model Backend DTOs, Not Database Tables**:
   - Dart models must deserialize the backend API response JSON contracts (`API Response DTOs`), not raw internal database columns.
