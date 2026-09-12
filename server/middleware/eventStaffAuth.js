import prisma from "../lib/prisma.js";

/**
 * Verify if a user has attendance permission for a specific event.
 * Checks:
 * 1. Admin
 * 2. Faculty coordinator for an organizer club
 * 3. Event creator
 * 4. Club member with attendance permission or club head/coordinator for an organizer club
 */
export async function verifyAttendancePermission(userId, eventId, event, user) {
  if (!user) return false;
  if (user.role === "admin" || user.principalType === "ADMIN") return true;

  const eventWithOrganizers = event?.organizers ? event : await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizers: true },
  });
  if (!eventWithOrganizers) return false;

  const organizerClubIds = (eventWithOrganizers.organizers || []).map((o) => o.clubId);

  if (user.role === "facultyCoordinator" && user.clubId && organizerClubIds.includes(user.clubId)) {
    return true;
  }

  if (String(eventWithOrganizers.createdById) === String(userId)) {
    return true;
  }

  if (organizerClubIds.length === 0) return false;

  const membership = await prisma.clubMembership.findFirst({
    where: {
      studentId: userId,
      clubId: { in: organizerClubIds },
      OR: [
        { canTakeAttendance: true },
        { role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
      ],
    },
  });

  return Boolean(membership);
}
