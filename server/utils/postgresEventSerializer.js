import { getEventStatus } from "./eventStatus.js";
import { calculateAcademicProgress } from "./academicProgress.js";

export function serializeEvent(event) {
  if (!event) return event;

  const actualRegCount = typeof event._count?.participations === 'number'
    ? event._count.participations
    : (Array.isArray(event.participations)
        ? event.participations.filter(p => p.status === 'REGISTERED' || p.status === 'ATTENDED').length
        : (typeof event.registeredCount === 'number' ? event.registeredCount : 0));

  return {
    ...event,
    _id: event.id,
    registeredCount: Math.max(0, actualRegCount),
    createdBy: event.createdBy
      ? { ...event.createdBy, _id: event.createdBy.id }
      : event.createdBy,
    reviewedBy: event.reviewedBy
      ? { ...event.reviewedBy, _id: event.reviewedBy.id }
      : event.reviewedBy,
    centralOrganizer: event.centralOrganizer
      ? { ...event.centralOrganizer, _id: event.centralOrganizer.id }
      : event.centralOrganizer,
    clubId: event.clubId ?? event.club?.id ?? null,
    club: event.club
      ? { ...event.club, _id: event.club.id }
      : event.club,
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
  } else if (participation.externalUser || participation.externalName || participation.externalEmail) {
    const rawExternal = participation.externalUser;
    user = {
      id: participation.externalUserId || rawExternal?.id || null,
      _id: participation.externalUserId || rawExternal?.id || null,
      name: rawExternal?.name || participation.externalName || "External Participant",
      email: rawExternal?.email || participation.externalEmail || "",
      collegeName: rawExternal?.collegeName || "External College",
      rollNo: rawExternal?.collegeName || "External",
      profileImage: rawExternal?.profileImage || null,
      phone: rawExternal?.phone || null,
      isExternal: true,
    };
  }

  return {
    ...participation,
    _id: participation.id,
    userId: participation.studentId || participation.externalUserId || participation.externalEmail,
    user,
    event: participation.event ? serializeEvent(participation.event) : participation.event,
  };
}
