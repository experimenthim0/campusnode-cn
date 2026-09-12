# CampusNode — Backend Database Schema & Architecture 🗄️

Authoritative reference for the CampusNode database models, relationships, role-based access controls (RBAC), and entity lifecycles built on **PostgreSQL** using **Prisma ORM**.

---

## 1. System Personas & Role Matrix

CampusNode uses a role-based access control (RBAC) architecture with dedicated account types and permissions.

### Account Types (Principals)
- **`StudentUser`**: NITJ students (`@nitj.ac.in`). Students browse events, register individually or in teams, submit post-event feedback, manage their profile and social links, and earn verified certificates.
- **`Club Lead / Coordinator`**: A `StudentUser` assigned to a `Club` via `ClubMembership` with `role = CLUB_HEAD` or `role = COORDINATOR`. Manages event proposals, registrations, manual UPI payment verification, certificates, announcements, achievements, and showcases.
- **`AdminRole (admin)`**: Super administrators with global platform oversight. Creates and provisions clubs, assigns faculty coordinators, oversees global financial payments, manages campus venues and blackout periods, and monitors audit logs.
- **`AdminRole (facultyCoordinator)`**: Faculty in charge of specific clubs. Reviews, approves, or rejects event proposals (`reviewStatus`), manages club venues and blackout periods, and oversees student coordinators.
- **`ExternalUser`**: Non-NITJ participants registering for open inter-college hackathons, cultural festivals, or competitions.

### Role Capabilities & Target Views

| Role | Key Capabilities | Primary Target Views |
| :--- | :--- | :--- |
| **`admin`** | Platform oversight, create/delete clubs, assign coordinators & club heads, audit payments, configure venues/blackouts, export data. | `/admin`, `/export-center`, `/admin/featured-events` |
| **`facultyCoordinator`** | Review/Approve club event proposals, review club finances, schedule venue blackout slots. | `/admin` (Coordinator view), `/admin/pending-events` |
| **`CLUB_HEAD` / `COORDINATOR`** | Propose events, manage multi-club joint events, verify UPI transactions, scan tickets, issue certificates, publish announcements. | `/club-dashboard`, `/create-event`, `/scanner` |
| **`student` / `member`** | Browse events, join clubs, individual/team event registrations, waitlist queue, submit feedback, download certificates. | `/events`, `/my-events`, `/club/:slug`, `/profile` |
| **`external`** | Register for open inter-college events, submit payment proof, receive verified digital QR tickets, download certificates. | `/events`, `/my-events` |

---

## 2. Key Architecture Principles

1. **Junction Table for Events (`EventOrganizer`)**:
   - Events are decoupled from a single `clubId`. Instead, the `EventOrganizer` junction table links an `Event` to one or more `Club` records.
   - Enables seamless **joint/collaborative events** between two or more campus societies.
2. **Sponsors Exclusive to Events (`Sponsor`)**:
   - Sponsors are associated strictly with `Event` (`eventId`), allowing event organizers to showcase corporate partners and logos per event.
   - Removed legacy `clubId` and `sponsors` relation from `Club` to ensure clean entity boundaries.
3. **Dedicated Social Links Models**:
   - `StudentSocialLink` decouples social media handles from the main user table using a strict `SocialPlatform` enum.
   - `ClubSocialLink` manages public social channels for student societies.
4. **Venue Collision & Blackout Protection**:
   - `Venue`: Catalog of official campus halls and rooms with availability toggles.
   - `VenueBlackout`: Restricts event booking during scheduled institutional maintenance, examinations, or official ceremonies.
5. **Waitlisting with Automatic Seat Promotion**:
   - Events with `allowWaitlist = true` allow students to queue when `registeredCount >= totalSeats`.
   - When a registered participant cancels, the backend automatically promotes the earliest waitlisted candidate to `REGISTERED` status and notifies them.
6. **Cryptographic QR Tickets (Ed25519)**:
   - Each event admission ticket includes a digitally signed Ed25519 payload (`qrPayload`, `qrVersion`, `qrKeyId`) enabling offline signature verification by scanner operators.

---

## 3. Database Enums Reference

```prisma
enum AdminRoleType {
  admin
  facultyCoordinator
}

enum ClubMemberRole {
  CLUB_HEAD
  COORDINATOR
  MEMBER
}

enum ParticipationStatus {
  REGISTERED
  ATTENDED
  WAITLISTED
  CANCELLED
  INVITED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum ReviewStatus {
  DRAFT
  PENDING
  PUBLISHED
  REJECTED
  DELETION_REQUESTED
}

enum MediaType {
  IMAGE
  VIDEO
  SPONSOR_LOGO
}

enum AttendSimilar {
  YES
  MAYBE
  NO
}

enum FeaturedOrderingMode {
  CUSTOM
  AUTOMATIC
}

enum CertificateStatus {
  ISSUED
  REVOKED
}

enum SocialPlatform {
  GITHUB
  LINKEDIN
  X
  INSTAGRAM
  WHATSAPP
  PORTFOLIO
}
```

---

## 4. Complete Database Models Reference

### 4.1 Identity & User Accounts

#### `AdminRole`
Faculty coordinators and system super administrators.
```prisma
model AdminRole {
  id               String          @id @db.VarChar(24)
  name             String          @db.VarChar
  email            String          @unique @db.VarChar
  password         String          @db.VarChar
  role             AdminRoleType   @default(admin)
  profileImage     String?         @db.VarChar
  isTwoStepEnabled Boolean         @default(false)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  coordinatedClubs Club[]          @relation("ClubFacultyCoordinator")
  reviewedEvents   Event[]         @relation("EventReviewedBy")
  notifications    Notification[]  @relation("NotificationSenderAdmin")
}
```

#### `StudentUser`
Verified NITJ campus students (`@nitj.ac.in`).
```prisma
model StudentUser {
  id                     String              @id @db.VarChar(24)
  rollNo                 String              @unique @db.VarChar
  name                   String              @db.VarChar
  email                  String              @unique @db.VarChar
  password               String              @db.VarChar
  branch                 String              @db.VarChar
  program                String              @db.VarChar
  expectedGraduationYear Int
  profileImage           String?             @db.VarChar
  isVerified             Boolean             @default(false)
  isTwoStepEnabled       Boolean             @default(false)
  createdAt              DateTime            @default(now())
  updatedAt              DateTime            @updatedAt

  socialLinks            StudentSocialLink[]
  memberships            ClubMembership[]
  createdEvents          Event[]             @relation("EventCreatedBy")
  participations         Participation[]
  sentNotifications      Notification[]      @relation("NotificationSenderStudent")
  receivedNotifications  Notification[]      @relation("NotificationRecipientStudent")
  ledTeams               Team[]              @relation("TeamLeaderStudent")
  teamMemberships        TeamMember[]
  feedbacks              EventFeedback[]
  certificates           Certificate[]
}
```

#### `StudentSocialLink`
Decoupled social profiles for students with platform enforcement.
```prisma
model StudentSocialLink {
  id        String         @id @db.VarChar(24)
  studentId String         @db.VarChar(24)
  platform  SocialPlatform
  url       String         @db.VarChar

  student   StudentUser    @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([studentId, platform])
  @@index([studentId])
}
```

#### `ExternalUser`
Participants from other academic institutions for open hackathons/cultural events.
```prisma
model ExternalUser {
  id               String          @id @db.VarChar(24)
  name             String          @db.VarChar
  email            String          @unique @db.VarChar
  password         String          @db.VarChar
  collegeName      String          @db.VarChar
  phone            String?         @db.VarChar
  program          String?         @db.VarChar
  graduationYear   Int?
  profileImage     String?         @db.VarChar
  portfolioUrl     String?         @db.VarChar
  isVerified       Boolean         @default(false)
  isTwoStepEnabled Boolean         @default(false)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  participations   Participation[]
  certificates     Certificate[]

  @@index([email])
}
```

---

### 4.2 Club Domain

#### `Club`
Official student societies, departmental forums, and sports clubs.
```prisma
model Club {
  id                   String             @id @db.VarChar(24)
  clubName             String             @unique @db.VarChar
  slug                 String             @unique @db.VarChar
  description          String?            @db.VarChar
  category             String?            @db.VarChar
  clubLogo             String?            @db.VarChar
  bannerImage          String?            @db.VarChar
  facultyCoordinatorId String?            @db.VarChar(24)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  clubEmail            String?            @db.VarChar
  facultyEmail         String?            @db.VarChar
  facultyName          String?            @db.VarChar
  studentcoordinators  String[]           @default([]) @db.VarChar
  motto                String?            @db.VarChar
  mission              String?            @db.VarChar
  establishedYear      String?            @db.VarChar

  facultyCoordinator   AdminRole?         @relation("ClubFacultyCoordinator", fields: [facultyCoordinatorId], references: [id])
  socialLinks          ClubSocialLink[]
  memberships          ClubMembership[]
  organizedEvents      EventOrganizer[]
  media                Media[]
  announcements        ClubAnnouncement[]
  achievements         ClubAchievement[]
  notifications        Notification[]
}
```

#### `ClubSocialLink`
Public social handles for clubs (Instagram, LinkedIn, X, etc.).
```prisma
model ClubSocialLink {
  id       String @id @db.VarChar(24)
  clubId   String @db.VarChar(24)
  platform String @db.VarChar
  url      String @db.VarChar

  club     Club   @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@index([clubId])
}
```

#### `ClubMembership`
Links students to clubs with designated roles and permissions.
```prisma
model ClubMembership {
  id                String         @id @db.VarChar(24)
  studentId         String         @db.VarChar(24)
  clubId            String         @db.VarChar(24)
  role              ClubMemberRole @default(MEMBER)
  customPermissions String[]       @default([]) @db.VarChar
  canEditEvents     Boolean        @default(false)
  canTakeAttendance Boolean        @default(true)
  createdAt         DateTime       @default(now())

  student           StudentUser    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  club              Club           @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([clubId, studentId])
  @@index([studentId])
  @@index([clubId, role])
}
```

#### `ClubAnnouncement` & `ClubAchievement`
```prisma
model ClubAnnouncement {
  id          String   @id @db.VarChar(24)
  clubId      String   @db.VarChar(24)
  title       String   @db.VarChar
  content     String   @db.VarChar
  isPinned    Boolean  @default(false)
  isPublished Boolean  @default(true)
  authorName  String?  @db.VarChar
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@index([clubId, isPublished])
  @@index([clubId, isPinned])
}

model ClubAchievement {
  id          String   @id @db.VarChar(24)
  clubId      String   @db.VarChar(24)
  title       String   @db.VarChar
  description String?  @db.VarChar
  date        String?  @db.VarChar
  imageUrl    String?  @db.VarChar
  externalUrl String?  @db.VarChar
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@index([clubId, createdAt])
}
```

---

### 4.3 Event Domain & Collaborations

#### `Event`
Core entity representing campus events, competitions, workshops, and fests.
```prisma
model Event {
  id                      String             @id @db.VarChar(24)
  title                   String             @db.VarChar
  slug                    String             @unique @db.VarChar
  description             String             @db.VarChar
  venue                   String             @db.VarChar
  startTime               DateTime
  endTime                 DateTime
  totalSeats              Int                @default(0) // 0 = Unlimited
  allowedPrograms         String[]           @default(["BTECH", "MTECH", "OTHER"]) @db.VarChar
  allowedYears            String[]           @default([]) @db.VarChar
  allowedBranches         String[]           @default([]) @db.VarChar
  imageUrl                String?            @db.VarChar
  registeredCount         Int                @default(0)
  views                   Int                @default(0)
  waitingListIds          String[]           @default([]) @db.VarChar
  requiredFields          String[]           @default([]) @db.VarChar
  customFields            Json?              // Dynamic registration question schema
  createdById             String?            @db.VarChar(24)
  registrationDeadline    DateTime?
  reviewStatus            ReviewStatus       @default(PENDING)
  reviewComment           String?            @db.VarChar
  reviewedById            String?            @db.VarChar(24)
  winners                 Json?              // Event podium & position holders
  showWinner              Boolean            @default(false)
  provideCertificate      Boolean            @default(false)
  certificateTemplate     Json?              // Layout coordinates & styling
  registrationFee         Float              @default(0) // 0 = Free
  paymentInstructions     String?            @db.VarChar
  collegePaymentUrl       String?            @db.VarChar
  accountHolderName       String?            @db.VarChar
  postRegistrationMessage String?            @db.VarChar
  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt
  isFeatured              Boolean            @default(false)
  allowExternal           Boolean            @default(true)
  allowWaitlist           Boolean            @default(true)
  feedbackEnabled         Boolean            @default(true)
  registrationType        String             @default("individual") @db.VarChar // "individual" | "team"
  minTeamSize             Int                @default(1)
  maxTeamSize             Int                @default(1)

  createdBy               StudentUser?       @relation("EventCreatedBy", fields: [createdById], references: [id])
  reviewedBy              AdminRole?         @relation("EventReviewedBy", fields: [reviewedById], references: [id])

  organizers              EventOrganizer[]   // Links to clubs (co-hosting)
  participations          Participation[]
  attendanceRecords       AttendanceRecord[]
  sponsors                Sponsor[]          // Event-specific sponsors
  media                   Media[]
  teams                   Team[]
  feedbacks               EventFeedback[]
  featuredEvent           FeaturedEvent?
  certificates            Certificate[]

  @@index([reviewStatus, startTime])
  @@index([createdById, startTime])
}
```

#### `EventOrganizer`
Junction model linking an event to one or more clubs. Supports multi-club co-hosted events.
```prisma
model EventOrganizer {
  id      String @id @db.VarChar(24)
  eventId String @db.VarChar(24)
  clubId  String @db.VarChar(24)

  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  club    Club   @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([eventId, clubId])
  @@index([eventId])
  @@index([clubId])
}
```

#### `Sponsor`
Event-specific sponsor logos, names, and websites.
```prisma
model Sponsor {
  id         String  @id @db.VarChar(24)
  name       String  @db.VarChar
  logoUrl    String  @db.VarChar
  websiteUrl String? @db.VarChar
  eventId    String? @db.VarChar(24)

  event      Event?  @relation(fields: [eventId], references: [id])

  @@index([eventId])
}
```

---

### 4.4 Registrations, Teams & Cryptographic Attendance

#### `Participation`
Unified registration record and admission ticket for an event.
```prisma
model Participation {
  id                   String              @id @db.VarChar(24)
  eventId              String              @db.VarChar(24)
  userId               String              @db.VarChar(24)
  studentId            String?             @db.VarChar(24)
  externalUserId       String?             @db.VarChar(24)
  status               ParticipationStatus @default(REGISTERED)
  qrCode               String?             @unique @db.VarChar
  qrVersion            Int?                // 1 = Ed25519 signed
  qrPayload            String?             @db.VarChar // Base64URL signed token
  qrKeyId              String?             @db.VarChar // Key rotation identifier
  attendedAt           DateTime?
  markedByMemberId     String?             @db.VarChar(24)
  paymentStatus        PaymentStatus       @default(SUCCESS)
  paymentTimestamp     DateTime?
  transactionId        String?             @db.VarChar // UTR Number for manual UPI
  payerName            String?             @db.VarChar
  paymentRemarks       String?             @db.VarChar
  paymentReviewedBy    String?             @db.VarChar
  paymentReviewedAt    DateTime?
  paymentReviewMessage String?             @db.VarChar
  formResponses        Json?               // Student answers to custom questions
  createdAt            DateTime            @default(now())
  teamId               String?             @db.VarChar(24)

  event                Event               @relation(fields: [eventId], references: [id], onDelete: Cascade)
  student              StudentUser?        @relation(fields: [studentId], references: [id])
  externalUser         ExternalUser?       @relation(fields: [externalUserId], references: [id], onDelete: Cascade)
  team                 Team?               @relation(fields: [teamId], references: [id])
  attendanceRecords    AttendanceRecord[]
  certificate          Certificate?

  @@index([eventId])
  @@index([userId, createdAt])
  @@index([userId, eventId])
  @@index([studentId, eventId])
  @@index([externalUserId])
  @@index([eventId, paymentStatus])
  @@index([eventId, status])
}
```

#### `AttendanceRecord`
Idempotent scan log created when an attendee is checked in.
```prisma
model AttendanceRecord {
  id                String        @id @db.VarChar(24)
  eventId           String        @db.VarChar(24)
  participationId   String        @db.VarChar(24)
  scannedAt         DateTime
  verificationMode  String        @db.VarChar // "ONLINE" | "OFFLINE"
  syncedAt          DateTime?
  localAttendanceId String        @unique @db.VarChar // UUID from client for sync idempotency
  createdAt         DateTime      @default(now())

  event             Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  participation     Participation @relation(fields: [participationId], references: [id], onDelete: Cascade)

  @@unique([eventId, participationId])
  @@index([eventId, scannedAt])
}
```

#### `Team` & `TeamMember`
Team formation for hackathons and group competitions.
```prisma
model Team {
  id              String          @id @db.VarChar(24)
  eventId         String          @db.VarChar(24)
  teamName        String          @db.VarChar
  leaderId        String          @db.VarChar(24)
  leaderStudentId String          @db.VarChar(24)
  status          String          @default("active") @db.VarChar
  createdAt       DateTime        @default(now())

  event           Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  leaderStudent   StudentUser     @relation("TeamLeaderStudent", fields: [leaderStudentId], references: [id])
  members         TeamMember[]
  participations  Participation[]

  @@index([eventId])
  @@index([leaderId])
  @@index([leaderStudentId])
}

model TeamMember {
  id        String      @id @db.VarChar(24)
  teamId    String      @db.VarChar(24)
  userId    String      @db.VarChar(24)
  studentId String      @db.VarChar(24)
  role      String      @default("member") @db.VarChar // "leader" | "member"
  joinedAt  DateTime    @default(now())

  team      Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  student   StudentUser @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([userId])
  @@index([studentId])
}
```

---

### 4.5 Venues & Conflict Prevention

#### `Venue` & `VenueBlackout`
Official rooms and auditorium booking system with conflict detection.
```prisma
model Venue {
  id        String   @id @db.VarChar(24)
  name      String   @unique @db.VarChar // e.g. "Main Auditorium"
  isOpen    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VenueBlackout {
  id          String   @id @db.VarChar(24)
  venue       String   @db.VarChar
  title       String   @db.VarChar
  reason      String?  @db.VarChar
  startTime   DateTime
  endTime     DateTime
  createdById String?  @db.VarChar(24)
  createdAt   DateTime @default(now())

  @@index([venue, startTime])
  @@index([startTime, endTime])
}
```

---

### 4.6 Feedback & Certificates

#### `EventFeedback`
Post-event attendee ratings across 6 quality dimensions.
```prisma
model EventFeedback {
  id                 String        @id @db.VarChar(24)
  eventId            String        @db.VarChar(24)
  userId             String        @db.VarChar(24)
  overallRating      Int           // 1 to 5
  organizationRating Int           // 1 to 5
  usefulnessRating   Int           // 1 to 5
  speakerRating      Int           // 1 to 5
  venueRating        Int           // 1 to 5
  timingRating       Int           // 1 to 5
  attendSimilar      AttendSimilar // "YES" | "MAYBE" | "NO"
  liked              String?       @db.VarChar
  improvements       String?       @db.VarChar
  comments           String?       @db.VarChar
  submittedAt        DateTime      @default(now())
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  event              Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user               StudentUser   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId, submittedAt])
  @@index([userId, submittedAt])
}
```

#### `Certificate`
Cryptographically verifiable digital achievement certificates issued to participants.
```prisma
model Certificate {
  id                String            @id @db.VarChar(24)
  eventId           String            @db.VarChar(24)
  participationId   String            @unique @db.VarChar(24)
  userId            String            @db.VarChar(24)
  studentId         String?           @db.VarChar(24)
  externalUserId    String?           @db.VarChar(24)
  recipientName     String            @db.VarChar
  recipientRollNo   String?           @db.VarChar
  recipientEmail    String            @db.VarChar
  awardPosition     String            @default("Participant") @db.VarChar
  certificateNumber String            @unique @db.VarChar
  verificationToken String            @unique @db.VarChar
  status            CertificateStatus @default(ISSUED)
  issuedAt          DateTime          @default(now())
  revokedAt         DateTime?
  revocationReason  String?           @db.VarChar
  metadata          Json              // Coordinates, styling & tags

  event             Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  participation     Participation     @relation(fields: [participationId], references: [id], onDelete: Cascade)
  student           StudentUser?      @relation(fields: [studentId], references: [id], onDelete: SetNull)
  externalUser      ExternalUser?     @relation(fields: [externalUserId], references: [id], onDelete: SetNull)

  @@index([verificationToken])
  @@index([eventId, status])
  @@index([userId])
  @@index([studentId])
  @@index([externalUserId])
}
```

---

### 4.7 Spotlight, Notifications & Media

#### `FeaturedEvent` & `FeaturedEventSetting`
Homepage spotlight carousel items with display ordering and sponsor attribution.
```prisma
model FeaturedEvent {
  id           String   @id @db.VarChar(24)
  eventId      String   @unique @db.VarChar(24)
  sponsorName  String?  @db.VarChar
  sponsorLogo  String?  @db.VarChar
  isActive     Boolean  @default(true)
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([isActive, displayOrder])
  @@index([eventId])
}

model FeaturedEventSetting {
  id           String               @id @default("default") @db.VarChar(24)
  orderingMode FeaturedOrderingMode @default(CUSTOM)
  updatedAt    DateTime             @updatedAt
}
```

#### `Notification`
Targeted and campus-wide notifications with read receipts.
```prisma
model Notification {
  id                 String       @id @db.VarChar(24)
  senderStudentId    String?      @db.VarChar(24)
  senderAdminId      String?      @db.VarChar(24)
  recipientStudentId String?      @db.VarChar(24) // Null for broadcasts
  clubId             String?      @db.VarChar(24)
  eventId            String?      @db.VarChar(24)
  teamId             String?      @db.VarChar(24)
  type               String?      @db.VarChar // "EVENT_INVITE", "PAYMENT_UPDATE", "BROADCAST", etc.
  title              String       @db.VarChar
  message            String       @db.VarChar
  createdAt          DateTime     @default(now())
  readBy             String[]     @default([]) @db.VarChar

  senderStudent      StudentUser? @relation("NotificationSenderStudent", fields: [senderStudentId], references: [id])
  senderAdmin        AdminRole?   @relation("NotificationSenderAdmin", fields: [senderAdminId], references: [id])
  recipientStudent   StudentUser? @relation("NotificationRecipientStudent", fields: [recipientStudentId], references: [id])
  club               Club?        @relation(fields: [clubId], references: [id])

  @@index([createdAt])
  @@index([recipientStudentId, createdAt])
  @@index([clubId, createdAt])
  @@index([eventId, createdAt])
  @@index([teamId, createdAt])
}
```

#### `Media`
Cloudinary gallery uploads for clubs and events.
```prisma
model Media {
  id         String    @id @db.VarChar(24)
  url        String    @db.VarChar
  type       MediaType @default(IMAGE)
  caption    String?   @db.VarChar
  albumTitle String?   @default("General") @db.VarChar
  clubId     String?   @db.VarChar(24)
  eventId    String?   @db.VarChar(24)

  club       Club?     @relation(fields: [clubId], references: [id])
  event      Event?    @relation(fields: [eventId], references: [id])

  @@index([clubId])
  @@index([eventId])
}
```

---

### 4.8 Governance & Auditing

#### `Permission` & `RolePermission`
Fine-grained permission primitives for platform operations.
```prisma
model Permission {
  id          String           @id @db.VarChar
  name        String           @unique @db.VarChar
  description String?          @db.VarChar
  resource    String           @db.VarChar
  action      String           @db.VarChar
  createdAt   DateTime         @default(now())
  roles       RolePermission[]
}

model RolePermission {
  id           String     @id @db.VarChar
  role         String     @db.VarChar
  permissionId String     @db.VarChar

  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId])
  @@index([role])
}
```

#### `AuditLog` & `ExportLog`
```prisma
model AuditLog {
  id         String   @id @db.VarChar(24)
  action     String   @db.VarChar // "EVENT_APPROVED", "PAYMENT_VERIFIED", etc.
  actorType  String?  @db.VarChar
  actorId    String   @db.VarChar(24)
  actorEmail String   @db.VarChar
  targetId   String?  @db.VarChar(24)
  clubId     String?  @db.VarChar(24)
  eventId    String?  @db.VarChar(24)
  metadata   Json?
  source     String?  @db.VarChar
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([clubId, createdAt])
  @@index([eventId, createdAt])
  @@index([action, createdAt])
}

model ExportLog {
  id          String   @id @db.VarChar(24)
  dataset     String   @db.VarChar
  recordCount Int      @default(0)
  actorId     String   @db.VarChar(24)
  actorEmail  String   @db.VarChar
  actorRole   String   @db.VarChar
  filters     Json?
  columns     String[] @default([]) @db.VarChar
  createdAt   DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([dataset, createdAt])
}
```

---

## 5. Entity Lifecycles & State Transitions

### 5.1 Event Review Lifecycle
```
[DRAFT] -> Club Head edits proposal
    │
    ▼ (POST /api/events/:id/submit)
[PENDING] -> Faculty Coordinator reviews in Admin portal
    ├── Approved -> [PUBLISHED] (Visible on calendar and feeds)
    ├── Rejected -> [REJECTED] (With reviewComment; club lead modifies and resubmits)
    └── Deletion Requested -> [DELETION_REQUESTED] (Club lead requests removal)
```

### 5.2 Participation & Admission Ticket Lifecycle
```
User registers (POST /api/events/:id/register)
    ├── Free Event & Seats Available -> [REGISTERED] (paymentStatus: SUCCESS) -> Generates signed Ed25519 QR
    ├── Free Event & Seats Full (allowWaitlist=true) -> [WAITLISTED]
    │      └── When registered participant cancels -> Auto-promoted to [REGISTERED]
    └── Paid Event (Manual UPI) -> [REGISTERED] (paymentStatus: PENDING)
           ├── Coordinator verifies -> paymentStatus: SUCCESS
           └── Coordinator flags -> paymentStatus: FAILED (User updates UTR proof)

At Venue Entry:
    Scanner Operator scans QR -> AttendanceRecord created -> Participation status: [ATTENDED]
```

---

## 6. Technical Design Conventions

1. **Identifiers**: All entity IDs are 24-character hexadecimal strings generated via `createObjectId()` for full compatibility with modern web and mobile apps.
2. **Timestamps**: All dates are stored as UTC (`TIMESTAMP(3)`) and formatted client-side using `Intl.DateTimeFormat`.
3. **Data Integrity**: Foreign keys enforce relational cascades (`onDelete: Cascade` for memberships, organizers, participations, teams; `onDelete: SetNull` for non-critical references).
