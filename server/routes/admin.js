import express from "express";
import bcrypt from "bcryptjs";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { slugifyUnique } from "../utils/slugifyUnique.js";
import { createObjectId } from "../utils/objectId.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { generateToken } from "../middleware/auth.js";
import { sendEmail } from "../emails/emailService.js";
import { getStudentRoleAndClub } from "./auth.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (admin.isTwoStepEnabled) {
      return res.status(403).json({ success: false, message: "Please use the official login route for 2FA accounts." });
    }

    const club = admin.role === "facultyCoordinator" ? await prisma.club.findFirst({ where: { facultyCoordinatorId: admin.id } }) : null;
    const token = generateToken(admin, admin.role, "admin", club?.id);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: "Admin login successful",
      admin: { ...sanitizeUser(admin), clubId: club?.id },
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get(
  "/dashboard-stats",
  verifyToken,
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  async (req, res) => {
    try {
      const adminRoles = await prisma.adminRole.findMany({ select: { email: true } });
      const excludedEmails = adminRoles.map((r) => r.email.toLowerCase());

      const [events, participations, totalStudents, totalClubs, totalEventsActive, totalEventsAll] =
        await Promise.all([
          prisma.event.findMany({
            select: {
              id: true,
              title: true,
              registrationFee: true,
              registeredCount: true,
              registrationType: true,
              registrationDeadline: true,
              startTime: true,
              organizers: {
                include: {
                  club: { select: { clubName: true } },
                },
              },
              createdBy: { select: { id: true } },
            },
          }),
          prisma.participation.findMany({
            where: { status: { in: ["REGISTERED", "ATTENDED"] } },
            select: { eventId: true, paymentStatus: true },
          }),
          prisma.studentUser.count({
            where: excludedEmails.length > 0 ? {
              NOT: {
                email: { in: excludedEmails }
              }
            } : {},
          }),
          prisma.club.count(),
          prisma.event.count({ where: { reviewStatus: "PUBLISHED" } }),
          prisma.event.count(),
        ]);

      const participationsByEvent = participations.reduce((acc, p) => {
        const current = acc.get(p.eventId) ?? [];
        current.push(p);
        acc.set(p.eventId, current);
        return acc;
      }, new Map());

      const eventStats = events.map((event) => {
        const eventParts = participationsByEvent.get(event.id) ?? [];
        const clubName = event.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "CampusNode";
        const successfulCount = eventParts.filter((p) => p.paymentStatus === "SUCCESS").length;
        const collected = successfulCount * (event.registrationFee || 0);

        return {
          eventId: event.id,
          title: event.title,
          clubName,
          creatorId: event.createdBy?.id || null,
          clubHeadId: event.createdBy?.id || null,
          registrationType: event.registrationType || "individual",
          registeredCount: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          totalCollected: collected,
          regCount: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          entryFee: event.registrationFee,
          registrationDeadline: event.registrationDeadline,
          startTime: event.startTime,
        };
      });

      const yearWiseMap = events.reduce((acc, event) => {
        const year = new Date(event.startTime).getFullYear();
        acc.set(year, (acc.get(year) ?? 0) + 1);
        return acc;
      }, new Map());

      const totalRevenue = events.reduce((sum, ev) => {
        const parts = participationsByEvent.get(ev.id) ?? [];
        const successCount = parts.filter((p) => p.paymentStatus === "SUCCESS").length;
        return sum + successCount * (ev.registrationFee || 0);
      }, 0);

      res.json({
        totalRevenue,
        totalStudents,
        totalClubs,
        totalEvents: totalEventsActive,
        totalEventsTillNow: totalEventsAll,
        yearWiseEvents: [...yearWiseMap.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([year, count]) => ({ _id: year, count })),
        eventStats,
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  },
);

router.get("/user-info/:id", verifyToken, requirePermission(PERMISSIONS.USER_VIEW), async (req, res) => {
  try {
    const student = await prisma.studentUser.findUnique({ where: { id: req.params.id } });
    if (!student) return res.status(404).json({ message: "User not found" });

    const membership = await prisma.clubMembership.findFirst({
      where: { studentId: student.id, role: "CLUB_HEAD" },
      include: {
        club: {
          select: {
            clubName: true,
          },
        },
      },
    });
    const club = membership?.club;

    res.json({
      name: student.name,
      email: student.email,
      role: membership ? "club" : "member",
      clubId: membership?.clubId ?? null,
      clubName: club?.clubName ?? null,
    });
  } catch {
    res.status(500).json({ message: "Error fetching user info" });
  }
});

router.get("/clubs-list", verifyToken, requirePermission(PERMISSIONS.CLUB_VIEW), async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      include: {
        facultyCoordinator: { select: { id: true, name: true, email: true } },
        memberships: {
          where: { role: "CLUB_HEAD" },
          select: {
            id: true,
            role: true,
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNo: true,
                branch: true,
                program: true,
                expectedGraduationYear: true,
                profileImage: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { clubName: "asc" },
    });

    res.json(
      clubs.map((club) => ({
        ...club,
        _id: club.id,
        facultyCoordinators: club.facultyCoordinator
          ? [{ ...club.facultyCoordinator, _id: club.facultyCoordinator.id }]
          : [],
      })),
    );
  } catch {
    res.status(500).json({ message: "Failed to fetch clubs" });
  }
});

router.get("/event-data-export", verifyToken, requirePermission(PERMISSIONS.AUDIT_EXPORT), async (req, res) => {
  try {
    const { month, year, clubId } = req.query;
    const where = {};

    if (clubId && clubId !== "all") {
      where.organizers = { some: { clubId } };
    }
    if (year && year !== "all") {
      const y = Number.parseInt(year, 10);
      where.startTime = {
        gte: new Date(y, 0, 1),
        lte: new Date(y, 11, 31, 23, 59, 59),
      };
    }

    let events = await prisma.event.findMany({
      where,
      include: {
        organizers: { include: { club: { select: { id: true, clubName: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    });

    if (month && month !== "all") {
      const m = Number.parseInt(month, 10);
      events = events.filter((e) => new Date(e.startTime).getMonth() + 1 === m);
    }

    const participations = await prisma.participation.findMany({
      where: {
        eventId: { in: events.length ? events.map((e) => e.id) : ["__none__"] },
        status: { in: ["REGISTERED", "ATTENDED"] },
      },
      select: { eventId: true, paymentStatus: true },
    });

    const participationsByEvent = participations.reduce((acc, p) => {
      const current = acc.get(p.eventId) ?? [];
      current.push(p);
      acc.set(p.eventId, current);
      return acc;
    }, new Map());

    res.json({
      events: events.map((event) => {
        const eventParts = participationsByEvent.get(event.id) ?? [];
        const collected = eventParts
          .filter((p) => p.paymentStatus === "SUCCESS")
          .length * (event.registrationFee || 0);
        const clubName = event.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "CampusNode";

        return {
          id: event.id,
          eventId: event.id,
          slug: event.slug,
          eventName: event.title,
          clubName,
          registrationType: event.registrationType || "individual",
          totalRegistrations: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          eventType: event.registrationFee > 0 ? "Paid" : "Free",
          entryFee: event.registrationFee || 0,
          eventDate: event.startTime,
          totalAmountReceived: collected,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to export event data" });
  }
});

router.post("/clubs", verifyToken, requirePermission(PERMISSIONS.CLUB_CREATE), async (req, res) => {
  try {
    const { clubName, facultyName, facultyEmail, clubEmail } = req.body;

    if (!clubName || !facultyName || !facultyEmail || !clubEmail) {
      return res.status(400).json({ message: "All fields are required: clubName, facultyName, facultyEmail, clubEmail" });
    }

    const trimmedClubName = clubName.trim();
    const trimmedFacultyEmail = facultyEmail.toLowerCase().trim();
    const trimmedClubEmail = clubEmail.toLowerCase().trim();
    const trimmedFacultyName = facultyName.trim();

    const existingClub = await prisma.club.findUnique({ where: { clubName: trimmedClubName } });
    if (existingClub) {
      return res.status(400).json({ message: `A club named "${trimmedClubName}" already exists.` });
    }

    // Role guard: Faculty coordinator cannot be a student account
    const studentWithFacultyEmail = await prisma.studentUser.findUnique({ where: { email: trimmedFacultyEmail } });
    if (studentWithFacultyEmail) {
      return res.status(400).json({
        message: `The email "${trimmedFacultyEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`
      });
    }

    // Uniqueness checks for clubEmail
    const existingStudent = await prisma.studentUser.findUnique({ where: { email: trimmedClubEmail } });
    if (existingStudent) {
      return res.status(400).json({ message: `A student account with email "${trimmedClubEmail}" already exists. Club email must be unique.` });
    }

    const existingAdminWithClubEmail = await prisma.adminRole.findUnique({ where: { email: trimmedClubEmail } });
    if (existingAdminWithClubEmail) {
      return res.status(400).json({ message: `An admin or faculty account with email "${trimmedClubEmail}" already exists.` });
    }

    const slug = await slugifyUnique(trimmedClubName, 'club', 'slug');
    const defaultPassword = `${slug}@him0148`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    let isNewFaculty = false;

    const result = await prisma.$transaction(async (tx) => {
      let facultyUser = await tx.adminRole.findUnique({ where: { email: trimmedFacultyEmail } });
      if (!facultyUser) {
        isNewFaculty = true;
        facultyUser = await tx.adminRole.create({
          data: {
            id: createObjectId(),
            name: trimmedFacultyName,
            email: trimmedFacultyEmail,
            password: passwordHash,
            role: "facultyCoordinator",
          },
        });
      } else {
        if (facultyUser.role !== "facultyCoordinator" && facultyUser.role !== "admin" && facultyUser.role !== "SUPER_ADMIN") {
          throw new Error(`The account "${trimmedFacultyEmail}" has role "${facultyUser.role}" and cannot be assigned as faculty coordinator.`);
        }
        if (trimmedFacultyName && facultyUser.name !== trimmedFacultyName) {
          facultyUser = await tx.adminRole.update({
            where: { id: facultyUser.id },
            data: { name: trimmedFacultyName },
          });
        }
      }

      const club = await tx.club.create({
        data: {
          id: createObjectId(),
          clubName: trimmedClubName,
          slug,
          facultyName: trimmedFacultyName,
          facultyEmail: trimmedFacultyEmail,
          clubEmail: trimmedClubEmail,
          facultyCoordinatorId: facultyUser.id,
        },
      });

      return club;
    });

    invalidatePublicResponses(["clubs*", "events*"]);

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";

    try {
      await sendEmail({
        to: trimmedFacultyEmail,
        template: "clubs:faculty-assigned",
        data: {
          facultyName: trimmedFacultyName,
          clubName: trimmedClubName,
          facultyEmail: trimmedFacultyEmail,
          defaultPassword: isNewFaculty ? defaultPassword : null,
          loginUrl: `${clientUrl}/admin-secret-login`,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send faculty notification email:", emailErr?.message || emailErr);
    }

    res.status(201).json({
      message: "Club and faculty coordinator created/assigned successfully.",
      club: { ...result, _id: result.id },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      return res.status(400).json({ message: `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists.` });
    }
    res.status(500).json({ message: error.message || "Failed to create club" });
  }
});

router.get("/coordinators", verifyToken, requirePermission(PERMISSIONS.USER_VIEW), async (req, res) => {
  try {
    const coordinators = await prisma.adminRole.findMany({
      where: { role: "facultyCoordinator" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    res.json(coordinators.map(c => ({ ...c, _id: c.id })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coordinators" });
  }
});

router.post("/coordinators", verifyToken, requirePermission(PERMISSIONS.USER_ASSIGN_ROLE), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // Check if email belongs to student account
    const studentUser = await prisma.studentUser.findUnique({ where: { email: trimmedEmail } });
    if (studentUser) {
      return res.status(400).json({
        message: `The email "${trimmedEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`
      });
    }

    const existingAdmin = await prisma.adminRole.findUnique({ where: { email: trimmedEmail } });
    if (existingAdmin) {
      return res.status(400).json({ message: `An account with email "${trimmedEmail}" already exists.` });
    }

    const passwordHash = await bcrypt.hash(password || "coordinator123", 10);

    const coordinator = await prisma.adminRole.create({
      data: {
        id: createObjectId(),
        name: trimmedName,
        email: trimmedEmail,
        password: passwordHash,
        role: "facultyCoordinator",
      },
    });

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
    const plainPassword = password || "coordinator123";

    try {
      await sendEmail({
        to: trimmedEmail,
        template: "clubs:faculty-assigned",
        data: {
          facultyName: trimmedName,
          facultyEmail: trimmedEmail,
          defaultPassword: plainPassword,
          loginUrl: `${clientUrl}/admin-secret-login`,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send coordinator welcome email:", emailErr?.message || emailErr);
    }

    res.status(201).json({
      message: "Coordinator created successfully and welcome email sent",
      coordinator: { ...coordinator, _id: coordinator.id },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create coordinator" });
  }
});

router.put("/coordinators/:id", verifyToken, requirePermission(PERMISSIONS.USER_ASSIGN_ROLE), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const data = {};
    if (name) data.name = name.trim();
    if (email) {
      const trimmedEmail = email.toLowerCase().trim();
      const studentUser = await prisma.studentUser.findUnique({ where: { email: trimmedEmail } });
      if (studentUser) {
        return res.status(400).json({
          message: `The email "${trimmedEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`
        });
      }
      const existingAdmin = await prisma.adminRole.findFirst({
        where: { email: trimmedEmail, id: { not: req.params.id } }
      });
      if (existingAdmin) {
        return res.status(400).json({ message: `An account with email "${trimmedEmail}" already exists.` });
      }
      data.email = trimmedEmail;
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const coordinator = await prisma.adminRole.update({
      where: { id: req.params.id },
      data,
    });

    // Synchronize faculty coordinator details in coordinated clubs
    await prisma.club.updateMany({
      where: { facultyCoordinatorId: req.params.id },
      data: {
        ...(data.name && { facultyName: data.name }),
        ...(data.email && { facultyEmail: data.email }),
      }
    });

    res.json({
      message: "Coordinator updated successfully",
      coordinator: { ...coordinator, _id: coordinator.id },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update coordinator" });
  }
});

router.put("/clubs/:id", verifyToken, requirePermission(PERMISSIONS.CLUB_UPDATE), async (req, res) => {
  try {
    const targetClubId = req.params.id;
    const existingClub = await prisma.club.findUnique({
      where: { id: targetClubId },
      include: { facultyCoordinator: true, account: true }
    });

    if (!existingClub) {
      return res.status(404).json({ message: "Club not found" });
    }

    const { clubName, clubEmail, facultyCoordinatorId, facultyName, facultyEmail } = req.body;
    const updates = {};

    if (clubName && clubName.trim() !== existingClub.clubName) {
      const trimmedClubName = clubName.trim();
      const duplicate = await prisma.club.findFirst({
        where: { clubName: trimmedClubName, id: { not: targetClubId } }
      });
      if (duplicate) {
        return res.status(400).json({ message: `A club named "${trimmedClubName}" already exists.` });
      }
      updates.clubName = trimmedClubName;
      updates.slug = await slugifyUnique(trimmedClubName, 'club', 'slug', targetClubId);
    }

    // Handle Faculty Coordinator Assignment / Reassignment
    if (facultyEmail !== undefined || facultyCoordinatorId !== undefined || facultyName !== undefined) {
      const trimmedFacultyEmail = facultyEmail ? facultyEmail.toLowerCase().trim() : (existingClub.facultyEmail || existingClub.facultyCoordinator?.email);
      const trimmedFacultyName = facultyName ? facultyName.trim() : (existingClub.facultyName || existingClub.facultyCoordinator?.name || "Faculty Coordinator");

      if (trimmedFacultyEmail) {
        // Validation: Cannot be a student account
        const studentWithEmail = await prisma.studentUser.findUnique({ where: { email: trimmedFacultyEmail } });
        if (studentWithEmail) {
          return res.status(400).json({
            message: `The email "${trimmedFacultyEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`
          });
        }

        let facultyUser = await prisma.adminRole.findUnique({ where: { email: trimmedFacultyEmail } });
        let isNewFaculty = false;

        if (facultyUser) {
          if (facultyUser.role !== "facultyCoordinator" && facultyUser.role !== "admin" && facultyUser.role !== "SUPER_ADMIN") {
            return res.status(400).json({
              message: `The account "${trimmedFacultyEmail}" has role "${facultyUser.role}" and cannot be assigned as faculty coordinator.`
            });
          }
          if (trimmedFacultyName && facultyUser.name !== trimmedFacultyName) {
            facultyUser = await prisma.adminRole.update({
              where: { id: facultyUser.id },
              data: { name: trimmedFacultyName }
            });
          }
        } else {
          isNewFaculty = true;
          const slug = updates.slug || existingClub.slug || "club";
          const defaultPassword = `${slug}@him0148`;
          const passwordHash = await bcrypt.hash(defaultPassword, 10);
          facultyUser = await prisma.adminRole.create({
            data: {
              id: createObjectId(),
              name: trimmedFacultyName,
              email: trimmedFacultyEmail,
              password: passwordHash,
              role: "facultyCoordinator"
            }
          });

          const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
          try {
            await sendEmail({
              to: trimmedFacultyEmail,
              template: "clubs:faculty-assigned",
              data: {
                facultyName: trimmedFacultyName,
                clubName: updates.clubName || existingClub.clubName,
                facultyEmail: trimmedFacultyEmail,
                defaultPassword,
                loginUrl: `${clientUrl}/admin-secret-login`,
              },
            });
          } catch (emailErr) {
            console.error("Failed to send faculty email:", emailErr?.message || emailErr);
          }
        }

        updates.facultyCoordinatorId = facultyUser.id;
        updates.facultyEmail = trimmedFacultyEmail;
        updates.facultyName = trimmedFacultyName;
      } else if (facultyCoordinatorId) {
        const facultyUser = await prisma.adminRole.findUnique({ where: { id: facultyCoordinatorId } });
        if (!facultyUser) {
          return res.status(400).json({ message: "Faculty coordinator account not found." });
        }
        updates.facultyCoordinatorId = facultyUser.id;
        updates.facultyEmail = facultyUser.email;
        updates.facultyName = trimmedFacultyName || facultyUser.name;
      }
    }

    // Handle Club Email Change
    if (clubEmail !== undefined) {
      const trimmedClubEmail = clubEmail.toLowerCase().trim();
      if (trimmedClubEmail && trimmedClubEmail !== existingClub.clubEmail) {
        const studentConflict = await prisma.studentUser.findUnique({ where: { email: trimmedClubEmail } });
        if (studentConflict) {
          return res.status(400).json({ message: `A student account with email "${trimmedClubEmail}" already exists.` });
        }
        const adminConflict = await prisma.adminRole.findUnique({ where: { email: trimmedClubEmail } });
        if (adminConflict) {
          return res.status(400).json({ message: `An admin or faculty account with email "${trimmedClubEmail}" already exists.` });
        }
        updates.clubEmail = trimmedClubEmail;
      }
    }

    const updatedClub = await prisma.club.update({
      where: { id: targetClubId },
      data: updates,
      include: {
        facultyCoordinator: { select: { id: true, name: true, email: true } },
      }
    });

    invalidatePublicResponses(["clubs*", "events*"]);

    res.json({
      message: "Club updated successfully",
      club: { ...updatedClub, _id: updatedClub.id },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: "A record with these details already exists." });
    }
    res.status(500).json({ message: err.message || "Failed to update club" });
  }
});

router.delete("/clubs/:id", verifyToken, requirePermission(PERMISSIONS.CLUB_DELETE), async (req, res) => {
  try {
    const clubId = req.params.id;
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        organizedEvents: { select: { eventId: true } },
      }
    });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const eventIds = club.organizedEvents.map((oe) => oe.eventId);

    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications related to club events
      if (eventIds.length > 0) {
        await tx.notification.deleteMany({
          where: { eventId: { in: eventIds } }
        });
      }

      // 2. Delete media and sponsors linked to club or its events
      await tx.media.deleteMany({
        where: {
          OR: [
            { clubId },
            ...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : [])
          ]
        }
      });

      await tx.sponsor.deleteMany({
        where: {
          OR: [
            { clubId },
            ...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : [])
          ]
        }
      });

      // 3. Remove event organizer relations
      await tx.eventOrganizer.deleteMany({ where: { clubId } });

      // Clean up orphaned events (events with no remaining organizers)
      if (eventIds.length > 0) {
        for (const eventId of eventIds) {
          const remaining = await tx.eventOrganizer.count({ where: { eventId } });
          if (remaining === 0) {
            await tx.attendanceRecord.deleteMany({ where: { eventId } });
            await tx.eventFeedback.deleteMany({ where: { eventId } });
            await tx.participation.deleteMany({ where: { eventId } });
            await tx.teamMember.deleteMany({ where: { team: { eventId } } });
            await tx.team.deleteMany({ where: { eventId } });
            await tx.featuredEvent.deleteMany({ where: { eventId } });
            await tx.certificate.deleteMany({ where: { eventId } });
            await tx.event.delete({ where: { id: eventId } });
          }
        }
      }

      // 4. Delete club specific relations
      await tx.clubSocialLink.deleteMany({ where: { clubId } });
      await tx.clubAnnouncement.deleteMany({ where: { clubId } });
      await tx.clubAchievement.deleteMany({ where: { clubId } });
      await tx.clubMembership.deleteMany({ where: { clubId } });

      // 5. Delete the club record
      await tx.club.delete({
        where: { id: clubId }
      });
    });

    invalidatePublicResponses(["clubs*", "events*"]);

    res.json({ message: `Club "${club.clubName}" and all associated data have been deleted successfully.` });
  } catch (err) {
    console.error("Delete club error:", err);
    res.status(500).json({ message: err.message || "Failed to delete club" });
  }
});

router.get("/manual-payments", verifyToken, requirePermission(PERMISSIONS.PAYMENT_VERIFY), async (req, res) => {
  try {
    const participations = await prisma.participation.findMany({
      where: {
        event: {
          registrationFee: { gt: 0 },
        },
      },
      include: {
        event: {
          select: {
            title: true,
            registrationFee: true,
            registrationType: true,
            minTeamSize: true,
            maxTeamSize: true,
            collegePaymentUrl: true,
            organizers: {
              include: {
                club: { select: { clubName: true } },
              },
            },
          },
        },
        student: {
          select: {
            name: true,
            email: true,
            rollNo: true,
          },
        },
        externalUser: {
          select: {
            name: true,
            email: true,
          },
        },
        team: {
          include: {
            leaderStudent: { select: { id: true, name: true, email: true, rollNo: true } },
            members: {
              include: {
                student: { select: { id: true, name: true, email: true, rollNo: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const processedMap = new Map();
    const resultList = [];

    for (const p of participations) {
      const clubName = p.event?.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "CampusNode";
      const fee = p.event?.registrationFee || 0;

      if (p.teamId) {
        if (!processedMap.has(p.teamId)) {
          processedMap.set(p.teamId, [p]);
        } else {
          processedMap.get(p.teamId).push(p);
        }
      } else {
        resultList.push({
          id: p.id,
          eventId: p.eventId,
          eventName: p.event?.title || "Event",
          clubName,
          eventRegistrationType: p.event?.registrationType || "individual",
          eventMinTeamSize: p.event?.minTeamSize || 1,
          eventMaxTeamSize: p.event?.maxTeamSize || 1,
          eventPaymentMethod: p.event?.collegePaymentUrl ? "COLLEGE_LINK" : "MANUAL",
          isTeam: (p.event?.registrationType === "team" || p.event?.registrationType === "both"),
          teamId: null,
          teamName: p.formResponses?.teamName || p.formResponses?.['Team Name'] || null,
          teamMemberCount: 1,
          teamMembers: [],
          studentName: p.student?.name || p.externalUser?.name || "Unknown",
          studentEmail: p.student?.email || p.externalUser?.email || "N/A",
          studentRollNo: p.student?.rollNo || "N/A",
          transactionId: p.transactionId || null,
          payerName: p.payerName || null,
          paymentRemarks: p.paymentRemarks || null,
          paymentStatus: p.paymentStatus,
          amountPaid: fee,
          createdAt: p.createdAt,
        });
      }
    }

    for (const [teamId, teamParts] of processedMap.entries()) {
      const primaryP = teamParts.find(tp => tp.transactionId) || 
                       teamParts.find(tp => tp.studentId && tp.studentId === tp.team?.leaderStudentId) || 
                       teamParts[0];

      const team = primaryP.team;
      const clubName = primaryP.event?.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "CampusNode";
      const fee = primaryP.event?.registrationFee || 0;
      
      const teamMembers = (team?.members || []).map(m => ({
        name: m.student?.name || "Unknown",
        email: m.student?.email || "N/A",
        rollNo: m.student?.rollNo || "N/A",
        role: m.role || "member"
      }));

      resultList.push({
        id: primaryP.id,
        eventId: primaryP.eventId,
        eventName: primaryP.event?.title || "Event",
        clubName,
        eventRegistrationType: primaryP.event?.registrationType || "team",
        eventMinTeamSize: primaryP.event?.minTeamSize || 2,
        eventMaxTeamSize: primaryP.event?.maxTeamSize || 4,
        eventPaymentMethod: primaryP.event?.collegePaymentUrl ? "COLLEGE_LINK" : "MANUAL",
        isTeam: true,
        teamId: teamId,
        teamName: team?.teamName || primaryP.formResponses?.teamName || "Team",
        teamMemberCount: teamMembers.length || teamParts.length,
        teamMembers,
        leaderName: team?.leaderStudent?.name || primaryP.student?.name || "Team Leader",
        studentName: team?.leaderStudent?.name || primaryP.student?.name || "Team Leader",
        studentEmail: team?.leaderStudent?.email || primaryP.student?.email || "N/A",
        studentRollNo: team?.leaderStudent?.rollNo || primaryP.student?.rollNo || "N/A",
        transactionId: primaryP.transactionId || null,
        payerName: primaryP.payerName || null,
        paymentRemarks: primaryP.paymentRemarks || null,
        paymentStatus: primaryP.paymentStatus,
        amountPaid: fee,
        createdAt: primaryP.createdAt,
      });
    }

    resultList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const summary = {
      total: resultList.length,
      pending: resultList.filter((p) => p.paymentStatus === "PENDING").length,
      approved: resultList.filter((p) => p.paymentStatus === "SUCCESS").length,
      rejected: resultList.filter((p) => p.paymentStatus === "FAILED").length,
    };

    res.json({
      participations: resultList,
      summary,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch manual payments overview", error: err.message });
  }
});

import { createAuditLog, AUDIT_ACTIONS } from "../utils/auditLog.js";

// ==========================================
// CLUB HEAD ASSIGNMENT (Admin routes)
// ==========================================

router.get("/clubs/:id/club-head", verifyToken, allowRoles("admin", "SUPER_ADMIN"), async (req, res) => {
  try {
    const headMembership = await prisma.clubMembership.findFirst({
      where: { clubId: req.params.id, role: "CLUB_HEAD" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNo: true,
            branch: true,
            expectedGraduationYear: true,
            program: true,
            profileImage: true,
          },
        },
      },
    });
    res.json({ clubHead: headMembership?.student || null, membership: headMembership || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/clubs/:id/club-head", verifyToken, allowRoles("admin", "SUPER_ADMIN"), async (req, res) => {
  try {
    const { studentId, studentEmail } = req.body;
    const clubId = req.params.id;

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    const studentSelect = {
      id: true,
      name: true,
      email: true,
      rollNo: true,
      branch: true,
      expectedGraduationYear: true,
      program: true,
      profileImage: true,
    };

    let student = null;
    if (studentId) {
      student = await prisma.studentUser.findUnique({ where: { id: studentId }, select: studentSelect });
    } else if (studentEmail) {
      student = await prisma.studentUser.findUnique({ where: { email: studentEmail.trim().toLowerCase() }, select: studentSelect });
    }

    if (!student) return res.status(404).json({ message: "Student not found." });

    // Enforce invariant: A student can be CLUB_HEAD of at most ONE club
    const existingOtherHead = await prisma.clubMembership.findFirst({
      where: {
        studentId: student.id,
        role: "CLUB_HEAD",
        clubId: { not: clubId },
      },
      include: { club: { select: { id: true, clubName: true } } },
    });

    if (existingOtherHead) {
      return res.status(409).json({
        message: `${student.name} is already the Club Head of "${existingOtherHead.club.clubName}". A student can be the Head of only one club at a time. They can still be a Coordinator of other clubs.`,
      });
    }

    const membership = await prisma.$transaction(async (tx) => {
      await tx.clubMembership.updateMany({
        where: { clubId, role: "CLUB_HEAD" },
        data: { role: "MEMBER" },
      });

      const existingMember = await tx.clubMembership.findUnique({
        where: {
          clubId_studentId: {
            clubId,
            studentId: student.id,
          },
        },
      });

      if (existingMember) {
        return await tx.clubMembership.update({
          where: { id: existingMember.id },
          data: {
            role: "CLUB_HEAD",
            canTakeAttendance: true,
            canEditEvents: true,
          },
        });
      } else {
        return await tx.clubMembership.create({
          data: {
            id: createObjectId(),
            clubId,
            studentId: student.id,
            role: "CLUB_HEAD",
            canTakeAttendance: true,
            canEditEvents: true,
          },
        });
      }
    });

    invalidatePublicResponses(["clubs*"]);

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
    try {
      await sendEmail({
        to: student.email,
        template: "clubs:student-head-assigned",
        data: {
          studentName: student.name,
          studentEmail: student.email,
          rollNo: student.rollNo,
          clubName: club.clubName,
          dashboardUrl: `${clientUrl}/clubs/${club.slug || club.id}`,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send student club head assignment email:", emailErr?.message || emailErr);
    }

    res.json({
      message: `Assigned ${student.name} as Club Head for ${club.clubName}`,
      clubHead: student,
      membership,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/clubs/:id/club-head", verifyToken, allowRoles("admin", "SUPER_ADMIN"), async (req, res) => {
  try {
    const clubId = req.params.id;
    await prisma.clubMembership.updateMany({
      where: { clubId, role: "CLUB_HEAD" },
      data: { role: "MEMBER" },
    });

    invalidatePublicResponses(["clubs*"]);
    res.json({ message: "Club Head revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/search", verifyToken, allowRoles("admin", "SUPER_ADMIN"), async (req, res) => {
  try {
    const rawQuery = req.query.q || req.query.query;
    if (!rawQuery || String(rawQuery).trim().length < 1) {
      return res.json({ students: [] });
    }

    const query = String(rawQuery).trim();

    const admins = await prisma.adminRole.findMany({ select: { email: true } });
    const excludedEmails = admins.map((a) => (a.email ? a.email.toLowerCase() : "")).filter(Boolean);

    const students = await prisma.studentUser.findMany({
      where: {
        email: { notIn: excludedEmails },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { rollNo: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        branch: true,
        expectedGraduationYear: true,
        program: true,
      },
      take: 10,
    });

    const enriched = await Promise.all(
      students.map(async (s) => {
        const progress = calculateAcademicProgress(s);
        const headship = await prisma.clubMembership.findFirst({
          where: { studentId: s.id, role: "CLUB_HEAD" },
          include: { club: { select: { id: true, clubName: true } } },
        });
        return {
          ...s,
          year: progress.academicYearLabel,
          academicYear: progress.academicYear,
          academicYearLabel: progress.academicYearLabel,
          semester: progress.semester,
          semesterLabel: progress.semesterLabel,
          currentHeadClub: headship ? headship.club : null,
        };
      })
    );

    res.json({ students: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
