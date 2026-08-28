# CampusNode: Add Central Organizer Role Under Existing Super Admin RBAC

## Objective

Modify the existing CampusNode RBAC system to introduce a new role:

`CENTRAL_ORGANIZER`

CampusNode already has a `SUPER_ADMIN` role. **Do not replace, modify, or weaken the Super Admin role.**

The new Central Organizer must be a **limited event-management role**, not an administrative role.

Its purpose is to manage college-wide student events that are not owned by a single club, such as:

* Freshers' Party
* Club Exhibition / Club Fair
* College Orientation
* Central Cultural Events
* Inter-club Events
* College-wide Student Activities

There must be **exactly ONE Central Organizer account** in the entire CampusNode system.

---

# 1. Core Role Architecture

Maintain the existing authentication and RBAC architecture.

The role hierarchy should conceptually be:

```text
SUPER_ADMIN
    │
    ├── Platform Administration
    │
    ├── User Management
    ├── Role Management
    ├── Club Management
    └── System Configuration


CENTRAL_ORGANIZER
    │
    ├── College-wide Event Management
    ├── Participating Club Management
    ├── Registration Management
    ├── Attendance
    ├── Announcements
    ├── Certificates
    └── Event Analytics


CLUB_ADMIN / CLUB_PRESIDENT
    │
    └── Own Club Management


STUDENT
    │
    └── Student Participation
```

### Critical distinction

**SUPER_ADMIN = manages the CampusNode platform.**

**CENTRAL_ORGANIZER = manages college-wide events.**

Do not make Central Organizer a limited version of Super Admin by giving it Super Admin permissions and hiding UI elements.

The backend authorization itself must restrict the Central Organizer.

---

# 2. Add the New Role

Add:

```text
CENTRAL_ORGANIZER
```

to the existing role system.

Do not create a separate authentication system.

Do not create a separate user model.

Do not create a separate login system.

Use the existing:

```text
User → Role → Permissions
```

architecture.

First inspect how roles are currently represented in the project and follow the existing naming conventions.

---

# 3. Permission-Based RBAC

If CampusNode already has a permission-based RBAC system, integrate the new role into it.

Prefer permissions such as:

```text
CENTRAL_EVENT_CREATE
CENTRAL_EVENT_UPDATE
CENTRAL_EVENT_DELETE
CENTRAL_EVENT_PUBLISH
CENTRAL_EVENT_MANAGE
CENTRAL_EVENT_MANAGE_CLUBS
CENTRAL_EVENT_MANAGE_REGISTRATIONS
CENTRAL_EVENT_MANAGE_ATTENDANCE
CENTRAL_EVENT_MANAGE_ANNOUNCEMENTS
CENTRAL_EVENT_MANAGE_CERTIFICATES
CENTRAL_EVENT_VIEW_ANALYTICS
```

Use the project's existing permission naming convention instead of blindly copying these names.

The important requirement is separation of privileges.

---

# 4. Super Admin Permissions

Do not remove or change existing Super Admin permissions.

Super Admin remains the highest-level CampusNode administrator.

Super Admin should continue to be able to manage things such as:

* Users
* Roles
* Permissions
* Clubs
* System settings
* Platform configuration
* Administrative workflows
* Other existing Super Admin functionality

Additionally, Super Admin should be the authority that creates or assigns the single Central Organizer.

---

# 5. Central Organizer Permissions

The Central Organizer should ONLY receive permissions necessary for college-wide event management.

### Event Management

Allow:

* Create college-wide events
* Edit college-wide events
* Publish/unpublish events
* Cancel events
* Delete events according to existing event lifecycle rules
* Manage registration settings
* Manage event capacity
* Manage event schedule
* Manage venue
* Manage custom fields
* Manage individual/team registration
* View registrations

### Participating Clubs

Allow:

* View approved clubs
* Select clubs for an event
* Invite clubs
* Add participating clubs
* Remove participating clubs
* View participating clubs
* Track participation status if an invitation/acceptance workflow exists

The Central Organizer must NOT gain administrative control over those clubs.

Example:

```text
Central Organizer
       │
       ▼
Freshers Party 2026
       │
       ├── Coding Club
       ├── Robotics Club
       ├── Literary Club
       ├── Music Club
       └── Dance Club
```

The event belongs to the Central Organizer.

The clubs are only participating entities.

---

# 6. Central Organizer Must NOT Manage Clubs

This distinction is extremely important.

Central Organizer:

```text
CAN:
✓ Invite Coding Club to an event
✓ Add Coding Club as a participating club
✓ Remove Coding Club from an event
✓ View participating club information needed for the event
```

Central Organizer:

```text
CANNOT:
✗ Edit Coding Club profile
✗ Delete Coding Club
✗ Add/remove club members
✗ Change club president
✗ Change club permissions
✗ Approve club membership
✗ Transfer club ownership
✗ Modify club settings
```

Those remain under existing club administration/Super Admin workflows.

---

# 7. Attendance

Integrate the Central Organizer with the existing CampusNode attendance system.

Allow:

* Generate event QR
* Manage event check-in
* View attendance
* Search attendees
* View attendance statistics
* Use existing online attendance
* Use existing offline attendance if already supported

Do NOT create a second attendance implementation.

Reuse the existing:

```text
QR generation
QR scanning
Offline scanner
Online synchronization
Attendance database
Attendance APIs
```

---

# 8. Certificates

The Central Organizer should be able to use the existing certificate system.

Allow:

* Enable certificates
* Configure eligibility
* Generate certificates
* Publish certificates
* Allow eligible participants to download certificates

Do not create a duplicate certificate engine.

---

# 9. Announcements

Allow Central Organizer to use the existing notification/announcement system for its own events.

Allow:

* Event announcements
* Event updates
* Registration notifications
* Important event messages
* Event-related reminders

Do not grant unrestricted platform-wide notification permissions.

The Central Organizer should only be able to send announcements related to events it manages.

---

# 10. Analytics

Allow Central Organizer to view analytics for its own events.

Examples:

```text
Total registrations
Confirmed registrations
Attendance
Attendance percentage
Individual/team registrations
Club-wise participation
Check-in statistics
```

Do not give Central Organizer unrestricted platform-wide analytics unless the existing permission system explicitly requires it.

---

# 11. Exactly One Central Organizer

There must be **exactly one Central Organizer account**.

The system must enforce:

```text
Maximum CENTRAL_ORGANIZER users = 1
```

This must be enforced on the backend/database level.

Do NOT rely only on frontend validation.

Do NOT use only:

```javascript
if (!centralOrganizerExists) {
    createCentralOrganizer();
}
```

because concurrent requests can create duplicate accounts.

Use the database's appropriate uniqueness mechanism or transactional protection.

---

# 12. Central Organizer Account Creation

There must be **no public registration option** for Central Organizer.

Do not show:

```text
Register as Central Organizer
```

on the normal registration page.

Only the existing Super Admin should be able to create/assign the Central Organizer.

Suggested Super Admin flow:

```text
Super Admin Dashboard
        ↓
User Management
        ↓
Assign Central Organizer
        ↓
Select existing user OR create authorized account
        ↓
Confirm
        ↓
CENTRAL_ORGANIZER
```

If the Central Organizer already exists:

```text
Central Organizer already assigned
```

Do not allow another assignment.

If the Central Organizer account is removed/deactivated, follow the project's existing user lifecycle rules, but still ensure that there can never be two active Central Organizers.

---

# 13. Event Ownership

The current CampusNode architecture may assume:

```text
Event → Club
```

Do not break this.

Extend it so that an event can have either:

```text
Club Organizer
```

or:

```text
Central Organizer
```

Conceptually:

```text
Event
 │
 ├── organizerType = CLUB
 │      └── clubId
 │
 └── organizerType = CENTRAL_ORGANIZER
        └── central organizer
```

Adapt this to the actual existing database model.

Do not blindly add duplicate ownership fields.

---

# 14. Existing Club Events Must Continue Working

Existing behavior must remain:

```text
Club
   ↓
Create Event
   ↓
Club-owned Event
```

New behavior:

```text
Central Organizer
   ↓
Create Event
   ↓
College-wide Event
   ↓
Multiple Participating Clubs
```

Both event types must coexist.

Do not migrate existing club events unnecessarily.

Do not change their ownership.

---

# 15. Participating Clubs Relationship

If the current system does not already support this, introduce an appropriate relationship:

```text
Event ↔ Club
```

This should allow:

```text
One event → multiple clubs
One club → multiple events
```

Prevent duplicate participation records.

Conceptually:

```text
Event: Club Exhibition 2026

Participating Clubs:
    Coding Club
    Robotics Club
    Literary Club
    Music Club
```

Participation does NOT transfer event ownership.

---

# 16. Event Creation UI

Modify the existing Create Event flow according to the authenticated user's role.

### Club user

Continue existing behavior:

```text
Organizer:
[My Club]
```

### Central Organizer

Show:

```text
Organizer:
[Central Organizer]
```

The Central Organizer must not be allowed to select an arbitrary club as the event owner.

After event creation:

```text
Participating Clubs
[+ Add Clubs]
```

Allow multiple clubs.

---

# 17. Central Organizer Dashboard

Create a dedicated dashboard using the existing CampusNode design system.

Suggested navigation:

```text
Central Organizer

├── Overview
├── Events
├── Create Event
├── Participating Clubs
├── Registrations
├── Attendance
├── Announcements
├── Certificates
└── Analytics
```

Do not expose:

```text
Users
Roles
Permissions
System Settings
Platform Configuration
```

unless those are already explicitly allowed through another permission.

Those belong to Super Admin.

---

# 18. Route Protection

Add Central Organizer-specific protected routes using the existing route protection architecture.

Conceptually:

```text
/central-organizer
/central-organizer/events
/central-organizer/events/create
/central-organizer/events/:id
/central-organizer/clubs
/central-organizer/attendance
/central-organizer/analytics
```

Follow the actual routing conventions already present in the project.

Do not create duplicate authentication guards.

---

# 19. Backend Authorization

Every Central Organizer endpoint must be protected on the backend.

Do NOT rely on frontend route protection.

For example:

```text
Request
   ↓
Authentication
   ↓
User identification
   ↓
Role/permission verification
   ↓
Resource ownership verification
   ↓
Controller
```

The backend must verify both:

1. The user has the required Central Organizer permission.
2. The requested event belongs to that Central Organizer where applicable.

Never trust:

```text
userId
role
organizerId
```

sent by the frontend.

Derive authenticated identity from the server-side authentication context.

---

# 20. Resource-Level Authorization

The Central Organizer should not automatically be able to modify every event.

For Central Organizer event APIs:

```text
Central Organizer
      ↓
Own Central Organizer Events
```

For example:

```text
PUT /events/:id
```

must verify:

```text
authenticated user
        ↓
CENTRAL_ORGANIZER permission
        ↓
event is a Central Organizer event
        ↓
event belongs to this Central Organizer
        ↓
allow update
```

Do not authorize only based on the URL's event ID.

---

# 21. Example: Freshers' Party

The system should support:

```text
Event:
Freshers' Party 2026

Organizer:
Central Organizer

Participating Clubs:
Coding Club
Robotics Club
Literary Club
Music Club
Dance Club

Registration:
Individual

Attendance:
QR Check-in

Certificates:
Optional
```

No club should appear as the owner.

---

# 22. Example: Club Exhibition

Support:

```text
Event:
Club Exhibition 2026

Organizer:
Central Organizer

Participating Clubs:
Club A
Club B
Club C
Club D
Club E
```

Each club participates, but the Central Organizer remains the event owner.

---

# 23. Super Admin Interface

Add a small section to the existing Super Admin user/role management area:

```text
Central Organizer

Status:
● Assigned
```

Show:

```text
Current Central Organizer
Name
Email
Status
Assigned Date
```

Provide appropriate management actions based on existing user-management rules.

Do not create a separate Super Admin system.

---

# 24. Database Changes

Before editing the schema:

1. Inspect the existing User model.
2. Inspect existing roles.
3. Inspect permissions.
4. Inspect Event model.
5. Inspect Club model.
6. Inspect Event → Club relationships.
7. Inspect event ownership logic.
8. Inspect authentication.
9. Inspect authorization middleware.
10. Inspect existing migrations.

Then design the minimum required schema changes.

Do not create duplicate models if equivalent models already exist.

Do not destroy existing data.

Do not rewrite the entire RBAC system unless absolutely necessary.

Create proper database migrations.

---

# 25. Backward Compatibility

This feature must not break:

* Existing users
* Existing roles
* Club administration
* Club events
* Event registration
* Team registration
* Custom fields
* QR generation
* QR scanning
* Offline scanning
* Online attendance
* Attendance synchronization
* Certificates
* Notifications
* Analytics
* Existing approval workflows

Run regression tests after implementation.

---

# 26. Coding Rules

Before writing code:

**Inspect first.**

Do not assume:

* File names
* Database models
* API paths
* Role names
* Permission names
* Middleware names
* Frontend routing
* State-management architecture

Use the actual project structure.

While implementing:

* Do not forget imports.
* Do not create undefined variables.
* Do not reference nonexistent models.
* Do not create duplicate functions.
* Do not create duplicate routes.
* Do not break existing exports.
* Do not leave unused imports.
* Do not hard-code user IDs.
* Do not hard-code the Central Organizer ID.
* Do not hard-code permissions in multiple unrelated files.
* Reuse existing components and utilities.
* Follow existing coding conventions.

---

# 27. Validation and Testing

Test the following.

### Role

* [ ] CENTRAL_ORGANIZER exists.
* [ ] SUPER_ADMIN remains unchanged.
* [ ] Existing roles continue working.

### Single Account

* [ ] First Central Organizer can be assigned.
* [ ] Second Central Organizer cannot be assigned.
* [ ] Concurrent requests cannot create two Central Organizers.
* [ ] Normal users cannot self-assign Central Organizer.
* [ ] Frontend cannot bypass the restriction.

### Super Admin

Verify Super Admin can:

* [ ] Manage users.
* [ ] Manage roles.
* [ ] Manage permissions.
* [ ] Assign Central Organizer.
* [ ] Continue all existing Super Admin operations.

### Central Organizer

Verify Central Organizer can:

* [ ] Create central events.
* [ ] Edit own central events.
* [ ] Publish/unpublish own events.
* [ ] Manage participating clubs.
* [ ] Manage registrations.
* [ ] Manage attendance.
* [ ] Manage announcements.
* [ ] Manage certificates.
* [ ] View analytics.

### Central Organizer Restrictions

Verify Central Organizer cannot:

* [ ] Create another Central Organizer.
* [ ] Assign roles.
* [ ] Manage RBAC.
* [ ] Modify system settings.
* [ ] Delete clubs.
* [ ] Manage club members.
* [ ] Change club ownership.
* [ ] Access Super Admin-only APIs.
* [ ] Modify another organizer's events.

### Existing Club System

Verify:

```text
Club → Create Event
```

still works.

Verify:

```text
Central Organizer → Create Event
```

also works.

Verify both event types can coexist.

---

# 28. Implementation Phases

Do not implement everything blindly in one pass.

### Phase 1 — Architecture Audit

Inspect the project and identify:

* Existing roles
* Permission system
* User model
* Event model
* Club model
* Event ownership
* Authentication
* Authorization middleware
* Frontend route protection

Do not modify code yet.

Report the relevant files/models before implementation.

### Phase 2 — RBAC

Implement:

```text
CENTRAL_ORGANIZER
```

and the required permissions.

Ensure exactly one Central Organizer can exist.

### Phase 3 — Event Ownership

Update event ownership so both are supported:

```text
Club-owned event
Central Organizer-owned event
```

Preserve all existing events.

### Phase 4 — Participating Clubs

Implement the event ↔ club participation relationship.

### Phase 5 — Backend

Implement secure APIs and resource-level authorization.

### Phase 6 — Frontend

Implement:

* Central Organizer dashboard
* Event management
* Participating club management
* Registration
* Attendance
* Announcements
* Certificates
* Analytics

### Phase 7 — Super Admin Integration

Add Central Organizer assignment/management to the existing Super Admin interface.

### Phase 8 — Testing

Run:

* Database migration
* Unit tests
* Integration tests
* RBAC tests
* API tests
* Frontend tests
* Build
* Lint
* Existing regression tests

Fix all errors before completion.

---

# Final Acceptance Criteria

The implementation is complete only when:

* [ ] `CENTRAL_ORGANIZER` exists.
* [ ] `SUPER_ADMIN` remains the highest platform-level role.
* [ ] Central Organizer is NOT a Super Admin.
* [ ] Exactly one Central Organizer can exist.
* [ ] Only Super Admin can assign/create the Central Organizer.
* [ ] Public users cannot self-register as Central Organizer.
* [ ] Central Organizer has event-specific permissions only.
* [ ] Central Organizer can create college-wide events.
* [ ] Central Organizer events do not require a club owner.
* [ ] Multiple clubs can participate in one Central Organizer event.
* [ ] Participating clubs do not gain event ownership.
* [ ] Central Organizer cannot administer clubs.
* [ ] Central Organizer cannot manage roles or permissions.
* [ ] Central Organizer cannot access Super Admin functionality.
* [ ] Central Organizer can manage registration, attendance, announcements, certificates, and analytics for its events.
* [ ] Existing club event functionality remains unchanged.
* [ ] Existing authentication remains functional.
* [ ] Existing QR and offline attendance remain functional.
* [ ] Database constraints prevent duplicate Central Organizers.
* [ ] Backend authorization cannot be bypassed through direct API requests.
* [ ] Frontend route protection works.
* [ ] Database migration succeeds.
* [ ] Backend builds successfully.
* [ ] Frontend builds successfully.
* [ ] Existing tests pass.
* [ ] New RBAC and Central Organizer tests pass.
* [ ] No missing imports, undefined variables, broken routes, or duplicate implementations remain.

**Important:** Before making any changes, inspect the existing CampusNode architecture and adapt this implementation to the actual codebase. Do not replace working systems merely to fit this specification.
