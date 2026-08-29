import { getEventStatus } from "./eventStatus.js";
import { calculateAcademicProgress } from "./academicProgress.js";

export function serializeEvent(event) {
  if (!event) return event;

  return {
    ...event,
    _id: event.id,
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
    status: getEventStatus(event.startTime, event.endTime),
  };
}

/**
 * Serialize a Participation record.
 * Normalises `student` → `user` in the API response for frontend compatibility.
 */
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
  }

  return {
    ...participation,
    _id: participation.id,
    userId: participation.studentId, // Keep userId for frontend compatibility
    user,
    event: participation.event ? serializeEvent(participation.event) : participation.event,
  };
}
