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
import { deleteImage, extractCloudinaryPublicId } from "../utils/cloudinary.js";
import { withSpan, setSpanAttribute } from "../lib/telemetry/tracer.js";
import { canAssignClubHead } from "../controllers/clubMemberController.js";
import { BRANCH_FULL_NAMES, ALL_BRANCH_CODES, PROGRAM_OPTIONS, PROGRAM_LABELS } from "../constants/academicConstants.js";

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
    return withSpan("admin.dashboard", { "admin.view": "dashboard-stats" }, async (span) => {
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
          const clubName = event.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "Campusnode";
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
    });
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
        facultyCoordinator: { select: { id: true, name: true, email: true, department: true } },
        facultyCoordinators: {
          include: {
            faculty: {
              select: { id: true, name: true, email: true, department: true, designation: true },
            },
          },
        },
        memberships: {
          where: { role: "CLUB_HEAD" },
          select: {
            id: true,
            role: true,
            position: true,
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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
      clubs.map((club) => {
        const coordinatorsMap = new Map();
        if (club.facultyCoordinator) {
          coordinatorsMap.set(club.facultyCoordinator.id, {
            ...club.facultyCoordinator,
            _id: club.facultyCoordinator.id,
          });
        }
        if (Array.isArray(club.facultyCoordinators)) {
          for (const item of club.facultyCoordinators) {
            if (item.faculty && !coordinatorsMap.has(item.faculty.id)) {
              coordinatorsMap.set(item.faculty.id, {
                ...item.faculty,
                _id: item.faculty.id,
              });
            }
          }
        }
        const distinctCoordinators = Array.from(coordinatorsMap.values());

        return {
          ...club,
          _id: club.id,
          facultyCoordinators: distinctCoordinators,
        };
      }),
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
        const clubName = event.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "Campusnode";

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

    if (!clubName || !clubEmail) {
      return res.status(400).json({ message: "Club Name and Club Email are required." });
    }

    const trimmedClubName = clubName.trim();
    const trimmedClubEmail = clubEmail.toLowerCase().trim();
    const trimmedFacultyEmail = facultyEmail ? facultyEmail.toLowerCase().trim() : null;
    const trimmedFacultyName = facultyName ? facultyName.trim() : null;

    const existingClub = await prisma.club.findUnique({ where: { clubName: trimmedClubName } });
    if (existingClub) {
      return res.status(400).json({ message: `A club named "${trimmedClubName}" already exists.` });
    }

    // Role guard: Faculty coordinator cannot be a student account
    if (trimmedFacultyEmail) {
      const studentWithFacultyEmail = await prisma.studentUser.findUnique({ where: { email: trimmedFacultyEmail } });
      if (studentWithFacultyEmail) {
        return res.status(400).json({
          message: `The email "${trimmedFacultyEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`
        });
      }
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

    const result = await prisma.$transaction(async (tx) => {
      let facultyUser = null;
      if (trimmedFacultyEmail) {
        facultyUser = await tx.facultyUser.findFirst({
          where: { email: { equals: trimmedFacultyEmail, mode: "insensitive" } },
        });
        if (!facultyUser) {
          throw new Error(
            `No registered faculty account found with email "${trimmedFacultyEmail}". The faculty coordinator must have an active faculty account on Campusnode before being assigned to a club.`
          );
        }

        const existingCoord = await tx.clubFacultyCoordinator.findFirst({
          where: { facultyId: facultyUser.id },
          include: { club: { select: { id: true, clubName: true } } },
        });
        const existingLegacy = !existingCoord
          ? await tx.club.findFirst({
            where: { facultyCoordinatorId: facultyUser.id },
            select: { id: true, clubName: true },
          })
          : null;

        const assignedClub = existingCoord?.club || existingLegacy;
        if (assignedClub) {
          throw new Error(
            `${facultyUser.name} (${facultyUser.email}) is already the Faculty Coordinator for "${assignedClub.clubName}". A faculty member can be the faculty coordinator for only one club at a time.`
          );
        }

        if (trimmedFacultyName && facultyUser.name !== trimmedFacultyName) {
          facultyUser = await tx.facultyUser.update({
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
          facultyName: facultyUser ? (facultyUser.name || trimmedFacultyName) : null,
          facultyEmail: facultyUser ? (facultyUser.email || trimmedFacultyEmail) : null,
          clubEmail: trimmedClubEmail,
          facultyCoordinatorId: facultyUser ? facultyUser.id : null,
        },
      });

      if (facultyUser) {
        await tx.clubFacultyCoordinator.create({
          data: {
            id: createObjectId(),
            clubId: club.id,
            facultyId: facultyUser.id,
          },
        });
      }

      return { club, facultyUser };
    });

    invalidatePublicResponses(["clubs*", "events*"]);

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";

    if (result.facultyUser && trimmedFacultyEmail) {
      try {
        await sendEmail({
          to: trimmedFacultyEmail,
          template: "clubs:faculty-assigned",
          data: {
            facultyName: result.facultyUser.name || trimmedFacultyName,
            clubName: trimmedClubName,
            facultyEmail: trimmedFacultyEmail,
            defaultPassword: null,
            loginUrl: `${clientUrl}/login`,
            dashboardUrl: `${clientUrl}/clubs/${slug}`,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send faculty notification email:", emailErr?.message || emailErr);
      }
    }

    res.status(201).json({
      message: result.facultyUser
        ? "Club created and Faculty Coordinator assigned successfully."
        : "Club created successfully.",
      club: { ...result.club, _id: result.club.id },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');
      if (targetStr.includes('facultyId')) {
        return res.status(409).json({ message: "This faculty member is already the faculty coordinator for another club. A faculty member can only coordinate one club at a time." });
      }
      return res.status(400).json({ message: `A record with this ${targetStr || 'value'} already exists.` });
    }
    if (error.message && error.message.includes("No registered faculty account found")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message && error.message.includes("already the Faculty Coordinator")) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Failed to create club" });
  }
});

router.get("/coordinators", verifyToken, requirePermission(PERMISSIONS.USER_VIEW), async (req, res) => {
  try {
    const coordinators = await prisma.facultyUser.findMany({
      select: { id: true, name: true, email: true, department: true },
      orderBy: { name: "asc" },
    });

    res.json(coordinators.map(c => ({ ...c, _id: c.id })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coordinators" });
  }
});

router.post("/coordinators", verifyToken, requirePermission(PERMISSIONS.USER_ASSIGN_ROLE), async (req, res) => {
  return res.status(400).json({
    message: "Faculty coordinators cannot be manually created. Faculty members must register their own accounts on Campusnode, and then be assigned to clubs."
  });
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
      const existingFaculty = await prisma.facultyUser.findFirst({
        where: { email: trimmedEmail, id: { not: req.params.id } }
      });
      if (existingFaculty) {
        return res.status(400).json({ message: `An account with email "${trimmedEmail}" already exists.` });
      }
      data.email = trimmedEmail;
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (req.body.department) {
      data.department = String(req.body.department).trim();
    }

    const coordinator = await prisma.facultyUser.update({
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
      include: { facultyCoordinator: true }
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

        let facultyUser = await prisma.facultyUser.findFirst({
          where: { email: { equals: trimmedFacultyEmail, mode: "insensitive" } },
        });
        let isNewFaculty = false;

        if (facultyUser) {
          const existingCoord = await prisma.clubFacultyCoordinator.findFirst({
            where: { facultyId: facultyUser.id, clubId: { not: targetClubId } },
            include: { club: { select: { id: true, clubName: true } } },
          });
          const existingLegacy = !existingCoord
            ? await prisma.club.findFirst({
              where: { facultyCoordinatorId: facultyUser.id, id: { not: targetClubId } },
              select: { id: true, clubName: true },
            })
            : null;

          const assignedClub = existingCoord?.club || existingLegacy;
          if (assignedClub) {
            return res.status(409).json({
              message: `${facultyUser.name} (${facultyUser.email}) is already the Faculty Coordinator for "${assignedClub.clubName}". A faculty member can be the faculty coordinator for only one club at a time.`,
            });
          }

          if (trimmedFacultyName && facultyUser.name !== trimmedFacultyName) {
            facultyUser = await prisma.facultyUser.update({
              where: { id: facultyUser.id },
              data: { name: trimmedFacultyName }
            });
          }
        } else {
          return res.status(404).json({
            message: `No registered faculty account found with email "${trimmedFacultyEmail}". The faculty member must already have an account on Campusnode.`,
          });
        }

        updates.facultyCoordinatorId = facultyUser.id;
        updates.facultyEmail = trimmedFacultyEmail;
        updates.facultyName = trimmedFacultyName;

        const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
        try {
          await sendEmail({
            to: trimmedFacultyEmail,
            template: "clubs:faculty-assigned",
            data: {
              facultyName: trimmedFacultyName,
              clubName: updates.clubName || existingClub.clubName,
              facultyEmail: trimmedFacultyEmail,
              defaultPassword: null,
              loginUrl: `${clientUrl}/login`,
              dashboardUrl: `${clientUrl}/clubs/${updates.slug || existingClub.slug || targetClubId}`,
            },
          });
        } catch (emailErr) {
          console.error("Failed to send faculty email:", emailErr?.message || emailErr);
        }

        await prisma.clubFacultyCoordinator.upsert({
          where: {
            facultyId: facultyUser.id,
          },
          update: {
            clubId: targetClubId,
          },
          create: {
            id: createObjectId(),
            clubId: targetClubId,
            facultyId: facultyUser.id,
          },
        });
      } else if (facultyCoordinatorId) {
        const facultyUser = await prisma.facultyUser.findUnique({ where: { id: facultyCoordinatorId } });
        if (!facultyUser) {
          return res.status(400).json({ message: "Faculty coordinator account not found." });
        }

        const existingCoord = await prisma.clubFacultyCoordinator.findFirst({
          where: { facultyId: facultyUser.id, clubId: { not: targetClubId } },
          include: { club: { select: { id: true, clubName: true } } },
        });
        const existingLegacy = !existingCoord
          ? await prisma.club.findFirst({
            where: { facultyCoordinatorId: facultyUser.id, id: { not: targetClubId } },
            select: { id: true, clubName: true },
          })
          : null;

        const assignedClub = existingCoord?.club || existingLegacy;
        if (assignedClub) {
          return res.status(409).json({
            message: `${facultyUser.name} (${facultyUser.email}) is already the Faculty Coordinator for "${assignedClub.clubName}". A faculty member can be the faculty coordinator for only one club at a time.`,
          });
        }

        updates.facultyCoordinatorId = facultyUser.id;
        updates.facultyEmail = facultyUser.email;
        updates.facultyName = trimmedFacultyName || facultyUser.name;

        await prisma.clubFacultyCoordinator.upsert({
          where: {
            facultyId: facultyUser.id,
          },
          update: {
            clubId: targetClubId,
          },
          create: {
            id: createObjectId(),
            clubId: targetClubId,
            facultyId: facultyUser.id,
          },
        });
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
    const imagesToDelete = [];
    if (club.bannerImage) imagesToDelete.push(club.bannerImage);
    if (club.clubLogo) imagesToDelete.push(club.clubLogo);

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

      if (eventIds.length > 0) {
        await tx.sponsor.deleteMany({
          where: {
            eventId: { in: eventIds }
          }
        });
      }

      // 3. Remove event organizer relations
      await tx.eventOrganizer.deleteMany({ where: { clubId } });

      // Clean up orphaned events (events with no remaining organizers)
      if (eventIds.length > 0) {
        for (const eventId of eventIds) {
          const remaining = await tx.eventOrganizer.count({ where: { eventId } });
          if (remaining === 0) {
            const ev = await tx.event.findUnique({ where: { id: eventId }, select: { imageUrl: true } });
            if (ev?.imageUrl) imagesToDelete.push(ev.imageUrl);

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

    // Clean up Cloudinary assets
    for (const imgUrl of imagesToDelete) {
      const publicId = extractCloudinaryPublicId(imgUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (delErr) {
          console.warn("Failed to delete Cloudinary asset during club deletion:", delErr.message);
        }
      }
    }

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
      const clubName = p.event?.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "Campusnode";
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
      const clubName = primaryP.event?.organizers?.map((o) => o.club?.clubName).filter(Boolean).join(", ") || "Campusnode";
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

const requireClubLeadManager = async (req, res, next) => {
  const allowed = await canAssignClubHead(req, req.params.id);
  if (!allowed) {
    return res.status(403).json({ message: "Access denied. Only administrators and assigned faculty coordinators can manage club lead." });
  }
  next();
};

// ==========================================
// CLUB HEAD ASSIGNMENT (Admin & Faculty Coordinator)
// ==========================================

router.get("/clubs/:id/club-head", verifyToken, requireClubLeadManager, async (req, res) => {
  try {
    const headMembership = await prisma.clubMembership.findFirst({
      where: { clubId: req.params.id, role: "CLUB_HEAD" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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

router.post("/clubs/:id/club-head", verifyToken, requireClubLeadManager, async (req, res) => {
  try {
    const { studentId, studentEmail, position } = req.body;
    const clubId = req.params.id;

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    const studentSelect = {
      id: true,
      name: true,
      email: true,
      phone: true,
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
        message: `${student.name} is already a lead of another club ("${existingOtherHead.club.clubName}"). A student can be the Student Lead of only one club or society at a time.`,
      });
    }

    const sanitizedPosition = typeof position === "string" && position.trim().length > 0
      ? position.trim().slice(0, 100)
      : (position === null ? null : undefined);

    const membership = await prisma.$transaction(async (tx) => {
      await tx.clubMembership.updateMany({
        where: { clubId, role: "CLUB_HEAD" },
        data: { role: "MEMBER", position: null },
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
        const updateData = {
          role: "CLUB_HEAD",
          canTakeAttendance: true,
          canEditEvents: true,
        };
        if (sanitizedPosition !== undefined) {
          updateData.position = sanitizedPosition;
        }
        return await tx.clubMembership.update({
          where: { id: existingMember.id },
          data: updateData,
        });
      } else {
        return await tx.clubMembership.create({
          data: {
            id: createObjectId(),
            clubId,
            studentId: student.id,
            role: "CLUB_HEAD",
            position: sanitizedPosition !== undefined ? sanitizedPosition : null,
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

router.delete("/clubs/:id/club-head", verifyToken, requireClubLeadManager, async (req, res) => {
  try {
    const clubId = req.params.id;
    await prisma.clubMembership.updateMany({
      where: { clubId, role: "CLUB_HEAD" },
      data: { role: "MEMBER", position: null },
    });

    invalidatePublicResponses(["clubs*"]);
    res.json({ message: "Club Head revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// CLUB FACULTY COORDINATOR ROUTES (Multi-coordinator)
// ==========================================

router.post("/clubs/:id/coordinators", verifyToken, requirePermission(PERMISSIONS.CLUB_UPDATE), async (req, res) => {
  try {
    const clubId = req.params.id;
    const { facultyId, facultyEmail, facultyName, department } = req.body;

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    let faculty = null;

    if (facultyId) {
      faculty = await prisma.facultyUser.findUnique({ where: { id: facultyId } });
    } else if (facultyEmail) {
      const trimmedEmail = facultyEmail.toLowerCase().trim();
      const studentUser = await prisma.studentUser.findUnique({ where: { email: trimmedEmail } });
      if (studentUser) {
        return res.status(400).json({
          message: `The email "${trimmedEmail}" belongs to a registered student account. Student accounts cannot be assigned as faculty coordinators.`,
        });
      }

      faculty = await prisma.facultyUser.findFirst({
        where: { email: { equals: trimmedEmail, mode: "insensitive" } },
      });
    }

    if (!faculty) {
      return res.status(404).json({
        message: "No registered faculty account found. The faculty member must already have an account on Campusnode before being assigned as coordinator.",
      });
    }

    // Check if faculty already coordinates any club
    const existingCoordination = await prisma.clubFacultyCoordinator.findFirst({
      where: {
        facultyId: faculty.id,
      },
      include: {
        club: { select: { id: true, clubName: true } },
      },
    });

    const existingLegacy = !existingCoordination
      ? await prisma.club.findFirst({
        where: { facultyCoordinatorId: faculty.id },
        select: { id: true, clubName: true },
      })
      : null;

    const assignedClub = existingCoordination?.club || existingLegacy;
    if (assignedClub) {
      if (String(assignedClub.id) === String(clubId)) {
        return res.status(400).json({
          message: `${faculty.name || "This faculty member"} is already assigned as a coordinator for ${club.clubName}.`,
        });
      }
      return res.status(409).json({
        message: `${faculty.name || "This faculty member"} (${faculty.email}) is already the Faculty Coordinator for "${assignedClub.clubName}". A faculty member can be the faculty coordinator for only one club at a time.`,
      });
    }

    await prisma.clubFacultyCoordinator.upsert({
      where: {
        facultyId: faculty.id,
      },
      update: {
        clubId,
      },
      create: {
        id: createObjectId(),
        clubId,
        facultyId: faculty.id,
      },
    });

    if (!club.facultyCoordinatorId) {
      await prisma.club.update({
        where: { id: clubId },
        data: {
          facultyCoordinatorId: faculty.id,
          facultyName: faculty.name,
          facultyEmail: faculty.email,
        },
      });
    }

    invalidatePublicResponses(["clubs*"]);

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
    try {
      await sendEmail({
        to: faculty.email,
        template: "clubs:faculty-assigned",
        data: {
          facultyName: faculty.name,
          clubName: club.clubName,
          facultyEmail: faculty.email,
          defaultPassword: null,
          loginUrl: `${clientUrl}/login`,
          dashboardUrl: `${clientUrl}/clubs/${club.slug || club.id}`,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send faculty appointment email:", emailErr?.message || emailErr);
    }

    const allCoordinators = await prisma.clubFacultyCoordinator.findMany({
      where: { clubId },
      include: {
        faculty: {
          select: { id: true, name: true, email: true, department: true, designation: true },
        },
      },
    });

    res.json({
      message: `Assigned ${faculty.name} as Faculty Coordinator for ${club.clubName}`,
      coordinator: faculty,
      facultyCoordinators: allCoordinators.map((c) => ({ ...c.faculty, _id: c.faculty.id })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/clubs/:id/coordinators/:facultyId", verifyToken, requirePermission(PERMISSIONS.CLUB_UPDATE), async (req, res) => {
  try {
    const clubId = req.params.id;
    const facultyId = req.params.facultyId;

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    await prisma.clubFacultyCoordinator.deleteMany({
      where: {
        clubId,
        facultyId,
      },
    });

    if (club.facultyCoordinatorId === facultyId) {
      const remaining = await prisma.clubFacultyCoordinator.findFirst({
        where: { clubId },
        include: { faculty: true },
      });

      if (remaining && remaining.faculty) {
        await prisma.club.update({
          where: { id: clubId },
          data: {
            facultyCoordinatorId: remaining.faculty.id,
            facultyName: remaining.faculty.name,
            facultyEmail: remaining.faculty.email,
          },
        });
      } else {
        await prisma.club.update({
          where: { id: clubId },
          data: {
            facultyCoordinatorId: null,
            facultyName: null,
            facultyEmail: null,
          },
        });
      }
    }

    invalidatePublicResponses(["clubs*"]);

    const allCoordinators = await prisma.clubFacultyCoordinator.findMany({
      where: { clubId },
      include: {
        faculty: {
          select: { id: true, name: true, email: true, department: true, designation: true },
        },
      },
    });

    res.json({
      message: "Faculty Coordinator removed from club successfully.",
      facultyCoordinators: allCoordinators.map((c) => ({ ...c.faculty, _id: c.faculty.id })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/search", verifyToken, allowRoles("admin", "SUPER_ADMIN", "facultyCoordinator", "faculty"), async (req, res) => {
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
        phone: true,
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

router.get("/faculty/search", verifyToken, allowRoles("admin", "SUPER_ADMIN", "facultyCoordinator", "faculty"), async (req, res) => {
  try {
    const rawQuery = req.query.q || req.query.query;
    if (!rawQuery || String(rawQuery).trim().length < 1) {
      return res.json({ faculty: [] });
    }

    const query = String(rawQuery).trim();

    const facultyList = await prisma.facultyUser.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { department: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        coordinatedClubs: {
          select: { id: true, clubName: true },
        },
        clubCoordinators: {
          select: { club: { select: { id: true, clubName: true } } },
        },
      },
      take: 15,
    });

    const enriched = facultyList.map((fac) => {
      const clubsMap = new Map();
      (fac.coordinatedClubs || []).forEach((c) => clubsMap.set(c.id, c));
      (fac.clubCoordinators || []).forEach((cc) => {
        if (cc.club) clubsMap.set(cc.club.id, cc.club);
      });
      const coordinatedClubs = Array.from(clubsMap.values());
      return {
        id: fac.id,
        _id: fac.id,
        name: fac.name,
        email: fac.email,
        department: fac.department,
        designation: fac.designation,
        coordinatedClubs,
        currentCoordinatedClub: coordinatedClubs[0] || null,
      };
    });

    res.json({ faculty: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// STUDENT DIRECTORY & ADVANCED SEARCH (ADMIN)
// ==========================================

router.get("/students", verifyToken, allowRoles("admin", "SUPER_ADMIN", "facultyCoordinator", "faculty"), async (req, res) => {
  try {
    const {
      q,
      search,
      branch,
      program,
      gradYear,
      verified,
      clubRole,
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const rawQuery = (search || q || "").trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    // Exclude system admin emails from student listings
    const admins = await prisma.adminRole.findMany({ select: { email: true } });
    const excludedEmails = admins.map((a) => (a.email ? a.email.toLowerCase() : "")).filter(Boolean);

    const where = {};
    if (excludedEmails.length > 0) {
      where.email = { notIn: excludedEmails };
    }

    if (rawQuery) {
      const q = rawQuery.trim();
      const upperQ = q.toUpperCase();
      const orConditions = [
        { name: { contains: q, mode: "insensitive" } },
        { rollNo: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];

      // Exact match for short branch codes so "CE" doesn't match "ECE" or "ICE"
      if (ALL_BRANCH_CODES.includes(upperQ)) {
        orConditions.push({ branch: { equals: upperQ, mode: "insensitive" } });
        const fullName = BRANCH_FULL_NAMES[upperQ];
        if (fullName) {
          orConditions.push({ branch: { contains: fullName, mode: "insensitive" } });
        }
      } else if (q.length >= 4) {
        orConditions.push({ branch: { contains: q, mode: "insensitive" } });
      }

      where.AND = [
        ...(where.AND || []),
        { OR: orConditions },
      ];
    }

    if (branch && branch !== "all") {
      const upper = branch.toUpperCase();
      const fullName = BRANCH_FULL_NAMES[upper];
      const branchConditions = [
        { branch: { equals: branch, mode: "insensitive" } },
        { branch: { equals: upper, mode: "insensitive" } },
      ];
      if (fullName) {
        branchConditions.push({ branch: { equals: fullName, mode: "insensitive" } });
        branchConditions.push({ branch: { contains: fullName, mode: "insensitive" } });
      }
      if (upper === "MNC" || upper === "MAC") {
        branchConditions.push({ branch: { equals: "MNC", mode: "insensitive" } });
        branchConditions.push({ branch: { equals: "MAC", mode: "insensitive" } });
      }
      where.AND = [
        ...(where.AND || []),
        { OR: branchConditions },
      ];
    }

    if (program && program !== "all") {
      const upperProg = program.toUpperCase();
      const progLabel = PROGRAM_LABELS[upperProg];
      const progConditions = [
        { program: { equals: program, mode: "insensitive" } },
        { program: { equals: upperProg, mode: "insensitive" } },
      ];
      if (progLabel) {
        progConditions.push({ program: { equals: progLabel, mode: "insensitive" } });
      }
      where.AND = [
        ...(where.AND || []),
        { OR: progConditions },
      ];
    }

    if (gradYear && gradYear !== "all") {
      const yr = parseInt(gradYear, 10);
      if (!isNaN(yr)) {
        where.expectedGraduationYear = yr;
      }
    }

    if (verified && verified !== "all") {
      where.isVerified = verified === "true";
    }

    if (clubRole && clubRole !== "all") {
      where.memberships = {
        some: {
          role: clubRole,
        },
      };
    }

    const hasSearchCriteria = Boolean(
      rawQuery ||
      (branch && branch !== "all") ||
      (program && program !== "all") ||
      (gradYear && gradYear !== "all") ||
      (verified && verified !== "all") ||
      (clubRole && clubRole !== "all")
    );

    // Provide filter metadata (batches, degree programs, counts)
    const [distinctGradYearsRaw, totalStudentsCount, verifiedStudentsCount] =
      await Promise.all([
        prisma.studentUser.findMany({
          where: excludedEmails.length > 0 ? { email: { notIn: excludedEmails } } : {},
          select: { expectedGraduationYear: true },
          distinct: ["expectedGraduationYear"],
          orderBy: { expectedGraduationYear: "asc" },
        }),
        prisma.studentUser.count({
          where: excludedEmails.length > 0 ? { email: { notIn: excludedEmails } } : {},
        }),
        prisma.studentUser.count({
          where: {
            isVerified: true,
            ...(excludedEmails.length > 0 ? { email: { notIn: excludedEmails } } : {}),
          },
        }),
      ]);

    const filterOptions = {
      branches: ALL_BRANCH_CODES,
      branchFullNames: BRANCH_FULL_NAMES,
      programs: PROGRAM_OPTIONS,
      programLabels: PROGRAM_LABELS,
      graduationYears: distinctGradYearsRaw.map((g) => g.expectedGraduationYear).filter(Boolean),
    };

    const summary = {
      totalStudents: totalStudentsCount,
      verifiedStudents: verifiedStudentsCount,
      unverifiedStudents: totalStudentsCount - verifiedStudentsCount,
    };

    // If metadata only or if no search criteria is specified, do not query student rows
    if (req.query.metaOnly === "true" || (!hasSearchCriteria && req.query.loadAll !== "true")) {
      return res.json({
        success: true,
        students: [],
        pagination: {
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        },
        filterOptions,
        summary,
        requiresSearch: true,
      });
    }

    const allowedSortFields = ["name", "rollNo", "createdAt", "expectedGraduationYear", "branch", "program"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

    const [total, students] = await Promise.all([
      prisma.studentUser.count({ where }),
      prisma.studentUser.findMany({
        where,
        select: {
          id: true,
          name: true,
          rollNo: true,
          email: true,
          phone: true,
          branch: true,
          program: true,
          expectedGraduationYear: true,
          profileImage: true,
          isVerified: true,
          isTwoStepEnabled: true,
          createdAt: true,
          socialLinks: {
            select: { platform: true, url: true },
          },
          memberships: {
            select: {
              role: true,
              position: true,
              club: {
                select: { id: true, clubName: true, slug: true, clubLogo: true, category: true },
              },
            },
          },
          _count: {
            select: {
              participations: true,
              certificates: true,
            },
          },
        },
        orderBy: { [sortField]: sortDirection },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    const enrichedStudents = students.map((s) => {
      const progress = calculateAcademicProgress(s);
      const headships = s.memberships.filter((m) => m.role === "CLUB_HEAD");
      const coordinatorRoles = s.memberships.filter((m) => m.role === "COORDINATOR");

      return {
        ...s,
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        academicStatus: progress.academicStatus,
        isAlumni: progress.isAlumni,
        headClubs: headships.map((h) => h.club),
        coordinatorClubs: coordinatorRoles.map((c) => c.club),
        isClubLead: headships.length > 0,
        isCoordinator: coordinatorRoles.length > 0,
      };
    });

    res.json({
      success: true,
      students: enrichedStudents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
      filterOptions,
      summary,
    });
  } catch (err) {
    console.error("Failed to fetch students in admin directory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/students/:id", verifyToken, allowRoles("admin", "SUPER_ADMIN", "facultyCoordinator", "faculty"), async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.studentUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        rollNo: true,
        email: true,
        phone: true,
        branch: true,
        program: true,
        expectedGraduationYear: true,
        profileImage: true,
        isVerified: true,
        isTwoStepEnabled: true,
        createdAt: true,
        updatedAt: true,
        socialLinks: {
          select: { id: true, platform: true, url: true },
        },
        memberships: {
          include: {
            club: {
              select: {
                id: true,
                clubName: true,
                slug: true,
                category: true,
                clubLogo: true,
              },
            },
          },
        },
        participations: {
          orderBy: { createdAt: "desc" },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
                registrationType: true,
                startTime: true,
                endTime: true,
                venue: true,
                imageUrl: true,
              },
            },
            team: {
              select: {
                id: true,
                teamName: true,
              },
            },
          },
        },
        certificates: {
          orderBy: { issuedAt: "desc" },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                organizers: {
                  include: {
                    club: {
                      select: {
                        id: true,
                        clubName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ledTeams: {
          include: {
            event: { select: { id: true, title: true } },
            members: {
              include: {
                student: { select: { id: true, name: true, rollNo: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const progress = calculateAcademicProgress(student);

    const formattedCertificates = (student.certificates || []).map((c) => {
      const primaryClub = c.event?.organizers?.[0]?.club;
      return {
        ...c,
        clubName: primaryClub?.clubName || null,
      };
    });

    res.json({
      success: true,
      student: {
        ...student,
        certificates: formattedCertificates,
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        academicStatus: progress.academicStatus,
        isAlumni: progress.isAlumni,
      },
    });
  } catch (err) {
    console.error("Failed to fetch student profile:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/students/:id/toggle-verification", verifyToken, allowRoles("admin", "SUPER_ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.studentUser.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const updated = await prisma.studentUser.update({
      where: { id },
      data: { isVerified: !student.isVerified },
      select: { id: true, isVerified: true },
    });

    res.json({ success: true, isVerified: updated.isVerified });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
