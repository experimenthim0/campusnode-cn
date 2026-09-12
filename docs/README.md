# CampusNode Documentation 📚

Welcome to the authoritative developer and engineering documentation for **CampusNode** — the unified campus event management, cryptographic ticketing, student society operations, AI-powered feedback analytics, and student engagement platform.

This documentation serves as the single source of truth for engineering teams, open-source contributors, and AI pair-programmers to understand system architecture, domain models, backend APIs, React 19 web frontend, and Flutter mobile applications without ambiguity.

```text
CampusNode Documentation System
         │
         ├── Root Architecture References
         │   ├── BACKEND_SCHEMA.md (PostgreSQL & Prisma Data Models)
         │   └── API_ENDPOINTS.md  (Complete REST API Catalog)
         │
         ├── /docs/architecture   (System Design, Multi-Principal Auth, RBAC & Flows)
         ├── /docs/database       (Prisma Models, Cardinality, ERDs & Migrations)
         ├── /docs/backend        (Express 5, Middleware, Services & AI Pipelines)
         ├── /docs/frontend-web   (React 19, Vite, Tailwind v4, Contexts & Portals)
         ├── /docs/mobile-flutter (Flutter 3.x Cross-Platform Architecture)
         └── /docs/development    (Step-by-step Guides, Extension Flows & Hard Rules)
```

---

## 🌟 Platform Core Modules & Capabilities

CampusNode unifies fragmented university workflows into an integrated, secure, and modern digital platform:

1. **Event Lifecycle & Governance**: End-to-end event workflow from proposal drafting, multi-department faculty review, venue collision detection, public feed publication, to automated post-event archiving.
2. **Direct Dual-Payment Architecture**:
   - **Official / Central Events**: Direct routing to college central payment portals (`COLLEGE_GATEWAY` via `collegePaymentUrl`).
   - **Club / Society Events**: Direct peer-to-peer / club UPI transfers (`MANUAL_UPI` via `upiId` & `accountHolderName`) with UTR number submission and manual screenshot verification by club heads/payment admins.
   - *Zero Platform Escrow*: CampusNode does not hold or escrow funds, removing complex payout delays.
3. **Cryptographic Ed25519 QR Ticketing & Offline Scanner**: High-throughput attendance check-in using digital signatures (`/scanner`). Validates attendee authenticity in under 50ms per scan, functioning seamlessly even with zero internet connectivity.
4. **AI Sentiment & Multi-Dimensional Feedback**: Automated 6-dimension student feedback survey integrated with Gemini / OpenRouter AI analysis (`/api/feedback/:eventId/ai-review`), generating interim and final sentiment reports and downloadable executive PDFs.
5. **Multi-Principal Role-Based Access Control (RBAC)**: Fine-grained permissions matrix governing 7 distinct personas (`admin`, `facultyCoordinator`, `club_account`, `central_organizer`, `EVENT_STAFF`, `student`/`member`, and `external`).
6. **Institutional Accounts & DSW Central Organizers**: Central governance layer allowing the Dean Student Welfare (DSW) office to manage mega-fests, institute-wide orientations, and delegate student central organizers.
7. **Team Registrations & Hackathons**: Complete team creation, invitation token generation, member roster limits, and unified team ticket issuance.
8. **Export Center**: Enterprise-grade multi-dataset reporting engine (`/export-center`) supporting CSV export with UTF-8 BOM encoding for events, registrations, students, clubs, financial transactions, and revenue summaries.
9. **Lost & Found Portal**: Campus-wide lost and found directory with photo upload verification, claims tracking, student notifications, and administrative moderation.
10. **Interactive Venue Scheduling**: Real-time calendar grid with conflict collision checks and blackout window management for campus auditoriums and halls.

---

## 👥 System Personas & Role Matrix

| Persona / Role | Account Principal | Key Responsibilities | Primary Web Routes |
| :--- | :--- | :--- | :--- |
| **`admin`** | `AdminRole` | Full platform oversight, create/delete clubs, assign coordinators, system audits, venue control. | `/admin`, `/export-center` |
| **`facultyCoordinator`** | `AdminRole` | Review & approve event proposals, oversee club budgets, manage venue blackout slots. | `/admin` (Coordinator view) |
| **`club` / `club_account`** | `ClubAccount` / `StudentUser` | Create event drafts, verify manual UPI payments, take attendance, issue certificates. | `/club-dashboard`, `/create-event` |
| **`central_organizer`** | `StudentUser` (DSW Assigned) | Coordinate campus-wide fests, institutional events, assign and delegate event staff operators. | `/central-organizer/dashboard` |
| **`EVENT_STAFF`** | `EventStaff` delegation | High-speed cryptographic QR ticket scanning and offline check-in at event entry gates. | `/scanner` |
| **`student` / `member`** | `StudentUser` (`@nitj.ac.in`) | Browse events, single/team registration, submit feedback, download certificates, Lost & Found. | `/events`, `/my-events`, `/lost-found` |
| **`external`** | `ExternalUser` (Other colleges) | Register for open inter-college hackathons and fests, join teams, receive verified QR tickets. | `/events`, `/my-events` |

---

## 🚀 Quick Onboarding Guide

Follow this curated reading path based on your area of contribution:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          ALL ENGINEERS                                  │
│  1. System Overview       ➜ /docs/architecture/system-overview.md       │
│  2. Identity & User Types ➜ /docs/database/identity-and-user-types.md   │
│  3. Database Schema       ➜ BACKEND_SCHEMA.md                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ BACKEND DEV      │       │ WEB FRONTEND DEV │       │ FLUTTER DEV      │
│ • Backend Arch   │       │ • Web Arch       │       │ • Flutter Plan   │
│ • API Catalog    │       │ • Auth State     │       │ • Backend Integr.│
│   (API_ENDPOINTS)│       │ • Component Flow │       │ • Data Models    │
│ • Middleware     │       │ • API Service    │       │ • Web-to-Flutter │
│ • Add API Guide  │       │ • Add Web Feature│       │ • Add Mobile Feat│
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 📑 Complete Documentation Catalog

### 📖 Root Architecture Specifications
- [BACKEND_SCHEMA.md](file:///c:/Users/yadav/Desktop/campusnode-sep/BACKEND_SCHEMA.md) — Authoritative PostgreSQL models, Prisma schema definition, data relationships, and enum references.
- [API_ENDPOINTS.md](file:///c:/Users/yadav/Desktop/campusnode-sep/API_ENDPOINTS.md) — Comprehensive REST API endpoint catalog, authentication requirements, and payload specs.

---

### 1. System Architecture (`/docs/architecture`)
- [System Overview](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/architecture/system-overview.md) — High-level platform architecture, deployment topologies, and technology stack.
- [Frontend-Backend Communication Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/architecture/frontend-backend-flow.md) — End-to-end request/response mechanics, interceptors, and data pipelines.
- [Authentication Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/architecture/authentication-flow.md) — Multi-principal JWT tokens, session cookies, 2FA OTPs, and password recovery.
- [Authorization & RBAC Matrix](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/architecture/authorization-rbac.md) — Dynamic permission registry, role inheritance, and institutional delegations.
- [Request Lifecycle (Real Examples)](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/architecture/request-lifecycle.md) — Step-by-step code traces for student login, event registration, and payment reviews.

---

### 2. Database Architecture (`/docs/database`)
- [Database Overview](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/database-overview.md) — PostgreSQL engine setup, connection pooling, and schema structure.
- [Database Schema Design](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/schema-design.md) — Model-by-model field references, types, constraints, and operational purposes.
- [Identity & User Types](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/identity-and-user-types.md) — Core separation of Student User vs Admin Role identities and student club roles.
- [Database Relationships](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/relationships.md) — Foreign key mappings, cardinality, and ER diagrams.
- [SQL & Prisma Model Generation](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/sql-model-generation.md) — Migrations, Prisma Client generation, and database sync workflows.
- [Database Diagrams](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/database/database-diagrams.md) — Visual entity relationship diagrams and state machine transition flows.

---

### 3. Backend Architecture (`/docs/backend`)
- [Backend Architecture](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/backend/backend-architecture.md) — Express 5 server bootstrap, modular route registration, and security layers.
- [API Design Guidelines](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/backend/api-design.md) — RESTful conventions, pagination, HTTP status codes, and input sanitization.
- [Controllers & Services Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/backend/controllers-services-flow.md) — Separation of concerns, business logic isolation, and reusable services.
- [Middleware Pipeline](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/backend/middleware.md) — Authentication, RBAC, input validation (Zod), rate limiting, and performance tracking.
- [Error Handling & Auditing](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/backend/error-handling.md) — Global error interceptors, standard error formats, and immutable audit logs.

---

### 4. Web Frontend Architecture (`/docs/frontend-web`)
- [Web Architecture](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/frontend-web/web-architecture.md) — React 19, Vite, Tailwind CSS v4, and component directory patterns.
- [API Integration & Axios Client](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/frontend-web/api-integration.md) — Centralized Axios instance, request/response interceptors, and service wrappers.
- [Authentication State Management](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/frontend-web/authentication-state.md) — `AuthContext`, reactive state synchronization, and route guards (`ProtectedRoute`).
- [Component Data Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/frontend-web/component-data-flow.md) — Props down, events up, real-time WebSockets, and toast notifications.
- [Feature Development Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/frontend-web/feature-development-flow.md) — Standard lifecycle for building new web pages and modals.

---

### 5. Flutter Mobile Architecture (`/docs/mobile-flutter`)
- [Flutter Architecture Plan](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/flutter-architecture-plan.md) — Mobile-first architectural plan connecting to the same Node.js backend.
- [Flutter Backend Integration](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/flutter-backend-integration.md) — Dio HTTP client, secure token storage, interceptors, and cookie handling.
- [Flutter Data Models](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/flutter-data-models.md) — Mapping backend JSON DTOs to immutable Dart data classes.
- [Flutter Authentication](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/flutter-authentication.md) — JWT persistence, biometrics, 2FA OTP, and multi-principal state management.
- [Flutter Feature Flow](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/flutter-feature-flow.md) — Building features using the Presentation -> State Management -> Repository pattern.
- [Web to Flutter Mapping](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/mobile-flutter/web-to-flutter-mapping.md) — Direct mapping table between React components, services, and Flutter widgets.

---

### 6. Development Guides & Rules (`/docs/development`)
- [How to Add a Database Model](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/development/how-to-add-a-database-model.md) — Decision flow for Student vs Admin ownership, Prisma schema editing, and migration execution.
- [How to Add an API](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/development/how-to-add-an-api.md) — Step-by-step guide for creating routes, controllers, validation schemas, and RBAC guards.
- [How to Add a Web Feature](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/development/how-to-add-a-web-feature.md) — End-to-end guide for creating React pages, modals, services, and route guards.
- [How to Add a Flutter Feature](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/development/how-to-add-a-flutter-feature.md) — Step-by-step guide for building new mobile screens, models, and repositories.
- [Development Rules](file:///c:/Users/yadav/Desktop/campusnode-sep/docs/development/development-rules.md) — Non-negotiable engineering rules across database, backend, web, and mobile layers.

---

## 🛠️ Project Technology Stack

| Layer | Technology | Version / Key Packages | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Server** | Node.js (ESM) | Express 5.2.x, Socket.IO 4.8.x | REST API server, real-time events, websocket broadcasting |
| **Database & ORM** | PostgreSQL | Prisma 7.7.x (`@prisma/adapter-pg`, `pg`) | Relational database, type-safe queries & migrations |
| **Frontend Web** | React 19 + Vite | React Router DOM v7, Tailwind CSS v4, Lucide, Framer Motion | Single Page Application (SPA), role-based dashboards |
| **Mobile (Target)** | Flutter 3.x (Dart) | Dio, Flutter Secure Storage, Provider / Riverpod | Cross-platform iOS & Android mobile companion |
| **AI Intelligence** | Gemini / OpenRouter | Google Gemini 2.5 / Flash via OpenRouter | Automated post-event feedback sentiment analytics |
| **Cryptography** | Node.js Crypto / Ed25519 | Public Key Cryptography, Signed Base64URL Tickets | High-throughput offline QR ticket validation |
| **Cloud & Media** | Cloudinary | Cloudinary SDK | Cloud storage for posters, banners, avatars & proofs |
| **Notifications** | Resend / Nodemailer / Web Push | `web-push` (VAPID standard) | Email verification, 2FA OTPs, browser push alerts |
| **Testing** | Vitest | Vitest v4.x, Supertest | Unit, integration & RBAC matrix automated test suite |

---

## 💻 Local Development Quickstart

### 1. Prerequisites
- Node.js 20+ installed
- PostgreSQL 15+ database instance running

### 2. Backend Server Setup
```pwsh
cd server
npm install
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, CLOUDINARY_*, and RESEND_API_KEY in .env
npx prisma generate
npx prisma db push
npm run dev
```
Backend runs at `http://localhost:5000` (API: `http://localhost:5000/api`).

### 3. Frontend Web Setup
```pwsh
cd client
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 4. Running Test Suites
```pwsh
cd server
npm test
```
Runs 11 test suites and 115+ automated unit and integration tests covering RBAC security, feedback reviews, scanner check-in, external participants, and export pipelines.
