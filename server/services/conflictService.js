import prisma from "../lib/prisma.js";

export function isVirtualVenue(venue) {
  return typeof venue === "string" && venue.trim().toLowerCase() === "online";
}

export async function checkEventConflict({ venue, startTime, endTime, excludeEventId = null }) {
  if (!venue || isVirtualVenue(venue) || !startTime || !endTime) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const where = {
    venue,
    reviewStatus: "PUBLISHED",
    startTime: { lt: end },
    endTime: { gt: start },
  };

  if (excludeEventId) {
    where.id = { not: excludeEventId };
  }

  return prisma.event.findFirst({
    where,
    include: {
      organizers: {
        include: {
          club: { select: { id: true, clubName: true, slug: true } }
        }
      }
    }
  });
}

export async function checkBlackoutConflict({ venue, startTime, endTime, excludeBlackoutId = null }) {
  if (!venue || isVirtualVenue(venue) || !startTime || !endTime) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);

  try {
    const where = {
      venue,
      startTime: { lt: end },
      endTime: { gt: start },
    };

    if (excludeBlackoutId) {
      where.id = { not: excludeBlackoutId };
    }

    if (prisma.venueBlackout) {
      return await prisma.venueBlackout.findFirst({ where });
    } else {
      const rows = await prisma.$queryRaw`
        SELECT * FROM "VenueBlackout"
        WHERE venue = ${venue}
          AND "startTime" < ${end}
          AND "endTime" > ${start}
        LIMIT 1
      `;
      return rows[0] || null;
    }
  } catch (err) {
    console.warn("Blackout check error (table might be uninitialized):", err.message);
    return null;
  }
}

export async function validateBooking({ venue, startTime, endTime, excludeEventId = null, excludeBlackoutId = null }) {
  if (isVirtualVenue(venue)) {
    return {
      hasConflict: false,
      type: null,
      message: null,
      conflictDetails: null,
    };
  }

  const blackoutConflict = await checkBlackoutConflict({ venue, startTime, endTime, excludeBlackoutId });
  if (blackoutConflict) {
    return {
      hasConflict: true,
      type: "BLACKOUT",
      message: `Venue "${venue}" is unavailable due to blackout: ${blackoutConflict.title}${blackoutConflict.reason ? ` (${blackoutConflict.reason})` : ''}`,
      conflictDetails: blackoutConflict
    };
  }

  const eventConflict = await checkEventConflict({ venue, startTime, endTime, excludeEventId });
  if (eventConflict) {
    return {
      hasConflict: true,
      type: "EVENT_OVERLAP",
      message: `Venue "${venue}" is already booked for "${eventConflict.title}" (${eventConflict.organizers?.[0]?.club?.clubName || "Club"}).`,
      conflictDetails: eventConflict
    };
  }

  return {
    hasConflict: false,
    type: null,
    message: null,
    conflictDetails: null
  };
}
