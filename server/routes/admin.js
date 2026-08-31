import express from "express";
import bcrypt from "bcryptjs";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { slugifyUnique } from "../utils/slugifyUnique.js";
import { createObjectId } from "../utils/objectId.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { generateToken } from "../middleware/auth.js";
import sendEmail from "../utils/sendEmail.js";
import { getStudentRoleAndClub } from "./auth.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";

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
              payoutStatus: true,
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
            where: { status: { not: "CANCELLED" } },
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
          payoutStatus: event.payoutStatus || "PENDING",
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

router.post(
  "/complete-payout/:eventId",
  verifyToken,
  requirePermission(PERMISSIONS.PAYOUT_APPROVE),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const deadline = event.registrationDeadline || event.startTime;
      if (new Date() < new Date(deadline)) {
        return res.status(400).json({
          message: "Payout can only be completed after the registration deadline has passed.",
        });
      }

      await prisma.event.update({
        where: { id: req.params.eventId },
        data: { payoutStatus: "COMPLETED" },
      });

      res.json({ success: true, message: "Payout marked as completed" });
    } catch {
      res.status(500).json({ message: "Failed to update payout status" });
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
            bankName: true,
            accountHolderName: true,
            accountNumber: true,
            ifscCode: true,
            upiId: true,
            bankPhone: true,
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
      bankInfo: {
        bankName: club?.bankName ?? null,
        accountHolderName: club?.accountHolderName ?? null,
        accountNumber: club?.accountNumber
          ? club.accountNumber.slice(-4).padStart(club.accountNumber.length, "X")
          : null,
        ifscCode: club?.ifscCode ?? null,
        upiId: club?.upiId ?? null,
        bankPhone: club?.bankPhone ?? null,
      },
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
        status: { not: "CANCELLED" },
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

    const existingClub = await prisma.club.findUnique({ where: { clubName } });
    if (existingClub) {
      return res.status(400).json({ message: `A club named "${clubName}" already exists.` });
    }

    const existingStudent = await prisma.studentUser.findUnique({ where: { email: clubEmail } });
    if (existingStudent) {
      return res.status(400).json({ message: `A user account with email "${clubEmail}" already exists.` });
    }

    const slug = await slugifyUnique(clubName, 'club', 'slug');
    const defaultPassword = `${slug}@him0148`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    let isNewFaculty = false;

    const result = await prisma.$transaction(async (tx) => {
      let facultyUser = await tx.adminRole.findUnique({ where: { email: facultyEmail } });
      if (!facultyUser) {
        isNewFaculty = true;
        facultyUser = await tx.adminRole.create({
          data: {
            id: createObjectId(),
            name: facultyName,
            email: facultyEmail,
            password: passwordHash,
            role: "facultyCoordinator",
          },
        });
      }

      const club = await tx.club.create({
        data: {
          id: createObjectId(),
          clubName,
          slug,
          facultyName,
          facultyEmail,
          clubEmail,
          facultyCoordinatorId: facultyUser.id,
        },
      });

      await tx.clubAccount.create({
        data: {
          id: createObjectId(),
          clubId: club.id,
          email: clubEmail,
          password: passwordHash,
          isActive: true,
        },
      });

      return club;
    });

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";

    try {
      await sendEmail({
        email: clubEmail,
        subject: `Welcome to CampusNode - ${clubName} Account Credentials`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #ea580c; margin: 0; font-size: 22px;">Welcome to CampusNode</h2>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Official Club Management Account</p>
            </div>
            <p>Hello <strong>${clubName} Team</strong>,</p>
            <p>Your official club organizer account for <strong>${clubName}</strong> has been created and verified by the administrator.</p>
            
            <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Assigned Role:</strong> Club Head / Organizer</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Login Email:</strong> <span style="color: #ea580c; font-weight: bold;">${clubEmail}</span></p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Default Password:</strong> <code style="background: #e5e7eb; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: bold;">${defaultPassword}</code></p>
              <p style="margin: 0; font-size: 14px;"><strong>Account Status:</strong> <span style="color: #16a34a; font-weight: bold;">Verified & Active</span></p>
            </div>

            <p style="font-size: 14px;">With this account you can create and manage events, oversee registrations, scan attendee QR passes, and manage club members.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${clientUrl}/login" style="background-color: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Log In to Club Account</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 25px;">
              For security, please change your default password after logging in from your Profile settings.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send club credentials email:", emailErr?.message || emailErr);
    }

    try {
      await sendEmail({
        email: facultyEmail,
        subject: `CampusNode - Assigned as Faculty Coordinator for ${clubName}`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #ea580c; margin: 0; font-size: 22px;">Faculty Coordinator Portal</h2>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Club Oversight & Governance</p>
            </div>
            <p>Dear <strong>${facultyName}</strong>,</p>
            <p>You have been assigned as the <strong>Faculty Coordinator</strong> for <strong>${clubName}</strong> on CampusNode.</p>
            
            <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Assigned Role:</strong> Faculty Coordinator</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Coordinator Email:</strong> <span style="color: #ea580c; font-weight: bold;">${facultyEmail}</span></p>
              ${isNewFaculty
                ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Default Password:</strong> <code style="background: #e5e7eb; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: bold;">${defaultPassword}</code></p>`
                : `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Password:</strong> Use your existing Faculty Coordinator password.</p>`
              }
              <p style="margin: 0; font-size: 14px;"><strong>Assigned Club:</strong> ${clubName}</p>
            </div>

            <p style="font-size: 14px;">As Faculty Coordinator, you can review and approve club events, supervise team members, verify payments, and oversee compliance.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${clientUrl}/admin-secret-login" style="background-color: #171717; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Access Faculty Portal</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 25px;">
              You can access your coordinator portal anytime via the secure faculty login link above.
            </p>
          </div>
        `,
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
    const passwordHash = await bcrypt.hash(password || "coordinator123", 10);

    const coordinator = await prisma.adminRole.create({
      data: {
        id: createObjectId(),
        name,
        email,
        password: passwordHash,
        role: "facultyCoordinator",
      },
    });

    const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
    const plainPassword = password || "coordinator123";

    try {
      await sendEmail({
        email,
        subject: "Welcome to CampusNode - Faculty Coordinator Account Created",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #ea580c; margin: 0; font-size: 22px;">Welcome to CampusNode</h2>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Faculty Coordinator Portal</p>
            </div>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Your <strong>Faculty Coordinator</strong> account has been created on CampusNode.</p>
            
            <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Assigned Role:</strong> Faculty Coordinator</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Coordinator Email:</strong> <span style="color: #ea580c; font-weight: bold;">${email}</span></p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Default Password:</strong> <code style="background: #e5e7eb; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: bold;">${plainPassword}</code></p>
            </div>

            <p style="font-size: 14px;">As Faculty Coordinator, you can review and approve club events, verify receipts, and oversee student club operations.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${clientUrl}/admin-secret-login" style="background-color: #171717; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Log In to Coordinator Portal</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 25px;">
              Please change your password after your initial login for account security.
            </p>
          </div>
        `,
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
    const data = { name, email };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const coordinator = await prisma.adminRole.update({
      where: { id: req.params.id },
      data,
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
    const { clubName, clubEmail, facultyCoordinatorId, facultyName, facultyEmail } = req.body;
    const updates = { clubName, clubEmail, facultyCoordinatorId, facultyName, facultyEmail };

    if (clubName) {
      updates.slug = await slugifyUnique(clubName, 'club', 'slug', req.params.id);
    }

    const club = await prisma.club.update({
      where: { id: req.params.id },
      data: updates,
    });

    res.json({
      message: "Club updated successfully",
      club: { ...club, _id: club.id },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update club" });
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
