# CampusNode REST API Specification 📡

Comprehensive, authoritative documentation of all backend REST API routes in the CampusNode platform.

**Base URLs:**
- Local Development: `http://localhost:5001/api`
- Staging / Production: `https://<domain>/api`

**Authentication & Sessions:**
- Client authentication is supported via HTTP-Only JWT cookies or `Authorization: Bearer <token>` header.
- Token claims include `userId`, `email`, `role`, and optional `clubId` for scoped operations.
- Fine-grained permissions are enforced via RBAC middleware (`requirePermission`, `allowRoles`).

---

## Table of Contents

1. [Authentication (`/api/auth`)](#1-authentication-apiauth)
2. [User Profiles & Social Links (`/api/users`)](#2-user-profiles--social-links-apiusers)
3. [Events Management & Joint Collaborations (`/api/events`)](#3-events-management--joint-collaborations-apievents)
4. [Clubs & Showcases (`/api/clubs`)](#4-clubs--showcases-apiclubs)
5. [Club Memberships & Leadership (`/api/club-members`)](#5-club-memberships--leadership-apiclub-members)
6. [Team Registrations & Invitations (`/api/teams`)](#6-team-registrations--invitations-apiteams)
7. [Payments & Financial Verification (`/api/payment`)](#7-payments--financial-verification-apipayment)
8. [Campus Venues (`/api/venues`)](#8-campus-venues-apivenues)
9. [Venue Blackouts (`/api/venues/blackouts`)](#9-venue-blackouts-apivenuesblackouts)
10. [Featured Events Spotlight (`/api/featured-events`)](#10-featured-events-spotlight-apifeatured-events)
11. [Event Feedback & Survey Analytics (`/api/feedback`)](#11-event-feedback--survey-analytics-apifeedback)
12. [Certificates Engine (`/api/certificates`)](#12-certificates-engine-apicertificates)
13. [Participation & Universal Ticket Check-in (`/api/participation`)](#13-participation--universal-ticket-check-in-apiparticipation)
14. [High-Throughput QR Scanner & Offline Sync (`/api/scanner`)](#14-high-throughput-qr-scanner--offline-sync-apiscanner)
15. [In-App Notifications (`/api/notifications`)](#15-in-app-notifications-apinotifications)
16. [Web Push Notifications (`/api/push`)](#16-web-push-notifications-apipush)
17. [Export Center (`/api/export-center`)](#17-export-center-apiexport-center)
18. [Administration (`/api/admin`)](#18-administration-apiadmin)
19. [System Health & Cryptographic Keys](#19-system-health--cryptographic-keys)

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register/student` | Register a new NITJ student account (`@nitj.ac.in`) | No |
| `POST` | `/register/external` | Register an external (inter-college) participant | No |
| `POST` | `/login` or `/login/student` | Authenticate student user | No |
| `POST` | `/login/admin` | Authenticate administrator or faculty coordinator | No |
| `POST` | `/login/external` | Authenticate external participant | No |
| `POST` | `/verify-2fa` | Verify 6-digit TOTP / 2FA code during login | No |
| `GET` | `/verify-email/:token` | Verify email address via verification link token | No |
| `POST` | `/send-verification-email` | Resend verification email to unverified student | No |
| `POST` | `/forgot-password` | Request password reset token sent via email | No |
| `POST` | `/reset-password/:token` | Set new password using reset token | No |
| `POST` | `/change-password` | Change password for currently authenticated user | Yes |
| `POST` | `/logout` | Clear authentication cookies and session state | Yes |

---

## 2. User Profiles & Social Links (`/api/users`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/me` | Get current user profile, memberships, and permissions | Authenticated |
| `GET` | `/social-links` | List social links for current user (`StudentSocialLink`) | Authenticated |
| `POST` | `/social-links` | Add or update a social link (`platform`, `url`) | Authenticated |
| `DELETE` | `/social-links/:idOrPlatform` | Delete social link by ID or platform enum | Authenticated |
| `PUT` | `/:role/:id` | Update profile information (roll, branch, program, etc.) | Self or Admin |
| `GET` | `/search` | Search verified students by name, email, or roll number | Authenticated |
| `GET` | `/lookup/:rollNo` | Look up student public details by roll number | Authenticated |
| `POST` | `/profile-photo` | Upload user profile avatar to Cloudinary | Authenticated |
| `DELETE` | `/profile-photo` | Remove custom avatar and revert to default | Authenticated |

---

## 3. Events Management & Joint Collaborations (`/api/events`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List published events with search, date, tag, and pagination filters | Public |
| `GET` | `/:id` | Get single event details by ID or unique slug (includes organizers & sponsors) | Public |
| `GET` | `/:id/preview` | Preview unapproved event draft | Creator / Lead / Admin |
| `GET` | `/calendar` | Fetch approved upcoming events for calendar view | `EVENT_VIEW` |
| `GET` | `/conflicts` | Check venue and time slot booking collisions | `EVENT_VIEW` |
| `GET` | `/club/:clubId` | Get published events organized or co-hosted by a club | Public |
| `GET` | `/club-co/:id` | Get events created by a specific coordinator | Creator or Admin |
| `GET` | `/club-manage/:clubId` | Get all events (drafts, pending, published) for club dashboard | Club Lead / Coordinator |
| `GET` | `/club-manage/:clubId/export` | Export event summary and registration data for a club | Club Lead / Coordinator |
| `GET` | `/user/:userId` | List event registrations for a student | Self or Admin |
| `POST` | `/` | Propose new event (accepts `clubIds` for multi-club co-hosting, `sponsors`, `allowWaitlist`) | `EVENT_CREATE` |
| `PUT` | `/:id` | Update event details (updates `clubIds`, `sponsors`, `allowWaitlist`, fees) | `EVENT_UPDATE` |
| `PUT` | `/:id/reschedule` | Reschedule event timing or change venue | `EVENT_UPDATE` |
| `PUT` | `/:id/review` | Approve (`PUBLISHED`) or Reject (`REJECTED`) event proposal | `EVENT_APPROVE` (Admin/Faculty) |
| `POST` | `/:id/submit` | Submit draft event proposal for faculty review | Club Lead / Coordinator |
| `POST` | `/upload` | Upload event poster banner image to Cloudinary | `EVENT_CREATE` |
| `DELETE` | `/:id` | Delete event or request event deletion | `EVENT_DELETE` |
| `POST` | `/:id/register` | Register for event (Free or Manual UPI; falls back to waitlist if full) | `REGISTRATION_CREATE` |
| `DELETE` | `/:id/register` | Cancel registration / deregister (triggers automatic waitlist seat promotion) | `REGISTRATION_CANCEL` |
| `GET` | `/:id/registrations` | List registered attendees with payment and attendance status | Club Lead / Admin |
| `POST` | `/:id/check-in` | Mark attendee attendance via scanned QR ticket | `EVENT_ATTENDANCE` |
| `POST` | `/:id/attendance-manual` | Manually mark attendee attendance by participation ID | `EVENT_ATTENDANCE` |
| `PATCH` | `/:id/feature` | Toggle featured event spotlight status | Club Lead / Event Manager |

---

## 4. Clubs & Showcases (`/api/clubs`)

> **Note**: Sponsors belong strictly to **Events** (`Event.sponsors`), not to Clubs.

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all registered campus clubs | Public |
| `GET` | `/leaderboard` | Club activity and engagement leaderboard | Public |
| `GET` | `/:id` | Get complete club profile (includes `clubEmail`, faculty contact, announcements, achievements, gallery, events) | Public |
| `PUT` | `/:id` | Update club profile (`clubEmail`, description, motto, mission, socialLinks) | `CLUB_UPDATE` |
| `POST` | `/:id/banner` | Upload club banner cover image | `CLUB_UPDATE` |
| `DELETE` | `/:id/banner` | Remove club banner image | `CLUB_UPDATE` |
| `POST` | `/:id/logo` | Upload club circular logo avatar | `CLUB_UPDATE` |
| `DELETE` | `/:id/logo` | Remove club logo avatar | `CLUB_UPDATE` |
| `POST` | `/:id/upload-image` | Upload generic club image asset | `CLUB_UPDATE` |
| `POST` | `/:id/announcements` | Publish a new club announcement | `CLUB_UPDATE` |
| `PUT` | `/:id/announcements/:announcementId` | Edit existing announcement | `CLUB_UPDATE` |
| `PATCH` | `/:id/announcements/:announcementId/pin` | Pin or unpin announcement to top of club page | `CLUB_UPDATE` |
| `DELETE` | `/:id/announcements/:announcementId` | Delete club announcement | `CLUB_UPDATE` |
| `POST` | `/:id/achievements` | Add club award or major milestone | `CLUB_UPDATE` |
| `PUT` | `/:id/achievements/:achievementId` | Edit club achievement entry | `CLUB_UPDATE` |
| `DELETE` | `/:id/achievements/:achievementId` | Remove club achievement | `CLUB_UPDATE` |
| `POST` | `/:id/gallery` | Upload showcase photo to club gallery | `CLUB_UPDATE` |
| `DELETE` | `/:id/gallery/:mediaId` | Delete photo from club gallery | `CLUB_UPDATE` |

---

## 5. Club Memberships & Leadership (`/api/club-members`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/:clubId/members` | Get roster of club leads, coordinators, and active members | Public |
| `GET` | `/:clubId/search-students` | Search eligible NITJ students to invite into club team | `CLUB_INVITE_MEMBERS` |
| `POST` | `/:clubId/members` | Add student to club roster with assigned role (`MEMBER` / `COORDINATOR`) | `CLUB_INVITE_MEMBERS` |
| `POST` | `/:clubId/transfer-student-lead` | Transfer Club Head (`CLUB_HEAD`) authority to another student | `CLUB_TRANSFER_LEADERSHIP` |
| `PUT` | `/members/:membershipId` | Update member role, permissions, and attendance scanner access | `CLUB_ASSIGN_ROLES` |
| `DELETE` | `/members/:membershipId` | Remove member from club roster | `CLUB_REMOVE_MEMBERS` |

---

## 6. Team Registrations & Invitations (`/api/teams`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create team and register leader for team event | Authenticated Student |
| `POST` | `/:id/invite` | Leader invites student to join team | Team Leader |
| `POST` | `/invitations/:id/respond` | Invitee accepts (`accept`) or declines (`decline`) team invitation | Authenticated Invitee |
| `GET` | `/event/:eventId/lookup-leader` | Search existing teams by leader name, roll number, or team name | Authenticated |
| `GET` | `/:id` | Get complete team roster, members, and ticket status | Authenticated |

---

## 7. Payments & Financial Verification (`/api/payment`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `PUT` | `/:participationId/review` | Verify manual UPI payment (`status: "SUCCESS"` or `"FAILED"`) | `PAYMENT_VERIFY` (Club/Admin) |
| `GET` | `/event/:eventId/registrations` | View paid event registrations with transaction/UTR details | `PAYMENT_VIEW` |
| `GET` | `/event/:eventId/stats` | View event revenue, ticket counts, and collection metrics | Club Lead / Admin |
| `PUT` | `/:participationId/update-details` | Participant updates or re-submits UTR / payment proof | Ticket Owner |

---

## 8. Campus Venues (`/api/venues`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all campus venues (`?openOnly=true`) | Public |
| `POST` | `/` | Create new campus venue | Admin |
| `PUT` | `/:id` | Update venue name | Admin |
| `PATCH` | `/:id/toggle-status` | Toggle venue open/closed operational availability | Admin |
| `DELETE` | `/:id` | Delete campus venue | Admin |

---

## 9. Venue Blackouts (`/api/venues/blackouts`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Query scheduled blackout periods (`?start=&end=&venue=`) | Public |
| `POST` | `/` | Schedule venue blackout / maintenance slot | Admin / Faculty Coordinator |
| `PUT` | `/:id` | Update blackout timing or reason | Admin / Faculty Coordinator |
| `DELETE` | `/:id` | Delete venue blackout period | Admin / Faculty Coordinator |

---

## 10. Featured Events Spotlight (`/api/featured-events`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Fetch public featured events (top 3, or all with `?all=true`) | Public |
| `GET` | `/active` | Fetch active featured events for homepage carousel | Public |
| `GET` | `/manage` | Admin console view of all featured events | `FEATURED_EVENTS_MANAGE` |
| `GET` | `/candidates` | Search published upcoming events eligible for featured spotlight | `FEATURED_EVENTS_MANAGE` |
| `POST` | `/` | Add an event to featured spotlight (`eventId`, `sponsorName`, `sponsorLogo`) | `FEATURED_EVENTS_MANAGE` |
| `PATCH` | `/reorder` | Update display order sequence of featured events (`orderedIds: string[]`) | `FEATURED_EVENTS_MANAGE` |
| `PATCH` | `/settings` | Set featured ordering mode (`"CUSTOM"` or `"RANDOM"`) | `FEATURED_EVENTS_MANAGE` |
| `PATCH` | `/:id` | Update featured event (`isActive`, `sponsorName`, `sponsorLogo`, `displayOrder`) | `FEATURED_EVENTS_MANAGE` |
| `DELETE` | `/:id` | Remove event from featured spotlight | `FEATURED_EVENTS_MANAGE` |
| `POST` | `/upload-sponsor` | Upload sponsor logo image for featured card | `FEATURED_EVENTS_MANAGE` |

---

## 11. Event Feedback & Survey Analytics (`/api/feedback`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/pending` | List attended events awaiting student feedback | Authenticated Attendee |
| `GET` | `/my-feedback` | List feedback previously submitted by the user | Authenticated Attendee |
| `POST` | `/:eventId` | Submit 6-dimension ratings, survey feedback, and comments | Attended Participant |
| `GET` | `/:eventId/analytics` | View aggregated rating averages and distribution statistics | Club Lead / Admin |

---

## 12. Certificates Engine (`/api/certificates`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/verify/:token` | Public verification of certificate authenticity by unique token | Public (Rate-Limited) |
| `POST` | `/:eventId/template` | Save certificate design template coordinates and styling | `EVENT_CERTIFICATE` |
| `POST` | `/upload-template` | Upload background template image to Cloudinary | `EVENT_CERTIFICATE` |
| `GET` | `/:eventId/download` | Generate and download personalized PDF certificate | Attended Student |
| `PATCH` | `/:id/revoke` | Revoke issued certificate with revocation reason | `EVENT_CERTIFICATE` |
| `GET` | `/:eventId/issued` | List all issued certificates for an event | `EVENT_CERTIFICATE` |

---

## 13. Participation & Universal Ticket Check-in (`/api/participation`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/verify/:qrCode` | Verify attendee ticket directly by QR code payload | `EVENT_ATTENDANCE` |
| `POST` | `/verify` | Universal ticket verification endpoint (supports signed Ed25519 payload) | `EVENT_ATTENDANCE` |
| `GET` | `/event/:eventId/search-participants` | Search event attendees by name, email, roll number, or ticket ID | `EVENT_ATTENDANCE` |

---

## 14. High-Throughput QR Scanner & Offline Sync (`/api/scanner`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Dedicated scanner terminal login for operators | Operator Credentials |
| `GET` | `/events` | List events assigned to operator for check-in | Authenticated Operator |
| `GET` | `/events/:eventId/offline-package` | Download offline ticket package & public signing keys | Operator / Staff |
| `POST` | `/sessions` | Start an `ONLINE` or `OFFLINE` scanner session | Operator / Staff |
| `POST` | `/sessions/:sessionId/end` | Close active scanner session | Session Owner / Admin |
| `POST` | `/attendance/check-in` | Real-time online QR admission check-in | Operator / Staff |
| `POST` | `/attendance/sync` | Batch sync offline attendance scans with conflict resolution | Operator / Staff |
| `GET` | `/events/:eventId/sync-state` | Fetch current sync delta state & check-in counts | Operator / Staff |
| `GET` | `/events/:eventId/search-participants` | Live attendee search on scanner terminal | Operator / Staff |
| `GET` | `/keys/public` or `/keys` | Public Ed25519 keys for offline cryptographic validation | Public |

---

## 15. In-App Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Send targeted notification (supports `recipientStudentId`, `clubId`, `eventId`, or broadcast) | `NOTIFICATION_CREATE` |
| `GET` | `/` | Get notifications inbox for current user (paginated) | Authenticated |
| `GET` | `/sent` | View notifications sent by current club or authority | `NOTIFICATION_VIEW` |
| `PUT` | `/read-all` | Mark all notifications in inbox as read | Authenticated |
| `PUT` | `/:id/read` | Mark specific notification as read | Authenticated |

---

## 16. Web Push Notifications (`/api/push`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/vapid-public-key` | Retrieve public VAPID key for browser push registration | Public |
| `POST` | `/subscribe` | Register browser Web Push subscription (`endpoint`, `keys`) | Authenticated |
| `POST` | `/unsubscribe` | Unregister browser Web Push subscription | Authenticated |

---

## 17. Export Center (`/api/export-center`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/events-list` | Get list of events available for export filters | Authenticated |
| `GET` | `/datasets` | Get list of exportable datasets authorized for current role | Authenticated |
| `GET` | `/preview` | Paginated preview of dataset records with selected columns | Authenticated |
| `POST` | `/export` | Stream dataset records as downloadable CSV file with audit logging | Authenticated |
| `GET` | `/history` | View data export audit trail and previous export logs | `AUDIT_VIEW` |

---

## 18. Administration (`/api/admin`)

| Method | Endpoint | Description | Auth / Permissions |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Dedicated admin & faculty portal login | Public |
| `GET` | `/dashboard-stats` | Global campus metrics: events, registrations, revenue, clubs | `AUDIT_VIEW` (Admin) |
| `GET` | `/user-info/:id` | View full user details | `USER_VIEW` |
| `GET` | `/clubs-list` | List all clubs with assigned faculty coordinator info | `CLUB_VIEW` |
| `POST` | `/clubs` | Provision new club with faculty coordinator and initial lead | `CLUB_CREATE` |
| `PUT` | `/clubs/:id` | Update club profile, slug, or faculty coordinator assignment | `CLUB_UPDATE` |
| `DELETE` | `/clubs/:id` | Delete club and associated records | `CLUB_DELETE` |
| `GET` | `/clubs/:id/club-head` | Get student currently assigned as Club Head | Admin |
| `POST` | `/clubs/:id/club-head` | Assign student as official Club Head (`CLUB_HEAD` role) | Admin |
| `DELETE` | `/clubs/:id/club-head` | Demote/remove student from Club Head assignment | Admin |
| `GET` | `/coordinators` | List all faculty coordinators | `USER_VIEW` |
| `POST` | `/coordinators` | Create new faculty coordinator account | `USER_ASSIGN_ROLE` |
| `PUT` | `/coordinators/:id` | Update faculty coordinator credentials or details | `USER_ASSIGN_ROLE` |
| `GET` | `/manual-payments` | Global oversight of pending UPI payments across campus | `PAYMENT_VERIFY` |
| `GET` | `/event-data-export` | Raw campus platform data export dump | `AUDIT_EXPORT` |
| `GET` | `/students/search` | Search students for coordinator/lead assignments | Admin |

---

## 19. System Health & Cryptographic Keys

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API status check ("CampusNode API Running") | No |
| `GET` | `/health` | Server uptime, latency, memory usage & performance stats | No |
| `GET` | `/api/keys` | Public keys for cryptographic offline QR validation | No |
| `GET` | `/api/keys/public` | Alias for cryptographic public keys | No |

---

## Sample Request Payloads

### 1. Propose New Event (`POST /api/events`)
```json
{
  "title": "HackCampus 2026",
  "description": "24-hour campus hackathon fostering innovation in Web3 and AI.",
  "venue": "Main Auditorium",
  "startTime": "2026-10-15T09:00:00.000Z",
  "endTime": "2026-10-16T09:00:00.000Z",
  "registrationDeadline": "2026-10-10T23:59:59.000Z",
  "totalSeats": 200,
  "allowWaitlist": true,
  "registrationType": "team",
  "minTeamSize": 2,
  "maxTeamSize": 4,
  "registrationFee": 0,
  "allowedPrograms": ["BTECH", "MTECH"],
  "allowedBranches": ["CSE", "IT", "ECE"],
  "clubIds": ["66d3a8e9f2b1a4c3d8e5f101", "66d3a8e9f2b1a4c3d8e5f102"],
  "sponsors": [
    {
      "name": "Tech Corp",
      "logoUrl": "https://res.cloudinary.com/dphudd2z1/image/upload/v1/techcorp.png",
      "websiteUrl": "https://techcorp.com"
    }
  ]
}
```

### 2. Event Registration with Waitlist Fallback (`POST /api/events/:id/register`)
```json
{
  "formResponses": {
    "T-Shirt Size": "L",
    "GitHub Username": "octocat"
  }
}
```

### 3. Review Manual Payment (`PUT /api/payment/:participationId/review`)
```json
{
  "status": "SUCCESS",
  "message": "Payment verified via bank reference UTR."
}
```

### 4. Create Venue Blackout (`POST /api/venues/blackouts`)
```json
{
  "venue": "Main Auditorium",
  "title": "Annual Convocation Setup",
  "reason": "Auditorium reserved for institutional ceremony stage preparations.",
  "startTime": "2026-11-01T08:00:00.000Z",
  "endTime": "2026-11-03T18:00:00.000Z"
}
```
