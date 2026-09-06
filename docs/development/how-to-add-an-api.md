# How to Add a Backend API Endpoint 🛠️

## 1. Standard API Implementation Checklist

When creating a new API endpoint in CampusNode:

1. **Select or Create Route File**: Place under `server/routes/[domain].js`.
2. **Define Validation Schema**: Create Zod schema for body/query/params.
3. **Attach Middleware**: Include `verifyToken`, `requirePermission`, and `validateBody`.
4. **Implement Handler Logic**: Use `prisma` for database queries with proper error handling.
5. **Format Response**: Use standard `{ success: true, ... }` format.
6. **Update API Documentation**: Document endpoint in `API_ENDPOINTS.md`.

---

## 2. Step-by-Step Implementation Example

### Step 1: Create or Open Route File (`server/routes/events.js`)
```javascript
import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { verifyToken } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../utils/rbac.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Define Zod Input Schema
const bookmarkSchema = z.object({
  notifyBeforeMinutes: z.number().min(15).max(1440).default(60),
});

/**
 * POST /api/events/:id/bookmark
 * Bookmark an event for personalized reminders
 */
router.post(
  "/:id/bookmark",
  verifyToken,
  validateBody(bookmarkSchema),
  async (req, res, next) => {
    try {
      const eventId = req.params.id;
      const studentId = req.user.id;

      // 1. Check if event exists
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      // 2. Perform database operation
      const bookmark = await prisma.eventBookmark.create({
        data: {
          eventId,
          studentId,
          notifyBeforeMinutes: req.body.notifyBeforeMinutes,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Event bookmarked successfully",
        bookmark,
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ success: false, message: "Event already bookmarked" });
      }
      next(error);
    }
  }
);

export default router;
```

---

## 3. Register Route in `server/index.js` (If New Module)
```javascript
import bookmarkRoutes from "./routes/bookmarks.js";

app.use("/api/bookmarks", bookmarkRoutes);
```
