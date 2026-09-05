import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import eventRoutes from "./routes/events.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import paymentRoutes from "./routes/payment.js";
import adminRoutes from "./routes/admin.js";
import clubRoutes from "./routes/clubs.js";
import clubMemberRoutes from "./routes/clubMembers.js";
import notificationRoutes from "./routes/notifications.js";
import certificateRoutes from "./routes/certificates.js";
import participationRoutes from "./routes/participation.js";
import lostFoundRoutes from "./routes/lostFound.js";
import lostFoundAdminRoutes from "./routes/lostFoundAdmin.js";
import teamRoutes from "./routes/teams.js";
import exportCenterRoutes from "./routes/exportCenter.js";
import pushRoutes from "./routes/push.js";
import venueRoutes, { ensureVenuesTableAndSeed } from "./routes/venues.js";
import blackoutRoutes, { ensureBlackoutTable } from "./routes/blackouts.js";
import scannerRoutes from "./routes/scanner.js";
import centralOrganizerRoutes from "./routes/centralOrganizer.js";
import eventStaffRoutes from "./routes/eventStaff.js";
import feedbackRoutes from "./routes/feedback.js";
import featuredEventRoutes from "./routes/featuredEvents.js";
import previewRouter from "./emails/preview/previewRouter.js";
import { getPublicKeyInfo } from "./services/qrSigningService.js";
import prisma from "./lib/prisma.js";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

import { corsOptions } from "./utils/corsConfig.js";
import errorHandler from "./middleware/errorHandler.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import { apiCompression, etagSupport, getPerformanceStats, overloadProtection, publicReadCache, requestMetrics } from "./middleware/performance.js";
import { seedPermissions } from "./utils/rbac.js";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(compression());

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public")));

app.use(requestMetrics);
app.use(overloadProtection);
app.use(publicReadCache);
app.use(etagSupport);
app.use(apiCompression);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use("/api/auth/login", authLimiter);

// Rate limiter: student & external registration — prevent mass bot registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many registration attempts. Please try again later." },
});
app.use("/api/auth/register/student", registerLimiter);
app.use("/api/auth/register/external", registerLimiter);

// Rate limiter: forgot-password — prevent email bombing
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: "Too many password reset requests. Please try again later." },
});
app.use("/api/auth/forgot-password", forgotPasswordLimiter);

// Rate limiter: 2FA verification — prevent OTP brute-force
const twoFaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many verification attempts. Please try again later." },
});
app.use("/api/auth/verify-2fa", twoFaLimiter);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: false, limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(cookieParser());

console.log("Using PostgreSQL via Prisma");

// Maintenance Mode Guard: Block backend access when MAINTENANCE_MODE=true
if (process.env.MAINTENANCE_MODE === "true") {
  const startupNotice = process.env.MAINTENANCE_MESSAGE || "CampusNode backend is currently undergoing scheduled maintenance.";
  console.log("\n=======================================================");
  console.log("🚧 [MAINTENANCE MODE ACTIVE] 🚧");
  console.log(`Notice: ${startupNotice}`);
  console.log("=======================================================\n");
}

app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === "true") {
    const customMessage = process.env.MAINTENANCE_MESSAGE || "CampusNode is currently undergoing scheduled maintenance. All API access is temporarily paused.";

    console.warn(`\n[MAINTENANCE BLOCKED] ${new Date().toLocaleTimeString()} | ${req.method} ${req.originalUrl} | Client IP: ${req.ip || req.socket?.remoteAddress}`);
    console.warn(`Terminal Notice: "${customMessage}"\n`);

    return res.status(503).json({
      success: false,
      code: "MAINTENANCE_OVERLOAD",
      maintenance: true,
      message: customMessage,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

app.get("/", (req, res) => {
  res.send("CampusNode API Running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, ...getPerformanceStats(), uptimeSeconds: Math.round(process.uptime()) });
});

app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/club-members", clubMemberRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/participation", participationRoutes);
app.use("/api/lost-found", lostFoundRoutes);
app.use("/api/admin/lost-found", lostFoundAdminRoutes);
app.use("/api/export-center", exportCenterRoutes);
app.use("/api/venues/blackouts", blackoutRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/central-organizer", centralOrganizerRoutes);
app.use("/api/event-staff", eventStaffRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/featured-events", featuredEventRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/api/emails/preview", previewRouter);
}

app.get(["/api/keys", "/api/keys/public"], (req, res) => {
  try {
    const keyInfo = getPublicKeyInfo();
    return res.json({ keys: [keyInfo] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const cleanupReunitedItems = async () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const deleted = await prisma.lostFoundItem.deleteMany({
      where: {
        status: "REUNITED",
        reunitedAt: {
          lt: threeDaysAgo
        }
      }
    });
    if (deleted.count > 0) {
      console.log(`Auto-cleaned ${deleted.count} reunited items older than 3 days.`);
    }
  } catch (error) {
    console.error("Error running auto-cleanup:", error);
  }
};

const cleanupUnverifiedStudents = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await prisma.studentUser.deleteMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: twentyFourHoursAgo
        }
      }
    });
    if (deleted.count > 0) {
      console.log(`Auto-cleaned ${deleted.count} unverified student account(s) older than 24 hours.`);
    }
  } catch (error) {
    console.error("Error running unverified student auto-cleanup:", error);
  }
};

const syncRegisteredCounts = async () => {
  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        registeredCount: true,
        _count: {
          select: {
            participations: {
              where: {
                status: { not: "CANCELLED" },
              },
            },
          },
        },
      },
    });

    for (const ev of events) {
      const actual = ev._count?.participations || 0;
      if (ev.registeredCount !== actual) {
        await prisma.event.update({
          where: { id: ev.id },
          data: { registeredCount: actual },
        });
      }
    }
  } catch (error) {
    console.error("Error syncing registered counts on startup:", error);
  }
};

cleanupReunitedItems();
cleanupUnverifiedStudents();
syncRegisteredCounts();
seedPermissions();
ensureBlackoutTable();
ensureVenuesTableAndSeed();

setInterval(cleanupReunitedItems, 8 * 60 * 60 * 1000);
setInterval(cleanupUnverifiedStudents, 60 * 60 * 1000);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

