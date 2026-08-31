import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { PERMISSIONS, hasPermission } from "../utils/rbac.js";
import { calculateAcademicProgress, normalizeYearToNumber } from "../utils/academicProgress.js";

const exportHistoryMemoryLog = [];
const MAX_MEMORY_LOGS = 100;

export const DATASETS = {
  events: {
    id: "events",
    label: "Events",
    description: "All event listings, metadata, registration counts, and approval statuses.",
    requiredPermission: PERMISSIONS.EVENT_VIEW,
    defaultColumns: ["title", "clubName", "venue", "startTime", "entryFee", "reviewStatus", "registeredCount"],
    allColumns: [
      { id: "id", label: "Event ID" },
      { id: "title", label: "Event Title" },
      { id: "clubName", label: "Organising Club" },
      { id: "venue", label: "Venue" },
      { id: "startTime", label: "Start Time" },
      { id: "endTime", label: "End Time" },
      { id: "reviewStatus", label: "Approval Status" },
      { id: "entryFee", label: "Entry Fee (₹)" },
      { id: "eventType", label: "Type (Paid/Free)" },
      { id: "registeredCount", label: "Registrations" },
      { id: "registrationType", label: "Reg. Type (Individual/Team)" },
      { id: "payoutStatus", label: "Payout Status" },
      { id: "registrationDeadline", label: "Reg. Deadline" },
      { id: "createdAt", label: "Created Date" },
    ],
  },
  registrations: {
    id: "registrations",
    label: "Registrations",
    description: "Student event registrations, fee payment statuses, and transaction IDs.",
    requiredPermission: PERMISSIONS.REGISTRATION_VIEW,
    defaultColumns: ["studentName", "rollNo", "eventName", "clubName", "status", "paymentStatus", "amountPaid", "createdAt"],
    allColumns: [
      { id: "id", label: "Registration ID" },
      { id: "studentName", label: "Student Name" },
      { id: "rollNo", label: "Roll Number" },
      { id: "email", label: "Email Address" },
      { id: "eventName", label: "Event Title" },
      { id: "clubName", label: "Club Name" },
      { id: "status", label: "Registration Status" },
      { id: "paymentStatus", label: "Payment Status" },
      { id: "amountPaid", label: "Amount Paid (₹)" },
      { id: "transactionId", label: "UTR / Transaction ID" },
      { id: "createdAt", label: "Registration Date" },
    ],
  },
  students: {
    id: "students",
    label: "Students",
    description: "Student user profiles, branches, programs, and verification statuses.",
    requiredPermission: PERMISSIONS.USER_VIEW,
    defaultColumns: ["name", "rollNo", "email", "branch", "year", "program", "userCategory", "createdAt"],
    allColumns: [
      { id: "id", label: "Student ID" },
      { id: "name", label: "Student Name" },
      { id: "rollNo", label: "Roll Number" },
      { id: "email", label: "Email Address" },
      { id: "branch", label: "Branch" },
      { id: "year", label: "Year" },
      { id: "program", label: "Program" },
      { id: "userCategory", label: "User Role Category" },
      { id: "isVerified", label: "Email Verified" },
      { id: "isBlocked", label: "Status (Blocked)" },
      { id: "createdAt", label: "Registered Date" },
    ],
  },
  clubs: {
    id: "clubs",
    label: "Clubs",
    description: "Registered campus clubs, faculty coordinators, and bank settlement details.",
    requiredPermission: PERMISSIONS.CLUB_VIEW,
    defaultColumns: ["clubName", "category", "facultyName", "facultyEmail", "officialClubEmail", "createdAt"],
    allColumns: [
      { id: "id", label: "Club ID" },
      { id: "clubName", label: "Club Name" },
      { id: "category", label: "Category" },
      { id: "facultyName", label: "Faculty Coordinator" },
      { id: "facultyEmail", label: "Faculty Email" },
      { id: "officialClubEmail", label: "Official Club Email" },
      { id: "bankName", label: "Bank Name" },
      { id: "accountHolderName", label: "Account Holder" },
      { id: "accountNumberMasked", label: "Account Number (Masked)" },
      { id: "ifscCode", label: "IFSC Code" },
      { id: "upiId", label: "UPI ID" },
      { id: "createdAt", label: "Created Date" },
    ],
  },
  transactions: {
    id: "transactions",
    label: "Financial Transactions",
    description: "Paid event payment verification logs, UTR numbers, amounts, and settlement statuses.",
    requiredPermission: PERMISSIONS.PAYMENT_VIEW,
    defaultColumns: ["transactionId", "studentName", "eventName", "clubName", "amountPaid", "paymentStatus", "createdAt"],
    allColumns: [
      { id: "transactionId", label: "UTR / Transaction ID" },
      { id: "studentName", label: "Student Name" },
      { id: "rollNo", label: "Roll Number" },
      { id: "email", label: "Student Email" },
      { id: "eventName", label: "Event Title" },
      { id: "clubName", label: "Club Name" },
      { id: "payerName", label: "Payer Name" },
      { id: "amountPaid", label: "Amount Paid (₹)" },
      { id: "paymentStatus", label: "Payment Status" },
      { id: "paymentRemarks", label: "Remarks" },
      { id: "paymentReviewedBy", label: "Reviewed By" },
      { id: "createdAt", label: "Transaction Date" },
    ],
  },
  payouts: {
    id: "payouts",
    label: "Payouts",
    description: "Paid event settlement totals, registration revenues, and payout statuses.",
    requiredPermission: PERMISSIONS.PAYOUT_VIEW,
    defaultColumns: ["title", "clubName", "entryFee", "registeredCount", "totalRevenue", "payoutStatus"],
    allColumns: [
      { id: "id", label: "Event ID" },
      { id: "title", label: "Event Title" },
      { id: "clubName", label: "Club Name" },
      { id: "entryFee", label: "Entry Fee (₹)" },
      { id: "registeredCount", label: "Registrations" },
      { id: "totalRevenue", label: "Total Revenue (₹)" },
      { id: "payoutStatus", label: "Payout Status" },
      { id: "startTime", label: "Event Start Date" },
      { id: "registrationDeadline", label: "Deadline" },
    ],
  },
};

/**
 * Helper to calculate date range for Academic Session & Semester
 */
export function getSessionDateRange(session, semester) {
  if (!session || session === "all") return null;

  const match = String(session).match(/\d{4}/);
  if (!match) return null;
  const startYear = parseInt(match[0], 10);
  const endYear = startYear + 1;

  let gte = new Date(startYear, 6, 1, 0, 0, 0); // July 1
  let lte = new Date(endYear, 5, 30, 23, 59, 59); // June 30

  if (semester === "Odd") {
    lte = new Date(startYear, 11, 31, 23, 59, 59);
  } else if (semester === "Even") {
    gte = new Date(endYear, 0, 1, 0, 0, 0);
  }

  return { gte, lte };
}

export function getAuthorizedDatasets(user) {
  if (!user) return [];
  const isSuperAdmin = user.role === "admin" || user.role === "SUPER_ADMIN";

  return Object.values(DATASETS).filter((ds) => {
    if (isSuperAdmin) return true;
    return hasPermission(user, ds.requiredPermission);
  });
}

export async function getEventsList(user, clubId = "all") {
  const isSuperAdmin = user.role === "admin" || user.role === "SUPER_ADMIN";
  const where = {};
  if (!isSuperAdmin && (user.role === "facultyCoordinator" || user.role === "club")) {
    where.clubId = user.clubId;
  } else if (clubId && clubId !== "all") {
    where.clubId = clubId;
  }

  const events = await prisma.event.findMany({
    where,
    select: { id: true, title: true, organizerType: true, centralOrganizerId: true, clubId: true, club: { select: { clubName: true } } },
    orderBy: { startTime: "desc" },
  });

  return events.map((e) => {
    const isCentral = e.organizerType === "CENTRAL" || !!e.centralOrganizerId || (!e.club && !e.clubId);
    return {
      id: e.id,
      title: e.title,
      clubName: e.club?.clubName || (isCentral ? "ODSW" : "N/A"),
    };
  });
}

export async function queryDatasetRecords({ datasetId, user, filters = {}, page = 1, limit = 50, isExport = false }) {
  const datasetConfig = DATASETS[datasetId];
  if (!datasetConfig) {
    throw new Error(`Invalid dataset: ${datasetId}`);
  }

  const isSuperAdmin = user.role === "admin" || user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && !hasPermission(user, datasetConfig.requiredPermission)) {
    throw new Error(`Forbidden: You do not have permission to view or export dataset '${datasetId}'.`);
  }

  let restrictedClubId = null;
  if (!isSuperAdmin && (user.role === "facultyCoordinator" || user.role === "club")) {
    restrictedClubId = user.clubId;
  }
  const effectiveClubId = restrictedClubId || (filters.clubId !== "all" ? filters.clubId : null);

  const dateRange = getSessionDateRange(filters.session, filters.semester);
  const skip = (page - 1) * limit;
  const take = isExport ? undefined : limit;

  let totalCount = 0;
  let records = [];

  switch (datasetId) {
    case "events": {
      const where = {};
      if (effectiveClubId) where.clubId = effectiveClubId;
      if (filters.eventId && filters.eventId !== "all") where.id = filters.eventId;
      if (filters.reviewStatus && filters.reviewStatus !== "all") where.reviewStatus = filters.reviewStatus;
      if (filters.payoutStatus && filters.payoutStatus !== "all") where.payoutStatus = filters.payoutStatus;
      if (filters.registrationType && filters.registrationType !== "all") where.registrationType = filters.registrationType;

      if (filters.eventType === "Paid") where.entryFee = { gt: 0 };
      else if (filters.eventType === "Free") where.entryFee = 0;

      if (dateRange) {
        where.startTime = { gte: dateRange.gte, lte: dateRange.lte };
      }

      totalCount = await prisma.event.count({ where });
      const rawEvents = await prisma.event.findMany({
        where,
        include: { club: { select: { clubName: true } } },
        orderBy: { startTime: "desc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawEvents.map((e) => {
        const isCentral = e.organizerType === "CENTRAL" || !!e.centralOrganizerId || (!e.club && !e.clubId);
        return {
          id: e.id,
          title: e.title,
          clubName: e.club?.clubName || (isCentral ? "ODSW" : "N/A"),
          venue: e.venue || "N/A",
          startTime: e.startTime ? new Date(e.startTime).toLocaleString() : "",
          endTime: e.endTime ? new Date(e.endTime).toLocaleString() : "",
          reviewStatus: e.reviewStatus,
          entryFee: e.entryFee || 0,
          eventType: e.entryFee > 0 ? "Paid" : "Free",
          registeredCount: e.registeredCount || 0,
          registrationType: e.registrationType || "individual",
          payoutStatus: e.payoutStatus || "PENDING",
          registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline).toLocaleString() : "",
          createdAt: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "",
        };
      });
      break;
    }

    case "registrations": {
      const where = {};
      if (effectiveClubId) where.event = { clubId: effectiveClubId };
      if (filters.eventId && filters.eventId !== "all") where.eventId = filters.eventId;
      if (filters.status && filters.status !== "all") where.status = filters.status;
      if (filters.paymentStatus && filters.paymentStatus !== "all") where.paymentStatus = filters.paymentStatus;

      if (dateRange) {
        where.createdAt = { gte: dateRange.gte, lte: dateRange.lte };
      }

      totalCount = await prisma.participation.count({ where });
      const rawParts = await prisma.participation.findMany({
        where,
        include: {
          student: { select: { name: true, rollNo: true, email: true } },
          event: { select: { title: true, club: { select: { clubName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawParts.map((p) => {
        const isCentral = p.event?.organizerType === "CENTRAL" || !!p.event?.centralOrganizerId || (!p.event?.club && !p.event?.clubId);
        return {
          id: p.id,
          studentName: p.student?.name || p.externalName || "N/A",
          rollNo: p.student?.rollNo || "N/A",
          email: p.student?.email || p.externalEmail || "N/A",
          eventName: p.event?.title || "N/A",
          clubName: p.event?.club?.clubName || (isCentral ? "ODSW" : "N/A"),
          status: p.status,
          paymentStatus: p.paymentStatus,
          amountPaid: p.amountPaid || 0,
          transactionId: p.transactionId || "N/A",
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
        };
      });
      break;
    }

    case "students": {
      const where = {};
      if (filters.branch && filters.branch !== "all") where.branch = filters.branch;
      if (filters.program && filters.program !== "all") where.program = filters.program;
      if (filters.isVerified === "true") where.isVerified = true;
      if (filters.isVerified === "false") where.isVerified = false;
      if (filters.isBlocked === "true") where.isBlocked = true;
      if (filters.isBlocked === "false") where.isBlocked = false;

      const userCategory = filters.userCategory || "students_only";
      if (userCategory === "students_only") {
        where.NOT = { memberships: { some: { role: "CLUB_HEAD" } } };
      } else if (userCategory === "club_heads_only") {
        where.memberships = { some: { role: "CLUB_HEAD" } };
      }

      totalCount = await prisma.studentUser.count({ where });
      const rawStudents = await prisma.studentUser.findMany({
        where,
        select: {
          id: true,
          name: true,
          rollNo: true,
          email: true,
          branch: true,
          program: true,
          expectedGraduationYear: true,
          academicStatus: true,
          isVerified: true,
          isBlocked: true,
          createdAt: true,
          memberships: {
            where: { role: "CLUB_HEAD" },
            select: { club: { select: { clubName: true } } },
          },
        },
        orderBy: { name: "asc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawStudents.map((s) => {
        const isClubHead = s.memberships && s.memberships.length > 0;
        const clubName = isClubHead ? s.memberships[0]?.club?.clubName : null;
        const progress = calculateAcademicProgress(s);
        return {
          id: s.id,
          name: s.name,
          rollNo: s.rollNo || "N/A",
          email: s.email,
          branch: s.branch || "N/A",
          year: progress.academicYearLabel,
          academicYear: progress.academicYear,
          semester: progress.semesterLabel,
          program: s.program || "N/A",
          userCategory: isClubHead ? `Club Head (${clubName || 'Club'})` : "Student",
          isVerified: s.isVerified ? "Yes" : "No",
          isBlocked: s.isBlocked ? "Blocked" : "Active",
          createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
        };
      });

      if (filters.year && filters.year !== "all") {
        const targetYearNum = normalizeYearToNumber(filters.year);
        if (targetYearNum) {
          records = records.filter((r) => normalizeYearToNumber(r.year) === targetYearNum);
        }
      }
      break;
    }

    case "clubs": {
      const where = {};
      if (filters.category && filters.category !== "all") where.category = filters.category;

      totalCount = await prisma.club.count({ where });
      const rawClubs = await prisma.club.findMany({
        where,
        include: {
          facultyCoordinator: { select: { name: true, email: true } },
          memberships: {
            where: { role: "CLUB_HEAD" },
            select: { student: { select: { email: true } } },
            take: 1,
          },
        },
        orderBy: { clubName: "asc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawClubs.map((c) => {
        const clubHeadEmail = c.memberships && c.memberships[0]?.student?.email;
        const officialClubEmail = c.clubEmail || clubHeadEmail || "N/A";
        return {
          id: c.id,
          clubName: c.clubName,
          category: c.category || "General",
          facultyName: c.facultyName || c.facultyCoordinator?.name || "N/A",
          facultyEmail: c.facultyEmail || c.facultyCoordinator?.email || "N/A",
          officialClubEmail,
          bankName: c.bankName || "N/A",
          accountHolderName: c.accountHolderName || "N/A",
          accountNumberMasked: c.accountNumber
            ? c.accountNumber.slice(-4).padStart(c.accountNumber.length, "X")
            : "N/A",
          ifscCode: c.ifscCode || "N/A",
          upiId: c.upiId || "N/A",
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
        };
      });
      break;
    }

    case "transactions": {
      const where = {
        event: { entryFee: { gt: 0 } },
        OR: [
          { paymentStatus: { in: ["SUCCESS", "APPROVED", "PENDING", "REJECTED", "NEED_MORE_DETAILS"] } },
          { amountPaid: { gt: 0 } },
          { transactionId: { not: null } },
        ],
      };
      if (effectiveClubId) where.event = { ...where.event, clubId: effectiveClubId };
      if (filters.eventId && filters.eventId !== "all") where.eventId = filters.eventId;
      if (filters.paymentStatus && filters.paymentStatus !== "all") where.paymentStatus = filters.paymentStatus;

      if (dateRange) {
        where.createdAt = { gte: dateRange.gte, lte: dateRange.lte };
      }

      totalCount = await prisma.participation.count({ where });
      const rawTxns = await prisma.participation.findMany({
        where,
        include: {
          student: { select: { name: true, rollNo: true, email: true } },
          event: { select: { title: true, club: { select: { clubName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawTxns.map((t) => {
        const isCentral = t.event?.organizerType === "CENTRAL" || !!t.event?.centralOrganizerId || (!t.event?.club && !t.event?.clubId);
        return {
          transactionId: t.transactionId || "N/A",
          studentName: t.student?.name || t.externalName || "N/A",
          rollNo: t.student?.rollNo || "N/A",
          email: t.student?.email || t.externalEmail || "N/A",
          eventName: t.event?.title || "N/A",
          clubName: t.event?.club?.clubName || (isCentral ? "ODSW" : "N/A"),
          payerName: t.payerName || "N/A",
          amountPaid: t.amountPaid || 0,
          paymentStatus: t.paymentStatus || "N/A",
          paymentRemarks: t.paymentRemarks || "",
          paymentReviewedBy: t.paymentReviewedBy || "N/A",
          createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
        };
      });
      break;
    }

    case "payouts": {
      const where = { entryFee: { gt: 0 } };
      if (effectiveClubId) where.clubId = effectiveClubId;
      if (filters.eventId && filters.eventId !== "all") where.id = filters.eventId;
      if (filters.payoutStatus && filters.payoutStatus !== "all") where.payoutStatus = filters.payoutStatus;

      if (dateRange) {
        where.startTime = { gte: dateRange.gte, lte: dateRange.lte };
      }

      totalCount = await prisma.event.count({ where });
      const rawPayoutEvents = await prisma.event.findMany({
        where,
        include: {
          club: { select: { clubName: true } },
          participations: {
            where: { paymentStatus: { in: ["SUCCESS", "APPROVED"] } },
            select: { amountPaid: true },
          },
        },
        orderBy: { startTime: "desc" },
        skip: isExport ? undefined : skip,
        take: isExport ? undefined : take,
      });

      records = rawPayoutEvents.map((e) => {
        const totalRevenue = (e.participations || []).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const isCentral = e.organizerType === "CENTRAL" || !!e.centralOrganizerId || (!e.club && !e.clubId);
        return {
          id: e.id,
          title: e.title,
          clubName: e.club?.clubName || (isCentral ? "ODSW" : "N/A"),
          entryFee: e.entryFee || 0,
          registeredCount: e.registeredCount || 0,
          totalRevenue,
          payoutStatus: e.payoutStatus || "PENDING",
          startTime: e.startTime ? new Date(e.startTime).toLocaleString() : "",
          registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline).toLocaleString() : "",
        };
      });
      break;
    }
  }

  return {
    records,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

/**
 * Generate CSV String with UTF-8 BOM
 */
export function generateCSV(records, selectedColumns, datasetId) {
  const datasetConfig = DATASETS[datasetId];
  if (!datasetConfig) throw new Error("Invalid dataset");

  const columnMap = new Map(datasetConfig.allColumns.map((col) => [col.id, col.label]));
  const activeCols = selectedColumns && selectedColumns.length > 0
    ? selectedColumns.filter((colId) => columnMap.has(colId))
    : datasetConfig.defaultColumns;

  const headers = activeCols.map((colId) => columnMap.get(colId) || colId);

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows = records.map((rec) =>
    activeCols.map((colId) => escapeCSV(rec[colId])).join(",")
  );

  return `\uFEFF${headers.map(escapeCSV).join(",")}\n${rows.join("\n")}`;
}

export async function recordExportLog({ dataset, recordCount, actorId, actorEmail, actorRole, filters, columns }) {
  const logEntry = {
    id: createObjectId(),
    dataset,
    recordCount,
    actorId,
    actorEmail,
    actorRole,
    filters: filters || {},
    columns: columns || [],
    createdAt: new Date(),
  };

  exportHistoryMemoryLog.unshift(logEntry);
  if (exportHistoryMemoryLog.length > MAX_MEMORY_LOGS) {
    exportHistoryMemoryLog.pop();
  }

  try {
    if (prisma.exportLog) {
      await prisma.exportLog.create({
        data: {
          id: logEntry.id,
          dataset,
          recordCount,
          actorId,
          actorEmail,
          actorRole,
          filters: filters || {},
          columns: columns || [],
        },
      });
    }
  } catch (err) {
    console.error("Non-fatal: Failed to persist export log to DB:", err.message);
  }

  return logEntry;
}

export async function getExportHistory(limit = 20) {
  try {
    if (prisma.exportLog) {
      const logs = await prisma.exportLog.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      if (logs && logs.length > 0) return logs;
    }
  } catch (err) {
    console.error("Non-fatal: Error reading export history from DB:", err.message);
  }

  return exportHistoryMemoryLog.slice(0, limit);
}
