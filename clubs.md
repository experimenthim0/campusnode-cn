# CampusNode — Club Roles, Permissions & Membership Rules

Update the existing CampusNode club membership/RBAC system. Do not replace the existing authentication or permission architecture unnecessarily. Inspect the current Prisma schema, backend authorization middleware, APIs, and frontend club-management pages first, then integrate these rules into the existing architecture.

## 1. Club Roles

CampusNode must support exactly these four standard club-member roles:

1. `OFFICIAL_ACCOUNT`
2. `STUDENT_LEAD`
3. `COORDINATOR`
4. `MEMBER`

Do not treat these roles as the only authorization mechanism. Authorization must ultimately be based on explicit permissions.

---

## 2. Role Hierarchy

### OFFICIAL_ACCOUNT

Institutional-level club account.

Purpose:

* Represents the official club identity.
* Has the highest club-level administrative control.

Permissions:

* View club dashboard
* Edit club profile
* Manage club members
* Add members
* Remove members
* Assign/change member roles
* Create events
* Edit all club events
* Delete club events
* Submit events for approval
* Manage event registrations
* Export registration data
* Manage attendance
* Generate certificates
* Manage club announcements
* Manage club feed
* View club analytics
* View financial/payment information
* Manage club settings

Restrictions:

* Must not bypass faculty/admin approval workflows.
* Cannot arbitrarily approve its own events if faculty approval is required.
* Do not allow deletion of the club if this is controlled by Super Admin.

Maximum:

* 1 official club account per club.

---

## 3. STUDENT_LEAD

Student Lead is the highest operational student role.

Purpose:

* Student who is responsible for managing the club on a day-to-day basis.

Permissions:

* View club dashboard
* Edit club profile
* View/manage members
* Add/remove members
* Assign Coordinators
* Create events
* Edit all club events
* Delete club events
* Submit events for faculty/admin approval
* Manage registrations
* Export registration data
* Manage attendance
* Generate certificates
* Manage announcements
* Manage club feed
* View analytics
* Manage operational club settings

Restrictions:

* Cannot delete/close the club.
* Cannot change institutional ownership.
* Cannot change the official club account.
* Cannot bypass faculty/admin approval.
* Cannot access sensitive financial information unless explicitly granted.
* Cannot create another Student Lead.

Maximum:

* Exactly 1 active Student Lead per club.

The database must enforce this rule, not only the frontend.

When assigning a new Student Lead:

* Check whether the club already has an active Student Lead.
* If yes, reject the operation.
* To transfer leadership, first deactivate/remove the existing Student Lead or implement a dedicated atomic "Transfer Student Lead" operation.
* The transfer operation must be transactional so that a club can never temporarily or permanently have two active Student Leads.

---

## 4. COORDINATOR

Coordinator is an operational role.

Purpose:

* Help Student Lead manage events and club activities.

Default permissions:

* View club dashboard
* Create events
* Edit assigned events
* Manage event registrations
* Export registration data for assigned events
* Manage attendance for assigned events
* Generate certificates for assigned events
* Create/manage announcements where permitted
* View basic event analytics

Restrictions:

* Cannot manage club membership.
* Cannot assign/change roles.
* Cannot remove members.
* Cannot change club profile.
* Cannot change club settings.
* Cannot delete the club.
* Cannot access financial information.
* Cannot modify institutional information.
* Cannot bypass approval workflow.
* Cannot create another Student Lead.
* Cannot create another Coordinator beyond the club's allowed limit.

Maximum:

* Maximum 5 active Coordinators per club by default.

Make this limit configurable in the backend/system configuration if the existing architecture supports configuration.

Recommended default:

```text
Student Lead: 1
Coordinator: 5
Member: Unlimited
Official Account: 1
```

The limit must apply to ACTIVE memberships only.

If a Coordinator is deactivated/removed, the club may appoint another Coordinator.

---

## 5. MEMBER

Member is the standard participation-level role.

Permissions:

* View club profile
* View club dashboard information available to members
* View upcoming events
* Register for events
* View own registrations
* View own attendance
* View own certificates
* Access member-only resources
* Participate in club discussions/feed if enabled

Restrictions:

* Cannot create events.
* Cannot edit events.
* Cannot manage registrations.
* Cannot manage attendance.
* Cannot generate certificates.
* Cannot manage members.
* Cannot assign roles.
* Cannot edit club profile.
* Cannot modify club settings.
* Cannot access private analytics.
* Cannot access financial information.

Maximum:

* Unlimited, subject to any overall CampusNode membership rules.

---

# 6. Permission-Based Authorization

Do not write authorization logic such as:

```text
if role === "STUDENT_LEAD"
```

throughout the application.

Instead use explicit permissions.

Example permissions:

```text
club.view
club.profile.view
club.profile.edit

club.members.view
club.members.add
club.members.remove
club.members.manage
club.members.role.assign

club.events.view
club.events.create
club.events.edit
club.events.delete
club.events.approve
club.events.submit

club.registrations.view
club.registrations.manage
club.registrations.export

club.attendance.view
club.attendance.manage

club.certificates.view
club.certificates.generate

club.announcements.view
club.announcements.create
club.announcements.edit
club.announcements.delete

club.feed.view
club.feed.create
club.feed.moderate

club.analytics.view

club.finance.view

club.settings.view
club.settings.edit
```

Use the existing permission naming convention if the project already has one. Do not create duplicate authorization systems.

---

# 7. Permission Scope

Permissions should support scope wherever possible.

Supported scopes:

```text
GLOBAL
CLUB
EVENT
OWN
```

Examples:

```text
club.profile.edit → CLUB

club.members.manage → CLUB

club.events.create → CLUB

club.events.edit → CLUB / EVENT

club.registrations.manage → EVENT

club.attendance.manage → EVENT

user.profile.edit → OWN
```

A Coordinator should normally receive `EVENT` scope rather than unrestricted `CLUB` scope for event-related operations.

Example:

```text
Coordinator A
→ Event X
→ Event Y
```

Coordinator A can manage Event X and Event Y but cannot automatically manage every club event.

Student Lead and Official Account can receive broader club-level permissions.

---

# 8. Role Permission Matrix

Implement the following default permission model:

| Permission Area       | Official Account | Student Lead | Coordinator     | Member |
| --------------------- | ---------------- | ------------ | --------------- | ------ |
| Club dashboard        | Full             | Full         | Limited         | Member |
| Edit club profile     | Yes              | Yes          | No              | No     |
| View members          | Yes              | Yes          | No              | No     |
| Add members           | Yes              | Yes          | No              | No     |
| Remove members        | Yes              | Yes          | No              | No     |
| Assign roles          | Yes              | Yes          | No              | No     |
| Create events         | Yes              | Yes          | Yes             | No     |
| Edit all events       | Yes              | Yes          | No              | No     |
| Edit assigned events  | Yes              | Yes          | Yes             | No     |
| Delete events         | Yes              | Yes          | No              | No     |
| Submit for approval   | Yes              | Yes          | Yes             | No     |
| Manage registrations  | Yes              | Yes          | Assigned events | No     |
| Export registrations  | Yes              | Yes          | Assigned events | No     |
| Manage attendance     | Yes              | Yes          | Assigned events | No     |
| Generate certificates | Yes              | Yes          | Assigned events | No     |
| Manage announcements  | Yes              | Yes          | Limited         | No     |
| Manage club feed      | Yes              | Yes          | Limited         | No     |
| View analytics        | Yes              | Yes          | Event-level     | No     |
| View finance          | Yes              | Restricted   | No              | No     |
| Club settings         | Yes              | Operational  | No              | No     |
| Delete/close club     | Super Admin only | No           | No              | No     |

---

# 9. Role Assignment Rules

Implement strict role-transition validation.

Allowed normal transitions:

```text
MEMBER → COORDINATOR
MEMBER → STUDENT_LEAD
COORDINATOR → MEMBER
STUDENT_LEAD → MEMBER
COORDINATOR → STUDENT_LEAD
```

However:

* Only Official Account or authorized Student Lead may assign Coordinator.
* Only Official Account should normally assign/transfer Student Lead.
* A Student Lead cannot create a second Student Lead.
* A Coordinator cannot assign roles.
* A Member cannot assign roles.

Prefer a dedicated leadership-transfer API rather than allowing arbitrary role changes.

Example:

```text
POST /clubs/:clubId/transfer-student-lead
```

This operation must:

1. Verify caller permission.
2. Verify target user is an active club member.
3. Verify target user is eligible.
4. Remove/deactivate current Student Lead.
5. Assign target as Student Lead.
6. Perform everything inside one database transaction.
7. Create an audit log.

---

# 10. Maximum Role Validation

Enforce these limits on the backend:

```text
OFFICIAL_ACCOUNT = 1
STUDENT_LEAD = 1
COORDINATOR = 5
MEMBER = unlimited
```

Do NOT rely only on frontend validation.

Every role assignment API must perform the count check.

Example:

```text
Before assigning COORDINATOR:

activeCoordinatorCount < MAX_COORDINATORS
```

If:

```text
activeCoordinatorCount >= 5
```

return a clear validation error.

Example:

```text
"Maximum of 5 active coordinators is allowed for this club."
```

Likewise:

```text
if activeStudentLeadCount >= 1:
    reject
```

and:

```text
if activeOfficialAccountCount >= 1:
    reject
```

Use database transactions and appropriate constraints/locking to prevent race conditions where two requests simultaneously create duplicate high-level roles.

---

# 11. Academic Session Awareness

CampusNode already uses/should use Academic Session as an important architectural layer.

Club memberships and leadership should be associated with the relevant academic session.

Example:

```text
Club
   ↓
AcademicSession
   ↓
ClubMembership
   ↓
Role
```

Therefore:

```text
2025-26 Student Lead
```

and:

```text
2026-27 Student Lead
```

should be treated as different session assignments.

Do not accidentally carry an old Student Lead into a new academic session without an explicit transition.

Historical memberships, roles and audit logs must remain available.

---

# 12. Deactivation Rules

Do not permanently delete membership records merely because a student leaves a role.

Prefer:

```text
status = ACTIVE
status = INACTIVE
```

or the equivalent architecture already used by the project.

When a Student Lead or Coordinator leaves:

* Preserve historical data.
* Preserve event ownership.
* Preserve attendance records.
* Preserve certificate records.
* Preserve audit logs.
* Remove their active management permissions.

Do not delete historical relationships.

---

# 13. Event Ownership and Coordinator Assignment

A Coordinator should not automatically receive access to every club event.

Add/continue support for event-level assignment:

```text
Event
   ↓
EventCoordinator
   ↓
ClubMembership/User
```

Example:

```text
Event: Hackathon 2026

Coordinator:
- Student A
- Student B
```

Only assigned Coordinators can:

* Manage registrations
* Mark attendance
* Generate certificates
* Edit operational event details

Student Lead and Official Account retain club-wide access.

---

# 14. Audit Logs

Every sensitive action must be auditable.

Create/use the existing audit system for:

* Role assignment
* Role removal
* Student Lead transfer
* Coordinator assignment
* Member removal
* Event deletion
* Club profile modification
* Club settings modification
* Certificate generation
* Registration export
* Financial information access

Store at minimum:

```text
actorId
clubId
action
targetType
targetId
timestamp
metadata
```

Do not expose sensitive audit information to normal members.

---

# 15. Frontend Requirements

The frontend must dynamically display controls based on permissions.

Do not simply hide buttons based on role names.

Bad:

```text
if (user.role === "STUDENT_LEAD")
```

Preferred:

```text
if (hasPermission("club.members.manage"))
```

Examples:

* Member should not see "Manage Members".
* Coordinator should not see "Club Settings".
* Coordinator should only see events assigned to them where applicable.
* Student Lead should see "Manage Coordinators".
* Only authorized users should see "Assign Student Lead".
* Export buttons should require the relevant export permission.
* Financial information should only appear for authorized users.

Backend authorization remains mandatory even when UI controls are hidden.

---

# 16. Prisma/Data Model

Inspect the existing Prisma schema before modifying it.

If the current model does not support this architecture, introduce/update models similar to:

```text
Club
User
AcademicSession
ClubMembership
Role
Permission
RolePermission
EventCoordinator
AuditLog
```

ClubMembership should contain enough information to represent:

```text
user
club
academicSession
role
status
joinedAt
leftAt
```

Avoid duplicating user-role data in multiple unrelated tables.

Use enums only where they make sense. Permissions should preferably be data-driven if the existing architecture supports it.

---

# 17. Security Requirements

All sensitive operations must be authorized server-side.

Never trust:

```text
role
clubId
permission
userId
```

coming from the frontend.

Derive the authenticated user from the server-side session/token and verify:

1. User is authenticated.
2. User belongs to the club.
3. Membership is active.
4. Academic session is valid.
5. User has the required permission.
6. Permission scope allows the requested resource.
7. Role-count constraints are satisfied where applicable.

Prevent IDOR/BOLA vulnerabilities by verifying resource ownership/access on every club/event API.

---

# 18. Error Handling

Use clear API errors.

Examples:

```text
403:
"You do not have permission to manage club members."

409:
"This club already has an active Student Lead."

409:
"This club already has the maximum of 5 active Coordinators."

403:
"You do not have permission to manage this event."

403:
"You can only manage events assigned to you."
```

Use appropriate HTTP status codes rather than returning successful responses with error messages.

---

# 19. Migration Requirements

Before modifying the database:

1. Inspect the existing Prisma schema.
2. Identify existing club roles.
3. Map existing roles to the new permission system.
4. Preserve existing memberships.
5. Preserve historical data.
6. Create migration safely.
7. Do not destroy production data.
8. Update seed data if the project uses Prisma seed scripts.

Create default role-permission mappings for:

```text
OFFICIAL_ACCOUNT
STUDENT_LEAD
COORDINATOR
MEMBER
```

---

# 20. Testing Requirements

Add backend tests for at least:

### Role limits

* Cannot create second Official Account.
* Cannot create second Student Lead.
* Can create up to 5 Coordinators.
* Cannot create 6th Coordinator.
* Removing one Coordinator allows another Coordinator to be assigned.
* Members remain unlimited.

### Authorization

* Member cannot manage members.
* Member cannot create events.
* Coordinator cannot manage roles.
* Coordinator cannot access club settings.
* Coordinator can manage assigned events.
* Coordinator cannot manage unassigned events.
* Student Lead can manage coordinators.
* Student Lead cannot delete the club.
* Official Account has club-level administrative access.

### Leadership transfer

* Transfer succeeds atomically.
* Old Student Lead loses Student Lead permissions.
* New Student Lead receives Student Lead permissions.
* Two simultaneous transfers cannot create two active Student Leads.

### Academic sessions

* Previous-session leadership does not automatically become current-session leadership.
* Historical roles remain accessible.
* Current-session authorization is enforced.

---

# 21. Important Architectural Rule

Do not hard-code these rules only in React components.

The final authorization flow should be:

```text
Authenticated User
        ↓
Club Membership
        ↓
Academic Session
        ↓
Role
        ↓
Permission
        ↓
Permission Scope
        ↓
Resource Ownership/Assignment
        ↓
Allow / Deny
```

The frontend is only responsible for the user experience.

The backend is the final authority.

---

# 22. Final Default Configuration

Implement these defaults:

```text
Official Club Accounts: 1
Student Leads: 2
Coordinators: 5
Members: Unlimited
```

Make the Coordinator maximum configurable in one central location instead of scattering the value `5` throughout the codebase.

For example:

```text
MAX_CLUB_STUDENT_LEADS = 2
MAX_CLUB_COORDINATORS = 5
MAX_CLUB_OFFICIAL_ACCOUNTS = 1
```

Do not blindly implement the above schema if the existing CampusNode architecture already has equivalent models. First inspect the current Prisma schema and authorization implementation, then make the smallest clean changes required.

After implementation, provide a concise summary of:

* Prisma changes
* API changes
* Permission changes
* Frontend changes
* Migration requirements
* Tests added
* Any conflicts with the existing CampusNode architecture
# CampusNode — Student + Club Management Dual-Context Access

Update the CampusNode authorization and UI architecture so that a student who is a:

* `STUDENT_LEAD`
* `COORDINATOR`
* `OFFICIAL_ACCOUNT` (if associated with a student user)

can simultaneously act as:

1. A normal CampusNode student
2. A club administrator/manager according to their club permissions

Club responsibilities must NEVER remove or reduce their normal student functionality.

---

## 1. Core Rule

A user's club role is an additional permission layer.

It must NOT replace their base student identity.

The authorization model should conceptually work like:

```text
Student Account
      +
Club Membership / Role
      ↓
Combined Access
```

Example:

```text
Nikhil
├── Normal Student Permissions
│   ├── Browse events
│   ├── Register for events
│   ├── View My Events
│   ├── Cancel registration where allowed
│   ├── View certificates
│   ├── View attendance
│   └── Use normal CampusNode features
│
└── Club Role Permissions
    ├── Manage club
    ├── Create events
    ├── Manage registrations
    ├── Manage attendance
    └── Other assigned permissions
```

Never make:

```text
role = STUDENT_LEAD
```

mean that the user is no longer treated as a normal student.

---

# 2. Student's Own Event Page

Student Leads and Coordinators must continue to have access to the normal student-facing event system.

They should have a clearly accessible:

```text
My Events
```

or equivalent student event page.

This page must show events in which the student personally participates.

For example:

```text
My Events

Upcoming
├── Coding Contest
├── Basketball Tournament
└── Fresher Party

Registered
├── Hackathon 2026
└── Workshop on AI

Past
├── Civil Fest
└── Photography Competition
```

This must work exactly the same way as it does for a normal student.

---

# 3. Club Event Management vs Personal Participation

Clearly separate these two concepts.

### Club management

Example:

```text
CampusNode Club
      ↓
Technical Club
      ↓
Coordinator
      ↓
Can manage:
- Hackathon
- Workshop
- Coding Contest
```

### Personal student participation

The same Coordinator can also:

```text
Student
      ↓
Registers for
      ↓
Sports Fest
      ↓
Literary Event
      ↓
Another Club's Hackathon
```

Being a Coordinator of the Technical Club must NOT prevent them from registering for events created by:

* Other clubs
* Central organizers
* College administration
* Other event organizers

---

# 4. Event Visibility

A Student Lead/Coordinator should see both:

### Student-facing events

All events that a normal student is allowed to discover.

Examples:

```text
All Events
Upcoming Events
Recommended Events
My Events
Registered Events
Past Events
```

### Club-management events

Additional management views based on permissions.

Example:

```text
Club Dashboard
    ↓
My Club Events
    ↓
Events I Manage
```

Do not merge these into a single restricted event list.

A Coordinator's event dashboard should not replace the normal student event discovery page.

---

# 5. Registration Rule

A Student Lead or Coordinator must be allowed to register for events as a student.

Example:

```text
User:
Student Lead of Coding Club

Can:
✅ Create Coding Club Hackathon
✅ Manage Hackathon registrations
✅ Mark Hackathon attendance

AND:

✅ Register for Basketball Tournament
✅ Register for another club's workshop
✅ Register for college fest
✅ Register for central college events
```

Club management permissions must not automatically imply event registration restrictions.

---

# 6. Conflict Between Managing and Participating

If a user manages an event and also wants to participate in that same event, follow the existing CampusNode event rules.

Do NOT automatically assume:

```text
Coordinator = participant
```

or:

```text
Coordinator = cannot participate
```

Instead, support the two concepts independently:

```text
Event Management Assignment
+
Event Registration
```

If CampusNode's business rules prohibit organizers from participating in their own event, enforce that specific rule separately.

Do not create this restriction merely because the user is a Coordinator.

---

# 7. "My Events" Data Logic

The `My Events` page should be based on the student's own relationship with events.

For example:

```text
EventRegistration
    ↓
userId
    ↓
Current authenticated student
```

It must NOT query:

```text
ClubMembership.role
```

to determine whether an event appears in `My Events`.

Therefore:

```text
Student Lead
→ My Events = events they personally registered for

Coordinator
→ My Events = events they personally registered for

Member
→ My Events = events they personally registered for

Normal Student
→ My Events = events they personally registered for
```

All four should behave consistently.

---

# 8. Navigation Structure

For users who have club-management responsibilities, provide both contexts.

Recommended navigation:

```text
Home
Events
My Events
Clubs
Notifications
Profile

-------------------------

Club Management
├── My Club
├── Club Dashboard
├── Manage Members
├── Club Events
├── Registrations
└── Attendance
```

The exact UI can follow the existing CampusNode navigation system.

The important requirement is:

> A user must always be able to return from Club Management to the normal student experience.

Do not replace the normal student navigation with a club-admin-only navigation.

---

# 9. Multiple Club Roles

A student may potentially have memberships in multiple clubs.

Example:

```text
Student
│
├── Technical Club
│   └── Student Lead
│
├── Photography Club
│   └── Coordinator
│
└── Sports Club
    └── Member
```

CampusNode must evaluate permissions per club.

For example:

```text
Technical Club
→ Full Student Lead permissions

Photography Club
→ Coordinator permissions

Sports Club
→ Member permissions
```

However, across the entire CampusNode platform, the user remains a normal student.

---

# 10. Backend Authorization

Do not implement a mutually exclusive role system such as:

```text
if user.role === "STUDENT_LEAD"
```

where Student Lead replaces the normal student permissions.

Instead:

```text
Base User/Student Permissions
        +
Club Membership Permissions
        +
Resource Scope
        =
Effective Permissions
```

Conceptually:

```text
effectivePermissions(user, clubId)
```

should combine:

```text
studentPermissions
+
clubPermissions
```

where appropriate.

---

# 11. Important Security Rule

Do NOT give a Student Lead or Coordinator access to another club's private management data simply because they are a club manager somewhere else.

Example:

```text
User = Coordinator of Club A
```

They can:

```text
✅ Manage assigned events of Club A
✅ Register for events of Club B as a student
```

They cannot:

```text
❌ Manage Club B
❌ View Club B private member list
❌ View Club B private analytics
❌ Edit Club B events
```

unless they separately have a membership/permission in Club B.

---

# 12. Final Access Model

CampusNode should follow this principle:

```text
                 CAMPUSNODE USER
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
       STUDENT CONTEXT       CLUB CONTEXT
             │                   │
             │             Membership
             │                   ↓
             │                 Role
             │                   ↓
             │              Permissions
             │                   ↓
             │                Scope
             │
             └──────────┬────────┘
                        ↓
                 Effective Access
```

### Student Context

Available to every student:

* Browse events
* Search events
* Register for events
* My Events
* View own registrations
* View own attendance
* View own certificates
* Participate in events
* Other normal CampusNode student features

### Club Context

Available according to club membership:

* Club Dashboard
* Club Profile
* Member Management
* Event Management
* Registration Management
* Attendance
* Certificates
* Analytics
* Other assigned club permissions

---

# 13. Acceptance Criteria

The implementation is correct only if all of these work:

### Student Lead

```text
✅ Can manage their club
✅ Can create/manage club events
✅ Can manage members
✅ Can access My Events
✅ Can browse all normal student events
✅ Can register for other clubs' events
✅ Can view their own registrations
✅ Can view their own certificates
```

### Coordinator

```text
✅ Can manage assigned club events
✅ Can manage assigned registrations
✅ Can manage assigned attendance
✅ Can access My Events
✅ Can browse normal student events
✅ Can register for other clubs' events
✅ Can view personal event history
```

### Member

```text
✅ Normal student functionality
✅ Club member functionality
```

### Critical isolation

```text
❌ Student Lead of Club A cannot manage Club B
❌ Coordinator of Club A cannot access Club B private data
❌ Club role cannot remove normal student functionality
❌ Club role cannot replace the user's student identity
```

---

## Final architectural principle

**Club role = additional responsibility, NOT a replacement for student identity.**

A student can simultaneously be:

```text
Normal Student
+
Student Lead of Club A
+
Coordinator of Club B
+
Member of Club C
```

CampusNode should calculate access from all applicable memberships and permissions rather than forcing the user into one global role.
