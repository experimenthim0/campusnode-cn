import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../middleware/auth.js";
import sendEmail from "../utils/sendEmail.js";
import { getClientUrl } from "../utils/corsConfig.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { checkPasswordRateLimit } from "../utils/checkPasswordRateLimit.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { PROGRAM_OPTIONS, isValidBranchForProgram } from "../constants/academicConstants.js";

const router = express.Router();
const ALLOWED_PROGRAMS = PROGRAM_OPTIONS;

const isProduction = process.env.NODE_ENV === "production";
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge,
});

// ─── Helper: derive student role & clubId & institutional assignments ────────

export async function getStudentRoleAndClub(studentId) {
  const [memberships, instAssignments] = await Promise.all([
    prisma.clubMembership.findMany({
      where: { studentId, status: { not: "INACTIVE" } },
      include: {
        club: { select: { id: true, clubName: true, slug: true, clubLogo: true } }
      }
    }),
    prisma.institutionalAccountAssignment.findMany({
      where: { studentId, status: { not: "INACTIVE" } },
      include: {
        institutionalAccount: { select: { id: true, name: true, type: true, email: true } }
      }
    })
  ]);

  const activeInstAssignment = instAssignments.find((a) => a.status === "ACTIVE" || a.status === undefined);
  const managementMembership = memberships.find(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR");
  
  const derivedRole = activeInstAssignment ? "central_organizer" : managementMembership ? "club" : "member";

  return {
    role: derivedRole,
    clubId: managementMembership?.clubId ?? (memberships.length > 0 ? memberships[0].clubId : null),
    memberships: memberships.map(m => ({
      id: m.id,
      clubId: m.clubId,
      clubName: m.club?.clubName,
      slug: m.club?.slug,
      clubLogo: m.club?.clubLogo,
      role: m.role,
      status: m.status,
      academicSessionId: m.academicSessionId,
      customPermissions: m.customPermissions || [],
      canTakeAttendance: m.canTakeAttendance,
      canEditEvents: m.canEditEvents,
      permissions: {
        canTakeAttendance: m.canTakeAttendance,
        canEditEvents: m.canEditEvents,
      }
    })),
    institutionalAssignments: instAssignments.map(a => ({
      id: a.id,
      institutionalAccountId: a.institutionalAccountId,
      accountName: a.institutionalAccount?.name,
      accountType: a.institutionalAccount?.type,
      role: a.role,
      status: a.status,
      canManageEvents: a.canManageEvents,
      canTakeAttendance: a.canTakeAttendance,
      canVerifyPayments: a.canVerifyPayments,
      canDelegateStaff: a.canDelegateStaff,
      customPermissions: a.customPermissions || [],
    }))
  };
}

// ─── Helper: derive facultyCoordinator clubId ────────────────────────────────

export async function getAdminClubId(adminId) {
  const club = await prisma.club.findFirst({
    where: { facultyCoordinatorId: adminId },
    select: { id: true, clubName: true },
  });
  return club;
}

// ─── STUDENT REGISTRATION ─────────────────────────────────────────────────────

router.post("/register/student", async (req, res) => {
  try {
    const { name, rollNo, branch, year, program, email, password } = req.body;
    const clientUrl = getClientUrl(req.headers.origin);

    if (!email.endsWith("@nitj.ac.in")) {
      return res.status(400).json({
        message: "Email must be a valid NITJ email (ending in @nitj.ac.in).",
      });
    }

    if (!name || name.length < 3) {
      return res.status(400).json({ message: "Name must be at least 3 characters long." });
    }

    if (!ALLOWED_PROGRAMS.includes(program)) {
      return res.status(400).json({ message: "Invalid program selected." });
    }

    if (program !== "OTHER") {
      if (!rollNo || !branch || !year) {
        return res.status(400).json({
          message: "Roll number, branch, and academic year are required.",
        });
      }
      if (!isValidBranchForProgram(program, branch)) {
        return res.status(400).json({
          message: `Invalid branch '${branch}' for ${program} program.`,
        });
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orFilters = [{ email }];
    if (rollNo) orFilters.push({ rollNo });

    // Auto-delete unverified student account if 24 hours have passed without verification
    await prisma.studentUser.deleteMany({
      where: {
        isVerified: false,
        OR: orFilters,
        createdAt: { lt: twentyFourHoursAgo },
      },
    });

    const existingUser = await prisma.studentUser.findFirst({ where: { OR: orFilters } });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email or roll number.",
      });
    }

    const isDevMode =
      process.env.NODE_ENV !== "production" && process.env.SKIP_VERIFICATION === "true";
    const verificationToken = isDevMode ? null : crypto.randomBytes(20).toString("hex");
    const verificationTokenExpire = isDevMode
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await prisma.studentUser.create({
      data: {
        id: createObjectId(),
        name: name.toUpperCase(),
        rollNo: rollNo || null,
        branch: branch || null,
        year: year || null,
        program,
        email,
        password: await bcrypt.hash(password, 10),
        verificationToken,
        verificationTokenExpire,
      },
    });

    if (!isDevMode) {
      const verifyUrl = `${clientUrl}/verify-email/${verificationToken}`;
      const message = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
          <h1 style="color: #FF4400; text-align: center;">Welcome to <span style="color:#000;">Campus</span>Node!</h1>
          <p style="font-size: 16px; text-align: center;">
            Hi <b>${name}</b>,<br><br>
            Thank you for signing up. To complete your registration, please verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #FF4400; color: white; padding: 12px 24px;
               text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
              Verify My Account
            </a>
          </div>
          <p style="font-size: 14px; text-align: center; color: #777;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; text-align: center; color: #777;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="${verifyUrl}" style="color: #FF7518;">${verifyUrl}</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; text-align: center; color: #999;">
            If you didn't create an account on CampusNode, you can safely ignore this email.
          </p>
        </div>`;

      try {
        await sendEmail({ email: newUser.email, subject: "Account Verification", message });
        return res.status(201).json({
          message: "Registration successful. Please check your email to verify your account.",
        });
      } catch {
        await prisma.studentUser.delete({ where: { id: newUser.id } });
        return res.status(500).json({ message: "Email could not be sent. Please try again." });
      }
    }

    const { role, clubId, memberships } = await getStudentRoleAndClub(newUser.id);
    const token = generateToken(newUser, role, "student", clubId);
    const userObj = { ...sanitizeUser(newUser), clubId, memberships };

    res.cookie("token", token, getCookieOptions());

    res.status(201).json({ success: true, message: "Registered successfully", user: userObj, role, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── STUDENT / CLUB LOGIN ──────────────────────────────────────────────────
// POST /api/auth/login/student
// Authenticates official club accounts (ClubAccount table) or students (StudentUser table)

router.post("/login/student", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Try ClubAccount first
    const clubAccount = await prisma.clubAccount.findUnique({
      where: { email },
      include: {
        club: {
          select: {
            id: true,
            clubName: true,
            slug: true,
            clubLogo: true,
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

    if (clubAccount && clubAccount.isActive) {
      const isMatch = await bcrypt.compare(password, clubAccount.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(clubAccount, "club", "club", clubAccount.clubId, "CLUB");
      const userObj = {
        id: clubAccount.id,
        clubAccountId: clubAccount.id,
        email: clubAccount.email,
        name: clubAccount.club?.clubName,
        clubId: clubAccount.clubId,
        principalType: "CLUB",
        club: clubAccount.club,
        bankName: clubAccount.club?.bankName,
        accountHolderName: clubAccount.club?.accountHolderName,
        accountNumber: clubAccount.club?.accountNumber,
        ifscCode: clubAccount.club?.ifscCode,
        upiId: clubAccount.club?.upiId,
        bankPhone: clubAccount.club?.bankPhone,
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Login successful",
        user: userObj,
        role: "club",
        userType: "club",
        principalType: "CLUB",
        token,
      });
    }

    // 2. Try StudentUser
    const student = await prisma.studentUser.findUnique({ where: { email } });

    if (!student || student.isBlocked) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!student.isVerified && process.env.SKIP_VERIFICATION !== "true") {
      const hasClubRole = await prisma.clubMembership.findFirst({
        where: { studentId: student.id, role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
      });
      if (hasClubRole) {
        await prisma.studentUser.update({
          where: { id: student.id },
          data: { isVerified: true },
        });
        student.isVerified = true;
      } else {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (student.createdAt < twentyFourHoursAgo || (student.verificationTokenExpire && new Date(student.verificationTokenExpire) < new Date())) {
          await prisma.studentUser.delete({ where: { id: student.id } });
          return res.status(401).json({ message: "Verification link expired (24 hours passed). Please register again." });
        }
        return res.status(401).json({ message: "Please verify your email to login." });
      }
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { role, clubId, memberships, institutionalAssignments } = await getStudentRoleAndClub(student.id);

    const token = generateToken(student, role, "student", clubId, "STUDENT");
    const userObj = {
      ...sanitizeUser(student),
      principalType: "STUDENT",
      clubId,
      memberships,
      institutionalAssignments,
    };

    res.cookie("token", token, getCookieOptions());

    return res.json({
      success: true,
      message: "Login successful",
      user: userObj,
      role,
      userType: "student",
      principalType: "STUDENT",
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN LOGIN ───────────────────────────────────────────────────────────────
// POST /api/auth/login/admin
// Authenticates platform admins, faculty coordinators, and payment admins (AdminRole table)

router.post("/login/admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.adminRole.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // 2FA for admin accounts
    if (admin.isTwoStepEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.adminRole.update({ where: { id: admin.id }, data: { otp, otpExpire } });

      await sendEmail({
        email: admin.email,
        subject: "Admin Login Verification Code",
        message: `<div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:auto;text-align:center">
          <h1 style="color:#FF4400;"><span style="color:#000">Campus</span>Node — Admin</h1>
          <h2>Your Verification Code</h2>
          <p>A login was requested for the <strong>${admin.role}</strong> account.</p>
          <div style="margin:30px 0">
            <span style="font-size:28px;letter-spacing:6px;font-weight:bold;background:#f4f4f4;padding:10px 20px;border-radius:8px;display:inline-block">${otp}</span>
          </div>
          <p style="color:#777">Expires in <strong>5 minutes</strong>. Do not share this code.</p>
        </div>`,
      });

      return res.json({ needs2FA: true, email: admin.email, message: "Verification code sent to your email." });
    }

    const club = admin.role === "facultyCoordinator" ? await getAdminClubId(admin.id) : null;
    const clubId = club?.id ?? null;
    const token = generateToken(admin, admin.role, "admin", clubId);
    const userObj = { ...sanitizeUser(admin), clubId };

    res.cookie("token", token, getCookieOptions());

    return res.json({ success: true, message: "Admin login successful", user: userObj, role: admin.role, userType: "admin", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── EXTERNAL USER REGISTRATION & LOGIN ───────────────────────────────────────
// External participants are now stored as StudentUser records with no rollNo/branch

router.post("/register/external", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    let externalUser = await prisma.studentUser.findUnique({ where: { email } });

    if (!externalUser) {
      externalUser = await prisma.studentUser.create({
        data: {
          id: createObjectId(),
          name,
          email,
          password: await import("bcryptjs").then(b => b.default.hash(createObjectId(), 10)),
          program: "OTHER",
        },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.studentUser.update({ where: { id: externalUser.id }, data: { otp, otpExpire } });

    await sendEmail({
      email,
      subject: "Your CampusNode Event Access Code",
      message: `<div style="font-family: logofont,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:auto;text-align:center">
        <h1 style="color:#FF4400;"><span style="color:#000">Club</span>Setu</h1>
        <h2>Event Access Code</h2>
        <p>Hi ${name}, use this code to confirm your registration:</p>
        <div style="margin:30px 0">
          <span style="font-size:28px;letter-spacing:6px;font-weight:bold;background:#f4f4f4;padding:10px 20px;border-radius:8px;display:inline-block">${otp}</span>
        </div>
        <p style="color:#777">Valid for <strong>10 minutes</strong>.</p>
      </div>`,
    });

    res.json({ message: "Access code sent to your email.", email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login/external", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const externalUser = await prisma.studentUser.findFirst({
      where: { email, otp, otpExpire: { gt: new Date() } },
    });

    if (!externalUser) {
      return res.status(401).json({ message: "Invalid or expired access code." });
    }

    await prisma.studentUser.update({
      where: { id: externalUser.id },
      data: { otp: null, otpExpire: null },
    });

    const token = generateToken(externalUser, "external", "external", null);
    const userObj = sanitizeUser(externalUser);

    res.cookie("token", token, getCookieOptions(24 * 60 * 60 * 1000));

    return res.json({ success: true, message: "Login successful", user: userObj, role: "external", userType: "external", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── 2FA VERIFICATION ─────────────────────────────────────────────────────────
// Checks StudentUser first, then AdminRole

router.post("/verify-2fa", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Try StudentUser
    const student = await prisma.studentUser.findFirst({
      where: { email, otp, otpExpire: { gt: new Date() } },
    });

    if (student) {
      await prisma.studentUser.update({
        where: { id: student.id },
        data: { otp: null, otpExpire: null },
      });

      const { role, clubId, memberships } = await getStudentRoleAndClub(student.id);
      const token = generateToken(student, role, "student", clubId);
      const userObj = { ...sanitizeUser(student), clubId, memberships };

      res.cookie("token", token, getCookieOptions());

      return res.json({ success: true, message: "Verification successful", user: userObj, role, token });
    }

    // Try AdminRole
    const admin = await prisma.adminRole.findFirst({
      where: { email, otp, otpExpire: { gt: new Date() } },
    });

    if (admin) {
      await prisma.adminRole.update({
        where: { id: admin.id },
        data: { otp: null, otpExpire: null },
      });

      const club = admin.role === "facultyCoordinator" ? await getAdminClubId(admin.id) : null;
      const clubId = club?.id ?? null;
      const token = generateToken(admin, admin.role, "admin", clubId);
      const userObj = { ...sanitizeUser(admin), clubId };

      res.cookie("token", token, getCookieOptions());

      return res.json({ success: true, message: "Verification successful", user: userObj, role: admin.role, token });
    }

    return res.status(401).json({ message: "Invalid or expired OTP." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── EMAIL VERIFICATION ────────────────────────────────────────────────────────
// Only students verify email; admins are pre-verified, externals use OTP

router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await prisma.studentUser.findFirst({
      where: {
        verificationToken: req.params.token,
        verificationTokenExpire: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    await prisma.studentUser.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpire: null },
    });

    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────────
// Checks StudentUser first, then AdminRole

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const clientUrl = getClientUrl(req.headers.origin);

    const student = await prisma.studentUser.findUnique({ where: { email } });
    const admin = !student ? await prisma.adminRole.findUnique({ where: { email } }) : null;
    const user = student || admin;

    if (!user) {
      return res.json({ message: "If an account exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);

    if (student) {
      await prisma.studentUser.update({
        where: { id: student.id },
        data: { resetPasswordToken: hashedToken, resetPasswordExpire },
      });
    } else {
      await prisma.adminRole.update({
        where: { id: admin.id },
        data: { resetPasswordToken: hashedToken, resetPasswordExpire },
      });
    }

    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    const message = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
      <h1 style="color: #FF4400; text-align: center;"><span style="color:#000;">Campus</span>Node</h1>
      <h2 style="text-align: center;">Reset Your Password</h2>
      <p style="font-size: 16px; text-align: center;">
        We received a request to reset your CampusNode account password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #FF4400; color: white; padding: 12px 24px;
           text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; text-align: center; color: #777;">This link will expire in 30 minutes.</p>
      <p style="font-size: 14px; text-align: center; color: #777;">
        If the button doesn't work:<br>
        <a href="${resetUrl}" style="color: #FF7518;">${resetUrl}</a>
      </p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; text-align: center; color: #999;">© 2026 CampusNode. All rights reserved.</p>
    </div>`;

    try {
      await sendEmail({ email: user.email, subject: "Password Reset Request", message });
      res.json({ message: "Reset link sent." });
    } catch {
      if (student) {
        await prisma.studentUser.update({
          where: { id: student.id },
          data: { resetPasswordToken: null, resetPasswordExpire: null },
        });
      } else {
        await prisma.adminRole.update({
          where: { id: admin.id },
          data: { resetPasswordToken: null, resetPasswordExpire: null },
        });
      }
      return res.status(500).json({ message: "Email could not be sent." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── RESET PASSWORD ────────────────────────────────────────────────────────────

router.post("/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Try StudentUser
    const student = await prisma.studentUser.findFirst({
      where: { resetPasswordToken: hashedToken, resetPasswordExpire: { gt: new Date() } },
    });

    if (student) {
      await prisma.studentUser.update({
        where: { id: student.id },
        data: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpire: null },
      });
      return res.json({ message: "Password reset successful." });
    }

    // Try AdminRole
    const admin = await prisma.adminRole.findFirst({
      where: { resetPasswordToken: hashedToken, resetPasswordExpire: { gt: new Date() } },
    });

    if (admin) {
      await prisma.adminRole.update({
        where: { id: admin.id },
        data: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpire: null },
      });
      return res.json({ message: "Password reset successful." });
    }

    return res.status(400).json({ message: "Invalid or expired token" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CHANGE PASSWORD ───────────────────────────────────────────────────────────

router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { userId, userType } = req.user;

    let user;
    if (userType === "admin") {
      user = await prisma.adminRole.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.studentUser.findUnique({ where: { id: userId } });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!checkPasswordRateLimit(user)) {
      return res.status(429).json({ message: "Daily password change limit exceeded. Try again tomorrow." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const data = {
      password: await bcrypt.hash(newPassword, 10),
      passwordChangeCount: user.passwordChangeCount + 1,
      lastPasswordChangeDate: new Date(),
    };

    if (userType === "admin") {
      await prisma.adminRole.update({ where: { id: userId }, data });
    } else {
      await prisma.studentUser.update({ where: { id: userId }, data });
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
// Clears the httpOnly token cookie
router.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0),
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// ─── UNIFIED LOGIN ────────────────────────────────────────────────────────────
// Authenticates ClubAccount, StudentUser, or AdminRole

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Try ClubAccount first
    const clubAccount = await prisma.clubAccount.findUnique({
      where: { email },
      include: {
        club: {
          select: {
            id: true,
            clubName: true,
            slug: true,
            clubLogo: true,
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

    if (clubAccount && clubAccount.isActive) {
      const isMatch = await bcrypt.compare(password, clubAccount.password);
      if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

      const token = generateToken(clubAccount, "club", "club", clubAccount.clubId, "CLUB");
      const userObj = {
        id: clubAccount.id,
        clubAccountId: clubAccount.id,
        email: clubAccount.email,
        name: clubAccount.club?.clubName,
        clubId: clubAccount.clubId,
        principalType: "CLUB",
        club: clubAccount.club,
        bankName: clubAccount.club?.bankName,
        accountHolderName: clubAccount.club?.accountHolderName,
        accountNumber: clubAccount.club?.accountNumber,
        ifscCode: clubAccount.club?.ifscCode,
        upiId: clubAccount.club?.upiId,
        bankPhone: clubAccount.club?.bankPhone,
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Login successful",
        user: userObj,
        role: "club",
        userType: "club",
        principalType: "CLUB",
        token,
      });
    }

    // 2. Try StudentUser
    const student = await prisma.studentUser.findUnique({ where: { email } });
    if (student && !student.isBlocked) {
      if (!student.isVerified) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (student.createdAt < twentyFourHoursAgo || (student.verificationTokenExpire && new Date(student.verificationTokenExpire) < new Date())) {
          await prisma.studentUser.delete({ where: { id: student.id } });
          return res.status(401).json({ message: "Verification link expired (24 hours passed). Please register again." });
        }
        return res.status(401).json({ message: "Please verify your email to login." });
      }
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

      const { role, clubId, memberships } = await getStudentRoleAndClub(student.id);

      const token = generateToken(student, role, "student", clubId, "STUDENT");
      const userObj = {
        ...sanitizeUser(student),
        principalType: "STUDENT",
        clubId,
        memberships,
      };
      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Login successful",
        user: userObj,
        role,
        userType: "student",
        principalType: "STUDENT",
        token,
      });
    }

    // 3. Try AdminRole
    const admin = await prisma.adminRole.findUnique({ where: { email } });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

      if (admin.isTwoStepEnabled) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.adminRole.update({
          where: { id: admin.id },
          data: { otp, otpExpire: new Date(Date.now() + 5 * 60 * 1000) },
        });
        await sendEmail({
          email: admin.email,
          subject: "Login Verification Code",
          message: `<p>Your OTP is: <strong>${otp}</strong>. Expires in 5 minutes.</p>`,
        });
        return res.json({ needs2FA: true, email: admin.email, message: "Verification code sent." });
      }

      const clubInfo = (admin.role === "facultyCoordinator" || admin.role === "club") 
        ? await prisma.club.findFirst({ where: { facultyCoordinatorId: admin.id } }) 
        : null;
      const clubId = clubInfo?.id ?? null;
      const isFaculty = admin.role === "facultyCoordinator";
      const principalType = isFaculty ? "FACULTY" : "ADMIN";
      const memberships = clubInfo ? [{ 
        clubId: clubInfo.id, 
        clubName: clubInfo.clubName, 
        role: "facultyCoordinator",
        canTakeAttendance: true,
        canEditEvents: true,
        canCheckRegistration: true,
        canViewDashboard: true,
        permissions: {
          canTakeAttendance: true,
          canViewDashboard: true,
          canCheckRegistration: true,
          canEditEvents: true
        }
      }] : [];
      
      const token = generateToken(admin, admin.role, "admin", clubId, principalType);
      const userObj = {
        ...sanitizeUser(admin),
        principalType,
        clubId,
        memberships,
      };
      if (clubInfo) {
        userObj.bankName = clubInfo.bankName;
        userObj.accountHolderName = clubInfo.accountHolderName;
        userObj.accountNumber = clubInfo.accountNumber;
        userObj.ifscCode = clubInfo.ifscCode;
        userObj.upiId = clubInfo.upiId;
        userObj.bankPhone = clubInfo.bankPhone;
      }
      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Login successful",
        user: userObj,
        role: admin.role,
        userType: "admin",
        principalType,
        token,
      });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
