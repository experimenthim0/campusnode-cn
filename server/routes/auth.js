import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../middleware/auth.js";
import { sendEmail, extractSecurityMetadata } from "../emails/index.js";
import { getClientUrl } from "../utils/corsConfig.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { checkPasswordRateLimit } from "../utils/checkPasswordRateLimit.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { PROGRAM_OPTIONS, isValidBranchForProgram } from "../constants/academicConstants.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import redis from "../lib/redis.js";

const router = express.Router();
const ALLOWED_PROGRAMS = PROGRAM_OPTIONS;

const isProduction = process.env.NODE_ENV === "production";
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge,
});

async function generateAndSendLoginOtp(req, user, userType, contextLabel) {
  const cleanEmail = user.email.toLowerCase().trim();
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
  const otpKey = `otp:login:${cleanEmail}`;

  // Store in Redis with 5-minute (300 seconds) TTL
  await redis.setex(
    otpKey,
    300,
    JSON.stringify({
      otpHash,
      attempts: 0,
      userType,
      userId: user.id,
      email: cleanEmail,
    })
  );

  const securityMeta = await extractSecurityMetadata(req);
  await sendEmail({
    to: user.email,
    template: "auth:login-otp",
    data: {
      email: user.email,
      otp: otpCode,
      contextLabel: contextLabel || userType,
      expiryMinutes: 5,
      ...securityMeta,
    },
  });

  return {
    needs2FA: true,
    email: user.email,
    userType,
    message: "Verification code sent to your email.",
  };
}


export async function getStudentRoleAndClub(studentId) {
  const memberships = await prisma.clubMembership.findMany({
    where: { studentId },
    include: {
      club: { select: { id: true, clubName: true, slug: true, clubLogo: true } }
    }
  });

  const managementMembership = memberships.find(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR");
  const derivedRole = managementMembership ? "club" : "member";

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
      customPermissions: m.customPermissions || [],
      canTakeAttendance: m.canTakeAttendance,
      canEditEvents: m.canEditEvents,
      permissions: {
        canTakeAttendance: m.canTakeAttendance,
        canEditEvents: m.canEditEvents,
      }
    })),
  };
}


export async function getAdminClubId(adminId) {
  const club = await prisma.club.findFirst({
    where: { facultyCoordinatorId: adminId },
    select: {
      id: true,
      clubName: true,
      slug: true,
      clubLogo: true,
    },
  });
  return club;
}


router.post("/register/student", async (req, res) => {
  try {
    const { name, rollNo, branch, year, expectedGraduationYear, program, email, password } = req.body;

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

    if (!rollNo || !branch || (!year && !expectedGraduationYear)) {
      return res.status(400).json({
        message: "Roll number, branch, and graduation year are required.",
      });
    }

    if (program !== "OTHER") {
      if (!isValidBranchForProgram(program, branch)) {
        return res.status(400).json({
          message: `Invalid branch '${branch}' for ${program} program.`,
        });
      }
    }

    const orFilters = [{ email }];
    if (rollNo) orFilters.push({ rollNo });

    const existingUser = await prisma.studentUser.findFirst({ where: { OR: orFilters } });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email or roll number.",
      });
    }

    const progress = calculateAcademicProgress({
      program,
      expectedGraduationYear: expectedGraduationYear ? parseInt(expectedGraduationYear, 10) : null,
      year: year || null,
    });

    const shouldSkipVerification = process.env.SKIP_VERIFICATION === "true";
    const studentId = `I_${createObjectId().slice(0, 22)}`;
    const newUser = await prisma.studentUser.create({
      data: {
        id: studentId,
        name: name.toUpperCase(),
        rollNo,
        branch,
        expectedGraduationYear: progress.expectedGraduationYear,
        program,
        email,
        password: await bcrypt.hash(password, 10),
        isVerified: shouldSkipVerification,
      },
    });

    if (shouldSkipVerification) {
      const { role, clubId, memberships } = await getStudentRoleAndClub(newUser.id);
      const token = generateToken(newUser, role, "student", clubId);
      const userObj = {
        ...sanitizeUser(newUser),
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        expectedGraduationYear: progress.expectedGraduationYear,
        year: progress.academicYearLabel,
        clubId,
        memberships,
      };

      res.cookie("token", token, getCookieOptions());
      return res.status(201).json({ success: true, message: "Registered successfully", user: userObj, role, token });
    }

    // Email verification required: generate token and send email
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyKey = `email_verify:${hashedToken}`;

    // Store in Redis with 24-hour TTL (86400 seconds)
    await redis.setex(
      verifyKey,
      86400,
      JSON.stringify({ userId: newUser.id, email: newUser.email, userType: "student" })
    );

    const clientUrl = getClientUrl(req.headers.origin);
    const verifyUrl = `${clientUrl}/verify-email/${rawToken}`;

    try {
      await sendEmail({
        to: newUser.email,
        template: "auth:verify-account",
        data: {
          name: newUser.name,
          verifyUrl,
          expiryHours: 24,
        },
      });
    } catch (emailErr) {
      console.error("[Auth] Failed to send student verification email:", emailErr);
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Registration successful! A verification link has been sent to your NITJ email. Please verify your email before logging in.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Authenticates students (StudentUser table), admin/faculty (AdminRole table), or external users (ExternalUser table)

router.post(["/login", "/login/student"], async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    // 1. Student User
    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (student) {
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!student.isVerified && process.env.SKIP_VERIFICATION !== "true") {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          email: student.email,
          message: "Please verify your email address before logging in. Check your inbox for the verification link.",
        });
      }

      if (student.isTwoStepEnabled) {
        const result = await generateAndSendLoginOtp(req, student, "student", "Student");
        return res.json(result);
      }

      const { role, clubId, memberships } = await getStudentRoleAndClub(student.id);

      const progress = calculateAcademicProgress(student);
      const token = generateToken(student, role, "student", clubId, "STUDENT");
      const userObj = {
        ...sanitizeUser(student),
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        expectedGraduationYear: student.expectedGraduationYear || progress.expectedGraduationYear,
        year: progress.academicYearLabel,
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

    // 2. Admin / Faculty Coordinator User (AdminRole table)
    const admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (admin.isTwoStepEnabled) {
        const result = await generateAndSendLoginOtp(req, admin, "admin", admin.role || "Admin");
        return res.json(result);
      }

      const clubInfo = (admin.role === "facultyCoordinator" || admin.role === "club")
        ? await getAdminClubId(admin.id)
        : null;
      const clubId = clubInfo?.id ?? null;
      const isFaculty = admin.role === "facultyCoordinator";
      const principalType = isFaculty ? "FACULTY" : "ADMIN";
      const memberships = clubInfo ? [{
        id: `fac_${clubInfo.id}`,
        clubId: clubInfo.id,
        clubName: clubInfo.clubName,
        slug: clubInfo.slug,
        clubLogo: clubInfo.clubLogo,
        role: "facultyCoordinator",
        status: "ACTIVE",
        customPermissions: [],
        canTakeAttendance: true,
        canEditEvents: true,
        canCheckRegistration: true,
        canViewDashboard: true,
        permissions: {
          canTakeAttendance: true,
          canViewDashboard: true,
          canCheckRegistration: true,
          canEditEvents: true,
        },
      }] : [];

      const token = generateToken(admin, admin.role, "admin", clubId, principalType);
      const userObj = {
        ...sanitizeUser(admin),
        principalType,
        clubId,
        clubName: clubInfo?.clubName ?? null,
        memberships,
      };

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

    // 3. External User
    const externalUser = await prisma.externalUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (externalUser) {
      const isMatch = await bcrypt.compare(password, externalUser.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!externalUser.isVerified && process.env.SKIP_VERIFICATION !== "true") {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          email: externalUser.email,
          message: "Please verify your email address before logging in. Check your inbox for the verification link.",
        });
      }

      if (externalUser.isTwoStepEnabled) {
        const result = await generateAndSendLoginOtp(req, externalUser, "external", "External");
        return res.json(result);
      }

      const token = generateToken(externalUser, "external", "external", null, "EXTERNAL");
      const userObj = {
        id: externalUser.id,
        name: externalUser.name,
        email: externalUser.email,
        collegeName: externalUser.collegeName,
        phone: externalUser.phone,
        program: externalUser.program,
        graduationYear: externalUser.graduationYear,
        profileImage: externalUser.profileImage,
        portfolioUrl: externalUser.portfolioUrl,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Login successful",
        user: userObj,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
        token,
      });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Authenticates platform admins and faculty coordinators (AdminRole table)

router.post("/login/admin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    let admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (!admin) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // 2FA for admin accounts
    if (admin.isTwoStepEnabled) {
      const result = await generateAndSendLoginOtp(req, admin, "admin", admin.role || "Admin");
      return res.json(result);
    }

    const club = admin.role === "facultyCoordinator" ? await getAdminClubId(admin.id) : null;
    const clubId = club?.id ?? null;
    const isFaculty = admin.role === "facultyCoordinator";
    const principalType = isFaculty ? "FACULTY" : "ADMIN";
    const memberships = club ? [{
      id: `fac_${club.id}`,
      clubId: club.id,
      clubName: club.clubName,
      slug: club.slug,
      clubLogo: club.clubLogo,
      role: "facultyCoordinator",
      status: "ACTIVE",
      customPermissions: [],
      canTakeAttendance: true,
      canEditEvents: true,
      canCheckRegistration: true,
      canViewDashboard: true,
      permissions: {
        canTakeAttendance: true,
        canViewDashboard: true,
        canCheckRegistration: true,
        canEditEvents: true,
      },
    }] : [];

    const token = generateToken(admin, admin.role, "admin", clubId, principalType);
    const userObj = {
      ...sanitizeUser(admin),
      principalType,
      clubId,
      clubName: club?.clubName ?? null,
      memberships,
    };

    res.cookie("token", token, getCookieOptions());

    return res.json({
      success: true,
      message: "Admin login successful",
      user: userObj,
      admin: userObj,
      role: admin.role,
      userType: "admin",
      principalType,
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// External participants are stored in dedicated ExternalUser table

router.post("/register/external", async (req, res) => {
  try {
    const { name, email, password, collegeName, phone, program, graduationYear } = req.body;

    if (!name || !email || !password || !collegeName || !program || !graduationYear) {
      return res.status(400).json({ message: "Name, email, password, college/university name, program/degree, and graduation year are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Enforce educational/institutional email ending with .edu or .ac.in
    const domain = cleanEmail.split("@")[1] || "";
    const isAcademicEmail =
      domain.endsWith(".edu") ||
      domain.endsWith(".ac.in") ||
      domain.endsWith(".edu.in");

    if (!isAcademicEmail) {
      return res.status(400).json({
        message: "Only institutional student emails ending with .edu or .ac.in are allowed for external registration.",
      });
    }

    const [existingExternal, existingStudent] = await Promise.all([
      prisma.externalUser.findUnique({ where: { email: cleanEmail } }),
      prisma.studentUser.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingExternal || existingStudent) {
      return res.status(400).json({ message: "An account with this email address already exists. Please login instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const externalId = `E_${createObjectId().slice(0, 22)}`;
    const shouldSkipVerification = process.env.SKIP_VERIFICATION === "true";

    const externalUser = await prisma.externalUser.create({
      data: {
        id: externalId,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        collegeName: collegeName.trim(),
        phone: phone?.trim() || null,
        program: program?.trim() || null,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        isVerified: shouldSkipVerification,
      },
    });

    if (shouldSkipVerification) {
      const token = generateToken(externalUser, "external", "external", null, "EXTERNAL");
      const userObj = {
        id: externalUser.id,
        name: externalUser.name,
        email: externalUser.email,
        collegeName: externalUser.collegeName,
        phone: externalUser.phone,
        program: externalUser.program,
        graduationYear: externalUser.graduationYear,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
      };

      res.cookie("token", token, getCookieOptions());

      return res.status(201).json({
        success: true,
        message: "External participant account created successfully!",
        user: userObj,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
        token,
      });
    }

    // Email verification required
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyKey = `email_verify:${hashedToken}`;

    await redis.setex(
      verifyKey,
      86400,
      JSON.stringify({ userId: externalUser.id, email: externalUser.email, userType: "external" })
    );

    const clientUrl = getClientUrl(req.headers.origin);
    const verifyUrl = `${clientUrl}/verify-email/${rawToken}`;

    try {
      await sendEmail({
        to: externalUser.email,
        template: "auth:verify-account",
        data: {
          name: externalUser.name,
          verifyUrl,
          expiryHours: 24,
        },
      });
    } catch (emailErr) {
      console.error("[Auth] Failed to send external verification email:", emailErr);
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Account registered successfully! A verification email has been sent. Please verify your email before logging in.",
    });
  } catch (err) {
    console.error("External user registration error:", err);
    res.status(500).json({ message: err.message || "Failed to register external participant." });
  }
});

router.post("/login/external", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    const externalUser = await prisma.externalUser.findFirst({
      where: { email: cleanEmail },
    });

    if (!externalUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const isMatch = await bcrypt.compare(password, externalUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!externalUser.isVerified && process.env.SKIP_VERIFICATION !== "true") {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: externalUser.email,
        message: "Please verify your email address before logging in. Check your inbox for the verification link.",
      });
    }

    if (externalUser.isTwoStepEnabled) {
      const result = await generateAndSendLoginOtp(req, externalUser, "external", "External");
      return res.json(result);
    }

    const token = generateToken(externalUser, "external", "external", null, "EXTERNAL");
    const userObj = {
      id: externalUser.id,
      name: externalUser.name,
      email: externalUser.email,
      collegeName: externalUser.collegeName,
      phone: externalUser.phone,
      program: externalUser.program,
      graduationYear: externalUser.graduationYear,
      profileImage: externalUser.profileImage,
      portfolioUrl: externalUser.portfolioUrl,
      role: "external",
      userType: "external",
      principalType: "EXTERNAL",
    };

    res.cookie("token", token, getCookieOptions());

    return res.json({
      success: true,
      message: "Login successful",
      user: userObj,
      role: "external",
      userType: "external",
      principalType: "EXTERNAL",
      token,
    });
  } catch (err) {
    console.error("External login error:", err);
    res.status(500).json({ message: err.message || "Failed to log in." });
  }
});

// 2FA verification — checks StudentUser, AdminRole, then ExternalUser

router.post("/verify-2fa", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const otpKey = `otp:login:${cleanEmail}`;
    const stored = await redis.get(otpKey);
    if (!stored) {
      return res.status(401).json({ message: "Invalid or expired verification code." });
    }

    let otpData;
    try {
      otpData = JSON.parse(stored);
    } catch {
      await redis.del(otpKey);
      return res.status(401).json({ message: "Invalid verification session. Please login again." });
    }

    // Rate limiting / brute force prevention: max 5 failed attempts
    if (otpData.attempts >= 5) {
      await redis.del(otpKey);
      return res.status(429).json({ message: "Too many failed attempts. Please request a new verification code." });
    }

    const inputHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    if (inputHash !== otpData.otpHash) {
      otpData.attempts = (otpData.attempts || 0) + 1;
      const remainingTtl = await redis.ttl(otpKey);
      await redis.setex(otpKey, remainingTtl > 0 ? remainingTtl : 300, JSON.stringify(otpData));
      const remaining = 5 - otpData.attempts;
      return res.status(401).json({
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    // Code matches! Consume the OTP immediately
    await redis.del(otpKey);

    // Retrieve user based on cleanEmail
    // 1. Student
    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (student) {
      const { role, clubId, memberships } = await getStudentRoleAndClub(student.id);
      const progress = calculateAcademicProgress(student);
      const token = generateToken(student, role, "student", clubId, "STUDENT");
      const userObj = {
        ...sanitizeUser(student),
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        expectedGraduationYear: student.expectedGraduationYear || progress.expectedGraduationYear,
        year: progress.academicYearLabel,
        principalType: "STUDENT",
        clubId,
        memberships,
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Verification successful",
        user: userObj,
        role,
        userType: "student",
        principalType: "STUDENT",
        token,
      });
    }

    // 2. Admin / Faculty
    const admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (admin) {
      const club = (admin.role === "facultyCoordinator" || admin.role === "club")
        ? await getAdminClubId(admin.id)
        : null;
      const clubId = club?.id ?? null;
      const isFaculty = admin.role === "facultyCoordinator";
      const principalType = isFaculty ? "FACULTY" : "ADMIN";
      const memberships = club ? [{
        id: `fac_${club.id}`,
        clubId: club.id,
        clubName: club.clubName,
        slug: club.slug,
        clubLogo: club.clubLogo,
        role: "facultyCoordinator",
        status: "ACTIVE",
        customPermissions: [],
        canTakeAttendance: true,
        canEditEvents: true,
        canCheckRegistration: true,
        canViewDashboard: true,
        permissions: {
          canTakeAttendance: true,
          canViewDashboard: true,
          canCheckRegistration: true,
          canEditEvents: true,
        },
      }] : [];

      const token = generateToken(admin, admin.role, "admin", clubId, principalType);
      const userObj = {
        ...sanitizeUser(admin),
        principalType,
        clubId,
        clubName: club?.clubName ?? null,
        memberships,
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Verification successful",
        user: userObj,
        admin: userObj,
        role: admin.role,
        userType: "admin",
        principalType,
        token,
      });
    }

    // 3. External User
    const externalUser = await prisma.externalUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (externalUser) {
      const token = generateToken(externalUser, "external", "external", null, "EXTERNAL");
      const userObj = {
        id: externalUser.id,
        name: externalUser.name,
        email: externalUser.email,
        collegeName: externalUser.collegeName,
        phone: externalUser.phone,
        program: externalUser.program,
        graduationYear: externalUser.graduationYear,
        profileImage: externalUser.profileImage,
        portfolioUrl: externalUser.portfolioUrl,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
      };

      res.cookie("token", token, getCookieOptions());
      return res.json({
        success: true,
        message: "Verification successful",
        user: userObj,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
        token,
      });
    }

    return res.status(404).json({ message: "User account not found." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password — checks StudentUser, AdminRole, ExternalUser
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const clientUrl = getClientUrl(req.headers.origin);

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });
    const admin = !student ? await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    }) : null;
    const externalUser = (!student && !admin) ? await prisma.externalUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    }) : null;

    const user = student || admin || externalUser;

    if (!user) {
      return res.json({ message: "If an account exists, a reset link has been sent." });
    }

    const userType = student ? "student" : admin ? "admin" : "external";
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetKey = `pwd_reset:${hashedToken}`;

    // Store in Redis with 30-minute (1800 seconds) TTL
    await redis.setex(
      resetKey,
      1800,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        userType,
      })
    );

    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    const securityMeta = await extractSecurityMetadata(req);

    try {
      await sendEmail({
        to: user.email,
        template: "auth:reset-password",
        data: {
          resetUrl,
          expiryMinutes: 30,
          ...securityMeta,
        },
      });
      return res.json({ message: "If an account exists, a reset link has been sent." });
    } catch (err) {
      await redis.del(resetKey);
      return res.status(500).json({ message: "Email could not be sent." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      return res.status(400).json({ message: "Reset token is required." });
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetKey = `pwd_reset:${hashedToken}`;

    const stored = await redis.get(resetKey);
    if (!stored) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(stored);
    } catch {
      await redis.del(resetKey);
      return res.status(400).json({ message: "Invalid reset token." });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { userId, userType } = tokenData;

    if (userType === "admin") {
      await prisma.adminRole.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else if (userType === "external") {
      await prisma.externalUser.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.studentUser.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    // Single-use token: consume immediately
    await redis.del(resetKey);

    return res.json({
      success: true,
      message: "Password reset successfully. You may now log in with your new password.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Email verification endpoints
router.get("/verify-email/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyKey = `email_verify:${hashedToken}`;

    const stored = await redis.get(verifyKey);
    if (!stored) {
      return res.status(400).json({ message: "The verification link is invalid or has expired." });
    }

    let data;
    try {
      data = JSON.parse(stored);
    } catch {
      await redis.del(verifyKey);
      return res.status(400).json({ message: "Invalid verification link." });
    }

    const { userId, userType } = data;
    if (userType === "student") {
      await prisma.studentUser.update({
        where: { id: userId },
        data: { isVerified: true },
      });
    } else if (userType === "external") {
      await prisma.externalUser.update({
        where: { id: userId },
        data: { isVerified: true },
      });
    }

    // Single-use token: consume upon verification
    await redis.del(verifyKey);

    return res.json({
      success: true,
      message: "Your email address has been successfully verified! You can now sign in.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post(["/send-verification-email", "/resend-verification"], async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });
    const externalUser = !student ? await prisma.externalUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    }) : null;

    const user = student || externalUser;
    if (!user) {
      return res.json({ message: "If the account exists, a verification email has been sent." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "This account is already verified. You can log in directly." });
    }

    const userType = student ? "student" : "external";
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyKey = `email_verify:${hashedToken}`;

    // 24 hours TTL (86400 seconds)
    await redis.setex(
      verifyKey,
      86400,
      JSON.stringify({ userId: user.id, email: user.email, userType })
    );

    const clientUrl = getClientUrl(req.headers.origin);
    const verifyUrl = `${clientUrl}/verify-email/${rawToken}`;

    await sendEmail({
      to: user.email,
      template: "auth:verify-account",
      data: {
        name: user.name,
        verifyUrl,
        expiryHours: 24,
      },
    });

    return res.json({
      success: true,
      message: "Verification email sent successfully.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { userId, userType } = req.user;

    let user;
    if (userType === "admin") {
      user = await prisma.adminRole.findUnique({ where: { id: userId } });
    } else if (userType === "external") {
      user = await prisma.externalUser.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.studentUser.findUnique({ where: { id: userId } });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (userType === "admin") {
      await prisma.adminRole.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    } else if (userType === "external") {
      await prisma.externalUser.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.studentUser.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
export default router;
