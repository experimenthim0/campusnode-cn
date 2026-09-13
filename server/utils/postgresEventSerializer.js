import { getEventStatus } from "./eventStatus.js";
import { calculateAcademicProgress } from "./academicProgress.js";

export function serializeEvent(event) {
  if (!event) return event;

  const actualRegCount = typeof event._count?.participations === 'number'
    ? event._count.participations
    : (Array.isArray(event.participations)
        ? event.participations.filter(p => p.status === 'REGISTERED' || p.status === 'ATTENDED').length
        : (typeof event.registeredCount === 'number' ? event.registeredCount : 0));

  const primaryClub = event.organizers?.[0]?.club || event.club || null;
  const primaryClubId = event.organizers?.[0]?.clubId || event.clubId || primaryClub?.id || null;
  const fee = event.registrationFee !== undefined ? event.registrationFee : (event.entryFee ?? 0);
  const extractedUpi = event.upiId ||
    event.paymentInstructions?.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/)?.[0] ||
    event.paymentInstructions?.match(/UPI ID:\s*([^\s\n]+)/i)?.[1] ||
    (event.collegePaymentUrl && event.collegePaymentUrl.includes('@') && !event.collegePaymentUrl.startsWith('http') ? event.collegePaymentUrl : null) ||
    null;

  return {
    ...event,
    _id: event.id,
    entryFee: fee,
    registrationFee: fee,
    upiId: extractedUpi,
    paymentMethod: fee > 0 ? (extractedUpi ? 'MANUAL_TRANSACTION' : (event.collegePaymentUrl ? 'COLLEGE_PAYMENT' : 'MANUAL_TRANSACTION')) : 'FREE',
    registeredCount: Math.max(0, actualRegCount),
    createdBy: event.createdBy
      ? { ...event.createdBy, _id: event.createdBy.id }
      : event.createdBy,
    reviewedBy: event.reviewedBy
      ? { ...event.reviewedBy, _id: event.reviewedBy.id }
      : event.reviewedBy,
    organizers: event.organizers || [],
    clubId: primaryClubId,
    club: primaryClub
      ? { ...primaryClub, _id: primaryClub.id }
      : null,
    waitingList: event.waitingListIds ?? [],
    waitingListIds: event.waitingListIds ?? [],
    waitlistCount: (event.waitingListIds ?? []).length,
    allowWaitlist: event.allowWaitlist !== undefined ? Boolean(event.allowWaitlist) : true,
    status: getEventStatus(event.startTime, event.endTime),
  };
}

export function serializeParticipation(participation) {
  if (!participation) return participation;

  const rawStudent = participation.student;
  let user = null;
  if (rawStudent) {
    const progress = calculateAcademicProgress(rawStudent);
    user = {
      ...rawStudent,
      _id: rawStudent.id,
      year: progress.academicYearLabel,
      academicYear: progress.academicYear,
      academicYearLabel: progress.academicYearLabel,
      semester: progress.semester,
      semesterLabel: progress.semesterLabel,
    };
  } else if (participation.externalUser) {
    const rawExternal = participation.externalUser;
    user = {
      id: participation.externalUserId || rawExternal?.id || null,
      _id: participation.externalUserId || rawExternal?.id || null,
      name: rawExternal?.name || "External Participant",
      email: rawExternal?.email || "",
      collegeName: rawExternal?.collegeName || "External College",
      rollNo: null,
      profileImage: rawExternal?.profileImage || null,
      phone: rawExternal?.phone || null,
      isExternal: true,
    };
  }

  const fee = participation.event?.registrationFee ?? participation.event?.entryFee ?? 0;
  const isPaidSuccess = participation.paymentStatus === "SUCCESS" || participation.paymentStatus === "APPROVED";

  return {
    ...participation,
    _id: participation.id,
    userId: participation.userId || participation.studentId || participation.externalUserId,
    amountPaid: isPaidSuccess ? fee : 0,
    user,
    event: participation.event ? serializeEvent(participation.event) : participation.event,
  };
}

