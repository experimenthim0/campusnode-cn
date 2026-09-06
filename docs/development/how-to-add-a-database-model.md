# How to Add a Database Model 🛠️

## 1. The Decision Gate: Student vs. Admin Identity Ownership

Before creating any model or foreign key, answer this critical architectural question:

```text
               Is this persona fundamentally a student?
                                 │
                 ┌───────────────┴───────────────┐
                 ▼ YES                           ▼ NO
        Use StudentUser Identity         Is this an administrative /
        (Student Table)                  faculty / staff authority?
                 │                               │
                 │                               ▼ YES
                 ▼                      Use AdminRole Identity
      Link via Relationships:           (Admin Table)
      - ClubMembership (Head / Coord)            │
      - EventStaff (Scanner Operator)            ▼
      - InstitutionalAccountAssignment   Set AdminRoleType Enum:
                                         - facultyCoordinator
                                         - paymentAdmin
                                         - lostFoundAdmin
                                         - admin
```

### Questions to Ask:
1. **"Is this person an enrolled student on campus?"**
   - **Answer**: Yes ➔ Use `StudentUser`. Their club leadership (Head, Coordinator, Member) or event staff duties must be linked via relationship tables (`ClubMembership`, `EventStaff`), **never** by creating a new `AdminRole` record.
2. **"Is this person a faculty member, payment verifier, or platform administrator?"**
   - **Answer**: Yes ➔ Use `AdminRole` with the appropriate `AdminRoleType` enum.

---

## 2. Complete Model Addition Lifecycle

```text
1. Define Business Requirement
       │
       ▼
2. Verify Identity Separation (StudentUser vs AdminRole)
       │
       ▼
3. Define Model in server/prisma/schema.prisma
       │
       ▼
4. Run Migration: npm run prisma:migrate / npm run prisma:push
       │
       ▼
5. Regenerate Prisma Client: npm run prisma:generate
       │
       ▼
6. Implement Backend Service & Controller
       │
       ▼
7. Create REST API Endpoints in server/routes/
       │
       ▼
8. Integrate React Web Frontend (client/src/services/)
       │
       ▼
9. Integrate Flutter Mobile Frontend (lib/features/)
```

---

## 3. Concrete Example: Adding a `ClubBudget` Model

### Step 1: Update `server/prisma/schema.prisma`
```prisma
model ClubBudget {
  id              String   @id @db.VarChar(24)
  clubId          String   @db.VarChar(24)
  club            Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  fiscalYear      String   // e.g. "2026-2027"
  allocatedAmount Float    @default(0)
  spentAmount     Float    @default(0)
  approvedById    String?  @db.VarChar(24)
  approvedBy      AdminRole? @relation(fields: [approvedById], references: [id], onDelete: SetNull)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clubId])
  @@index([approvedById])
}
```

### Step 2: Push & Generate Prisma Client
```bash
cd server
npm run prisma:push
npm run prisma:generate
```

### Step 3: Implement Backend Logic
```javascript
// server/routes/clubs.js
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";

router.post("/:clubId/budget", verifyToken, requirePermission("club.manage_finances"), async (req, res) => {
  const budget = await prisma.clubBudget.create({
    data: {
      id: createObjectId(),
      clubId: req.params.clubId,
      fiscalYear: req.body.fiscalYear,
      allocatedAmount: req.body.allocatedAmount,
    }
  });
  return res.status(201).json({ success: true, budget });
});
```
