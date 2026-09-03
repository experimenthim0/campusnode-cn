# 🖥️ CampusNode (ClubSetu) — Backend Server

The backend service for **CampusNode (ClubSetu)**, a campus event management and student organization platform built with **Node.js**, **Express.js**, **PostgreSQL**, and **Prisma ORM**.

---

## 📁 File and Folder Structure

```text
server/
├── assets/                             # Static server assets
│   └── fonts/                          # TTF font files for PDF certificate rendering
│       ├── Allura.ttf
│       ├── DancingScript.ttf
│       ├── GreatVibes.ttf
│       ├── Pacifico.ttf
│       ├── PinyonScript.ttf
│       └── Sacramento.ttf
│
├── constants/                          # System-wide static configuration & metadata
│   └── academicConstants.js            # NITJ academic branches, departments, batches & degrees
│
├── controllers/                        # Business logic and request controller handlers
│   ├── certificateController.js        # Dynamic PDF certificate generation & layout logic
│   └── clubMemberController.js         # Club roster, coordinator hierarchy & membership management
│
├── lib/                                # Core library singletons
│   └── prisma.js                       # Prisma Client connection pool & lifecycle management
│
├── middleware/                         # Express request processing & security middleware
│   ├── auth.js                         # JWT authentication & session token verification
│   ├── errorHandler.js                 # Global centralized error handling & response formatter
│   ├── eventStaffAuth.js               # Dedicated authentication for event staff / scanner operators
│   ├── performance.js                  # Response caching, request timing & latency tracking
│   ├── profileUpload.js                # Multer configuration for profile picture uploads
│   ├── role.js                         # Basic role verification helpers
│   └── validate.js                     # Request body schema validation middleware
│
├── prisma/                             # Database schema & migrations
│   ├── migrations/                     # PostgreSQL database migration history
│   └── schema.prisma                   # Prisma ORM schema models & relational definitions
│
├── routes/                             # Express REST API endpoints & route handlers
│   ├── __tests__/                      # Route unit and integration tests
│   │   └── scanner.test.js
│   ├── admin.js                        # System administrator control panel & user oversight
│   ├── auth.js                         # Authentication, OTP login, registration, password resets
│   ├── blackouts.js                    # Academic & institutional blackout date scheduling
│   ├── centralOrganizer.js             # Central event board & institution organizer workflows
│   ├── certificates.js                 # Certificate issuance, verification & download routes
│   ├── clubMembers.js                  # Club member assignment & coordinator role management
│   ├── clubs.js                        # Public & authenticated club directory endpoints
│   ├── eventStaff.js                   # Event staff portal, credentials & event assignments
│   ├── events.js                       # Event CRUD, registration, seat caps & proposal reviews
│   ├── exportCenter.js                 # Data export (CSV, Excel) for attendees & reports
│   ├── lostFound.js                    # Campus Lost & Found item reporting & claim workflows
│   ├── lostFoundAdmin.js               # Moderation panel & resolution controls for Lost & Found
│   ├── notifications.js                # In-app notifications & announcement broadcasts
│   ├── participation.js                # Student event attendance & participation verification
│   ├── payment.js                      # Event fee tracking, payment proofs & transaction reviews
│   ├── push.js                         # Web Push subscription registration & notification dispatch
│   ├── scanner.js                      # High-speed cryptographic QR ticket scanning & check-in
│   ├── teams.js                        # Hackathon & team competition management
│   ├── users.js                        # User profile updates, preferences & avatar uploads
│   └── venues.js                       # Campus venue availability, slot booking & collision checks
│
├── scripts/                            # Operational, database seeding & maintenance scripts
│   ├── checkIds.js                     # Identity consistency & duplicate verification script
│   ├── generate-qr-keypair.js          # Cryptographic keypair generator (ECDSA/RSA) for QR signing
│   ├── generate-test-tickets.js        # Mock QR ticket generation for scanning load tests
│   ├── inspect-db.js                   # PostgreSQL database inspection & row counter utility
│   ├── migrate-schema.js               # Schema migration & table synchronization utility
│   ├── seed-lostfound-admin.js         # Seed initial Lost & Found administrative credentials
│   ├── seed.js                         # Database seeder (sample clubs, events, users)
│   └── testEmail.js                    # Transactional email dispatcher verification script
│
├── services/                           # Reusable domain service logic & integrations
│   ├── __tests__/                      # Service unit tests
│   │   ├── exportCenterService.test.js
│   │   └── qrSigningService.test.js
│   ├── conflictService.js              # Event venue & timing schedule conflict detector
│   ├── exportCenterService.js          # Excel/CSV dataset builder & stream transformer
│   └── qrSigningService.js             # Cryptographic HMAC/ECDSA digital signing for QR passes
│
├── utils/                              # Utility helpers, third-party adapters & sanitizers
│   ├── __tests__/                      # Utility unit tests
│   │   └── rbac.test.js
│   ├── auditLog.js                     # Security audit logging for sensitive actions
│   ├── checkPasswordRateLimit.js       # Rate limiter helper for failed authentication attempts
│   ├── cloudinary.js                   # Cloudinary SDK client configuration for image uploads
│   ├── corsConfig.js                   # Cross-Origin Resource Sharing (CORS) rules & origins
│   ├── eventStatus.js                  # Event state machine helpers (UPCOMING, LIVE, ENDED)
│   ├── generateResetToken.js           # Cryptographically secure random token generator
│   ├── imageProcessor.js               # Image optimization, resizing & compression via Sharp
│   ├── objectId.js                     # MongoDB-to-PostgreSQL ID compatibility helpers
│   ├── postgresEventSerializer.js      # Relational entity serializer for frontend payload shapes
│   ├── publicResponseCache.js          # In-memory LRU/TTL caching for public catalog responses
│   ├── rbac.js                         # Granular Role-Based Access Control matrix & permissions
│   ├── sanitizeInput.js                # Input sanitization against XSS & injection attacks
│   ├── sanitizeUser.js                 # Strips sensitive fields (passwords, tokens) from user models
│   ├── sendEmail.js                    # Transactional email sender via Nodemailer / Resend
│   ├── sendPush.js                     # Web push notification sender via web-push / VAPID
│   ├── slugify.js                      # URL-friendly slug generator
│   ├── slugifyUnique.js                # Unique slug collision resolver
│   └── vapid.js                        # VAPID key management & payload encryption for Push
│
├── .dockerignore                       # Files excluded from Docker builds
├── .env.example                        # Example environment variables template
├── Dockerfile                          # Container definition for backend service
├── docker-compose.postgres.yml         # Local PostgreSQL container configuration
├── index.js                            # Express application setup & Socket.io server entry point
├── package.json                        # Node.js project manifest & dependencies
├── package-lock.json                   # Deterministic dependency tree lockfile
├── prisma.config.ts                    # Prisma configuration options
├── qr-signing-private.pem              # Private key for digital ticket signing (PEM format)
├── qr-signing-public.pem               # Public key for scanner verification (PEM format)
└── vitest.config.js                    # Vitest unit test runner configuration
```

---

## 🏛️ Core Modules & Responsibilities

### 1. **Entry Point & Server Initialization (`index.js`)**
- Configures **Express 5** application instance.
- Initializes **HTTP server** and attaches **Socket.io** for real-time notifications and check-in pulses.
- Mounts security headers (**Helmet**), **CORS**, **Gzip compression**, rate limiters, and global request logging.
- Mounts modular route groups under `/api/*`.

### 2. **Database & ORM (`prisma/`)**
- Uses **Prisma ORM** with **PostgreSQL 16**.
- Schema defines relational models: `User`, `Club`, `ClubMember`, `Event`, `Registration`, `Team`, `TeamMember`, `LostFoundItem`, `Notification`, `BlackoutDate`, `Venue`, `CertificateTemplate`, `CertificateIssue`, and `AuditLog`.

### 3. **Authentication & Authorization (`routes/auth.js`, `middleware/auth.js`, `utils/rbac.js`)**
- **JWT Authentication** with HTTP-only cookies and Authorization headers.
- **Granular RBAC**: Supports `student`, `member`, `club`, `facultyCoordinator`, `central_organizer`, `event_staff`, `lostFoundAdmin`, and `admin`.

### 4. **QR Code Ticket Signing & Attendance (`services/qrSigningService.js`, `routes/scanner.js`)**
- Cryptographic digital signing for event passes prevents counterfeit tickets.
- Fast, low-latency check-in verification pipeline supporting camera scanning and barcode input.

### 5. **Automated PDF Certificate Engine (`controllers/certificateController.js`, `assets/fonts/`)**
- Generates verified, personalized PDF certificates dynamically using **PDFKit** and bundled custom calligraphy typography.
