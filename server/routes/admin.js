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
    let admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (!admin) {
      const inst = await prisma.institutionalAccount.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" }, isActive: true },
      });
      if (inst && inst.password) {
        const isMatch = await bcrypt.compare(password, inst.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const token = generateToken(inst, "central_organizer", "institutional", null, "INSTITUTIONAL");
        const userObj = {
          id: inst.id,
          institutionalAccountId: inst.id,
          email: inst.email,
          name: inst.name,
          type: inst.type,
          role: "central_organizer",
          userType: "institutional",
          principalType: "INSTITUTIONAL",
        };

        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
          success: true,
          message: "Login successful",
          admin: userObj,
          role: "central_organizer",
          user: userObj,
          token,
        });
      }

      const student = await prisma.studentUser.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
      });
      if (student) {
        const isCO = student.accessLevel === "central_organizer"
          || Boolean(await prisma.institutionalAccountAssignment.findFirst({ where: { studentId: student.id, status: { not: "INACTIVE" } } }));
        if (isCO) {
          const isMatch = await bcrypt.compare(password, student.password);
          if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

          const { role, clubId, memberships, institutionalAssignments } = await getStudentRoleAndClub(student.id);
          const token = generateToken(student, role, "student", clubId, "STUDENT");
          const userObj = { ...sanitizeUser(student), principalType: "STUDENT", clubId, memberships, institutionalAssignments };

          const isProduction = process.env.NODE_ENV === "production";
          res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });

          return res.json({
            success: true,
            message: "Login successful",
            admin: userObj,
            role,
            user: userObj,
            token,
          });
        }
      }
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
      const [instAccounts, clubAccounts, adminRoles] = await Promise.all([
        prisma.institutionalAccount.findMany({ select: { email: true } }),
        prisma.clubAccount.findMany({ select: { email: true } }),
        prisma.adminRole.findMany({ select: { email: true } }),
      ]);
      const excludedEmails = [
        ...instAccounts.map((a) => a.email.toLowerCase()),
        ...clubAccounts.map((c) => c.email.toLowerCase()),
        ...adminRoles.map((r) => r.email.toLowerCase()),
      ];

      const [events, participations, totalStudents, totalClubs, totalEventsActive, totalEventsAll] =
        await Promise.all([
          prisma.event.findMany({
            select: {
              id: true,
              title: true,
              entryFee: true,
              registeredCount: true,
              registrationType: true,
              registrationDeadline: true,
              startTime: true,
              organizerType: true,
              centralOrganizerId: true,
              clubId: true,
              club: { select: { clubName: true } },
              createdBy: { select: { id: true } },
            },
          }),
          prisma.participation.findMany({
            where: { status: { in: ["REGISTERED", "ATTENDED"] } },
            select: { eventId: true, amountPaid: true, paymentStatus: true },
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
        const isCentral = event.organizerType === "CENTRAL" || !!event.centralOrganizerId || (!event.club && !event.clubId);
        const collected = eventParts
          .filter((p) => p.paymentStatus === "SUCCESS" || p.paymentStatus === "APPROVED")
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        return {
          eventId: event.id,
          title: event.title,
          clubName: event.club?.clubName || "ODSW",
          organizerType: event.organizerType,
          isCentral,
          creatorId: event.createdBy?.id || null,
          clubHeadId: event.createdBy?.id || null,
          registrationType: event.registrationType || "individual",
          registeredCount: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          totalCollected: collected,
          regCount: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          entryFee: event.entryFee,
          registrationDeadline: event.registrationDeadline,
          startTime: event.startTime,
        };
      });

      const yearWiseMap = events.reduce((acc, event) => {
        const year = new Date(event.startTime).getFullYear();
        acc.set(year, (acc.get(year) ?? 0) + 1);
        return acc;
      }, new Map());

      const totalRevenue = participations
        .filter((p) => p.paymentStatus === "SUCCESS" || p.paymentStatus === "APPROVED")
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

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
          select: { student: { select: { id: true, name: true, email: true } } },
          take: 1
        }
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
      if (clubId === "ODSW" || clubId === "CENTRAL" || clubId === "central") {
        where.OR = [
          { organizerType: "CENTRAL" },
          { centralOrganizerId: { not: null } },
          { clubId: null },
        ];
      } else {
        where.clubId = clubId;
      }
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
        club: { select: { id: true, clubName: true } },
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
      select: { eventId: true, amountPaid: true, paymentStatus: true },
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
        const isCentral = event.organizerType === "CENTRAL" || !!event.centralOrganizerId || (!event.club && !event.clubId);
        const collected = eventParts
          .filter((p) => p.paymentStatus === "SUCCESS" || p.paymentStatus === "APPROVED")
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        return {
          id: event.id,
          eventId: event.id,
          slug: event.slug,
          eventName: event.title,
          clubName: event.club?.clubName || "ODSW",
          organizerType: event.organizerType,
          registrationType: event.registrationType || "individual",
          isCentral,
          totalRegistrations: event.registrationType === "none" ? 0 : (event.registeredCount || eventParts.length),
          eventType: event.entryFee > 0 ? "Paid" : "Free",
          entryFee: event.entryFee || 0,
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

    const existingClubAccount = await prisma.clubAccount.findUnique({ where: { email: trimmedClubEmail } });
    if (existingClubAccount) {
      return res.status(400).json({ message: `A club account with email "${trimmedClubEmail}" already exists.` });
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

      await tx.clubAccount.create({
        data: {
          id: createObjectId(),
          clubId: club.id,
          email: trimmedClubEmail,
          password: passwordHash,
          isActive: true,
        },
      });

      return club;
    });

    invalidatePublicResponses(["clubs*", "events*"]);

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";

    try {
      await sendEmail({
        to: trimmedClubEmail,
        template: "clubs:credentials",
        data: {
          clubName: trimmedClubName,
          clubEmail: trimmedClubEmail,
          defaultPassword,
          loginUrl: `${clientUrl}/login`,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send club credentials email:", emailErr?.message || emailErr);
    }

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
      message: "Club and associated users created successfully. Notification emails sent.",
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

    // Handle Club Email Change & ClubAccount sync
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
        const clubAccConflict = await prisma.clubAccount.findFirst({
          where: { email: trimmedClubEmail, clubId: { not: targetClubId } }
        });
        if (clubAccConflict) {
          return res.status(400).json({ message: `A club account with email "${trimmedClubEmail}" already exists.` });
        }
        updates.clubEmail = trimmedClubEmail;
      }
    }

    const updatedClub = await prisma.$transaction(async (tx) => {
      const club = await tx.club.update({
        where: { id: targetClubId },
        data: updates,
        include: {
          facultyCoordinator: { select: { id: true, name: true, email: true } },
          account: true,
        }
      });

      if (updates.clubEmail) {
        await tx.clubAccount.upsert({
          where: { clubId: targetClubId },
          create: {
            id: createObjectId(),
            clubId: targetClubId,
            email: updates.clubEmail,
            password: await bcrypt.hash(`${club.slug || 'club'}@him0148`, 10),
            isActive: true,
          },
          update: {
            email: updates.clubEmail,
          }
        });
      }

      return club;
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
        events: { select: { id: true } },
        account: { select: { id: true } },
      }
    });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const eventIds = club.events.map((e) => e.id);
    const clubAccountId = club.account?.id;

    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications related to club account or club events
      if (clubAccountId) {
        await tx.notification.deleteMany({
          where: { senderClubAccountId: clubAccountId }
        });
      }
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

      // 3. Delete scanner sessions, attendance records, feedbacks, event staff for club events
      if (eventIds.length > 0) {
        await tx.attendanceRecord.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.scannerSession.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.eventFeedback.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.eventAIReview.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.eventStaff.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.participation.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.teamMember.deleteMany({ where: { team: { eventId: { in: eventIds } } } });
        await tx.team.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.eventClub.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.featuredEvent.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.event.deleteMany({ where: { id: { in: eventIds } } });
      }

      // 4. Delete club specific relations
      await tx.eventClub.deleteMany({ where: { clubId } });
      await tx.clubSocialLink.deleteMany({ where: { clubId } });
      await tx.clubAnnouncement.deleteMany({ where: { clubId } });
      await tx.clubAchievement.deleteMany({ where: { clubId } });
      await tx.clubMembership.deleteMany({ where: { clubId } });
      await tx.clubAccount.deleteMany({ where: { clubId } });

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
          paymentMethod: { not: "FREE" },
        },
      },
      include: {
        event: {
          select: {
            title: true,
            organizerType: true,
            centralOrganizerId: true,
            clubId: true,
            club: { select: { clubName: true } },
            registrationFee: true,
            entryFee: true,
            registrationType: true,
            minTeamSize: true,
            maxTeamSize: true,
            paymentMethod: true,
          },
        },
        student: {
          select: {
            name: true,
            email: true,
            rollNo: true,
          },
        },
        team: {
          include: {
            leader: { select: { id: true, name: true, email: true, rollNo: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, rollNo: true } },
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
      if (p.teamId) {
        if (!processedMap.has(p.teamId)) {
          processedMap.set(p.teamId, [p]);
        } else {
          processedMap.get(p.teamId).push(p);
        }
      } else {
        const isCentral = p.event?.organizerType === "CENTRAL" || !!p.event?.centralOrganizerId || (!p.event?.club && !p.event?.clubId);
        resultList.push({
          id: p.id,
          eventId: p.eventId,
          eventName: p.event.title,
          clubName: p.event?.club?.clubName || "ODSW",
          organizerType: p.event?.organizerType,
          isCentral,
          eventRegistrationType: p.event?.registrationType || "individual",
          eventMinTeamSize: p.event?.minTeamSize || 1,
          eventMaxTeamSize: p.event?.maxTeamSize || 1,
          eventPaymentMethod: p.event?.paymentMethod || "MANUAL_TRANSACTION",
          isTeam: (p.event?.registrationType === "team" || p.event?.registrationType === "both"),
          teamId: null,
          teamName: p.formResponses?.teamName || p.formResponses?.['Team Name'] || null,
          teamMemberCount: 1,
          teamMembers: [],
          studentName: p.student?.name || p.externalName || "Unknown",
          studentEmail: p.student?.email || p.externalEmail || "N/A",
          studentRollNo: p.student?.rollNo || "N/A",
          transactionId: p.transactionId || null,
          payerName: p.payerName || null,
          paymentRemarks: p.paymentRemarks || null,
          paymentStatus: p.paymentStatus,
          amountPaid: p.amountPaid || p.event.registrationFee || p.event.entryFee || 0,
          createdAt: p.createdAt,
        });
      }
    }

    for (const [teamId, teamParts] of processedMap.entries()) {
      const primaryP = teamParts.find(tp => tp.transactionId) || 
                       teamParts.find(tp => tp.studentId && tp.studentId === tp.team?.leaderId) || 
                       teamParts[0];

      const team = primaryP.team;
      const isCentral = primaryP.event?.organizerType === "CENTRAL" || !!primaryP.event?.centralOrganizerId || (!primaryP.event?.club && !primaryP.event?.clubId);
      
      const teamMembers = (team?.members || []).map(m => ({
        name: m.user?.name || "Unknown",
        email: m.user?.email || "N/A",
        rollNo: m.user?.rollNo || "N/A",
        role: m.role || "member"
      }));

      resultList.push({
        id: primaryP.id,
        eventId: primaryP.eventId,
        eventName: primaryP.event.title,
        clubName: primaryP.event?.club?.clubName || "ODSW",
        organizerType: primaryP.event?.organizerType,
        isCentral,
        eventRegistrationType: primaryP.event?.registrationType || "team",
        eventMinTeamSize: primaryP.event?.minTeamSize || 2,
        eventMaxTeamSize: primaryP.event?.maxTeamSize || 4,
        eventPaymentMethod: primaryP.event?.paymentMethod || "MANUAL_TRANSACTION",
        isTeam: true,
        teamId: teamId,
        teamName: team?.teamName || primaryP.formResponses?.teamName || "Team",
        teamMemberCount: teamMembers.length || teamParts.length,
        teamMembers,
        leaderName: team?.leader?.name || primaryP.student?.name || "Team Leader",
        studentName: team?.leader?.name || primaryP.student?.name || primaryP.externalName || "Team Leader",
        studentEmail: team?.leader?.email || primaryP.student?.email || primaryP.externalEmail || "N/A",
        studentRollNo: team?.leader?.rollNo || primaryP.student?.rollNo || "N/A",
        transactionId: primaryP.transactionId || null,
        payerName: primaryP.payerName || null,
        paymentRemarks: primaryP.paymentRemarks || null,
        paymentStatus: primaryP.paymentStatus,
        amountPaid: primaryP.amountPaid || primaryP.event.registrationFee || primaryP.event.entryFee || 0,
        createdAt: primaryP.createdAt,
      });
    }

    resultList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const summary = {
      total: resultList.length,
      pending: resultList.filter((p) => p.paymentStatus === "PENDING").length,
      approved: resultList.filter((p) => ["APPROVED", "SUCCESS"].includes(p.paymentStatus)).length,
      rejected: resultList.filter((p) => p.paymentStatus === "REJECTED").length,
      needMoreDetails: resultList.filter((p) => p.paymentStatus === "NEED_MORE_DETAILS").length,
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

router.get("/central-organizer", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    let dsw = await prisma.institutionalAccount.findFirst({
      where: { type: "DSW" },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                branch: true,
                expectedGraduationYear: true,
                academicStatus: true,
                program: true,
                rollNo: true,
              },
            },
          },
        },
      },
    });

    if (!dsw) {
      dsw = await prisma.institutionalAccount.create({
        data: {
          id: createObjectId(),
          name: "Dean Student Welfare (DSW)",
          type: "DSW",
          email: "odsw@nitj.ac.in",
          isActive: true,
        },
        include: { assignments: { include: { student: true } } },
      });
    }

    const activeAssignments = (dsw?.assignments || []).map((a) => ({
      id: a.id,
      studentId: a.studentId,
      student: a.student,
      role: a.role,
      status: a.status,
      canManageEvents: a.canManageEvents,
      canTakeAttendance: a.canTakeAttendance,
      canVerifyPayments: a.canVerifyPayments,
      canDelegateStaff: a.canDelegateStaff,
      customPermissions: a.customPermissions,
    }));

    const primaryCO = activeAssignments.find((a) => a.role === "CENTRAL_EVENT_ORGANISER") || activeAssignments[0] || null;

    res.json({
      institutionalAccount: dsw,
      assignments: activeAssignments,
      centralOrganizer: primaryCO ? { ...primaryCO.student, assignment: primaryCO } : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/central-organizer", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const {
      studentId,
      role = "CENTRAL_EVENT_ORGANISER",
      canManageEvents = true,
      canTakeAttendance = true,
      canVerifyPayments = false,
      canDelegateStaff = false,
      customPermissions = [],
    } = req.body;

    if (!studentId) return res.status(400).json({ message: "studentId is required." });

    const student = await prisma.studentUser.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, isBlocked: true, accessLevel: true },
    });

    if (!student) return res.status(404).json({ message: "Student not found." });
    if (student.isBlocked) return res.status(403).json({ message: "Cannot assign role to a blocked student." });

    let dsw = await prisma.institutionalAccount.findFirst({ where: { type: "DSW" } });
    if (!dsw) {
      dsw = await prisma.institutionalAccount.create({
        data: {
          id: createObjectId(),
          name: "Dean Student Welfare (DSW)",
          type: "DSW",
          email: "odsw@nitj.ac.in",
          isActive: true,
        },
      });
    }

    const assignment = await prisma.institutionalAccountAssignment.upsert({
      where: {
        institutionalAccountId_studentId: {
          institutionalAccountId: dsw.id,
          studentId: student.id,
        },
      },
      update: {
        role,
        status: "ACTIVE",
        canManageEvents: Boolean(canManageEvents),
        canTakeAttendance: Boolean(canTakeAttendance),
        canVerifyPayments: Boolean(canVerifyPayments),
        canDelegateStaff: Boolean(canDelegateStaff),
        customPermissions: Array.isArray(customPermissions) ? customPermissions : [],
      },
      create: {
        id: createObjectId(),
        institutionalAccountId: dsw.id,
        studentId: student.id,
        role,
        status: "ACTIVE",
        canManageEvents: Boolean(canManageEvents),
        canTakeAttendance: Boolean(canTakeAttendance),
        canVerifyPayments: Boolean(canVerifyPayments),
        canDelegateStaff: Boolean(canDelegateStaff),
        customPermissions: Array.isArray(customPermissions) ? customPermissions : [],
      },
    });

    if (role === "CENTRAL_EVENT_ORGANISER") {
      await prisma.studentUser.update({
        where: { id: studentId },
        data: { accessLevel: "central_organizer" },
      });
    }

    await prisma.event.updateMany({
      where: { organizerType: "CENTRAL" },
      data: { institutionalAccountId: dsw.id },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.CENTRAL_ORGANIZER_ASSIGNED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      targetId: studentId,
      metadata: {
        studentEmail: student.email,
        studentName: student.name,
        role,
        capabilities: { canManageEvents, canTakeAttendance, canVerifyPayments, canDelegateStaff },
      },
    });

    res.status(201).json({
      message: "Institutional role assigned successfully.",
      assignment,
      centralOrganizer: { id: student.id, name: student.name, email: student.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/central-organizer/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const student = await prisma.studentUser.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, accessLevel: true },
    });

    if (!student) return res.status(404).json({ message: "Student not found." });

    const dsw = await prisma.institutionalAccount.findFirst({ where: { type: "DSW" } });

    if (dsw) {
      await prisma.institutionalAccountAssignment.deleteMany({
        where: {
          institutionalAccountId: dsw.id,
          studentId: req.params.id,
        },
      });
    }

    await prisma.studentUser.update({
      where: { id: req.params.id },
      data: { accessLevel: "normal" },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.CENTRAL_ORGANIZER_REVOKED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      targetId: req.params.id,
      metadata: { studentEmail: student.email },
    });

    res.json({ message: "Institutional role revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/search", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ students: [] });
    }

    const query = q.trim();

    // Fetch all non-student account emails (clubs, admins, faculty, institutional) to strictly exclude them
    const [clubAccounts, admins, instAccounts] = await Promise.all([
      prisma.clubAccount.findMany({ select: { email: true } }),
      prisma.adminRole.findMany({ select: { email: true } }),
      prisma.institutionalAccount.findMany({ select: { email: true } }),
    ]);

    const excludedEmails = [
      ...clubAccounts.map((c) => (c.email ? c.email.toLowerCase() : "")),
      ...admins.map((a) => (a.email ? a.email.toLowerCase() : "")),
      ...instAccounts.map((i) => (i.email ? i.email.toLowerCase() : "")),
    ].filter(Boolean);

    const students = await prisma.studentUser.findMany({
      where: {
        isBlocked: false,
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
        academicStatus: true,
        program: true,
        accessLevel: true,
      },
      take: 10,
    });

    const enriched = students.map((s) => {
      const progress = calculateAcademicProgress(s);
      return {
        ...s,
        year: progress.academicYearLabel,
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
      };
    });

    res.json({ students: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
