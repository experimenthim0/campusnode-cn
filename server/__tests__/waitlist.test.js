import { describe, it, expect, vi } from "vitest";
import {
  MAX_WAITLIST_CAPACITY,
  isWaitlistAllowed,
  isWaitlistFull,
  promoteWaitlistCandidates,
  notifyWaitlistCleared,
} from "../services/waitlistService.js";
import { serializeEvent } from "../utils/postgresEventSerializer.js";

describe("Waitlist Service Unit Tests", () => {
  describe("Capacity & Limit Constants", () => {
    it("should strictly enforce a 5-person waitlist capacity", () => {
      expect(MAX_WAITLIST_CAPACITY).toBe(5);
    });

    it("should accurately determine if waitlist is allowed for an event", () => {
      expect(isWaitlistAllowed(null)).toBe(false);
      expect(isWaitlistAllowed({})).toBe(false);
      expect(isWaitlistAllowed({ totalSeats: 0, allowWaitlist: true })).toBe(false);
      expect(isWaitlistAllowed({ totalSeats: -1, allowWaitlist: true })).toBe(false);
      expect(isWaitlistAllowed({ totalSeats: 50, allowWaitlist: false })).toBe(false);
      expect(isWaitlistAllowed({ totalSeats: 50, allowWaitlist: true })).toBe(true);
      expect(isWaitlistAllowed({ totalSeats: 50 })).toBe(true); // Default backwards-compatible
    });

    it("should accurately determine if waitlist is full", () => {
      expect(isWaitlistFull({ waitingListIds: [] })).toBe(false);
      expect(isWaitlistFull({ waitingListIds: ["id1", "id2", "id3", "id4"] })).toBe(false);
      expect(isWaitlistFull({ waitingListIds: ["id1", "id2", "id3", "id4", "id5"] })).toBe(true);
      expect(isWaitlistFull({ waitingListIds: ["id1", "id2", "id3", "id4", "id5", "id6"] })).toBe(true);
      expect(isWaitlistFull(null)).toBe(false);
      expect(isWaitlistFull({})).toBe(false);
    });
  });

  describe("Event Serializer & Waitlist Count Isolation", () => {
    it("should NOT count WAITLISTED or CANCELLED participants as registered in serializeEvent", () => {
      const rawEvent = {
        id: "evt-full-wl",
        totalSeats: 10,
        registeredCount: 10,
        waitingListIds: ["wl-1", "wl-2"],
        participations: [
          { id: "p1", status: "REGISTERED" },
          { id: "p2", status: "REGISTERED" },
          { id: "p3", status: "ATTENDED" },
          { id: "wl-1", status: "WAITLISTED" },
          { id: "wl-2", status: "WAITLISTED" },
          { id: "p-canc", status: "CANCELLED" },
        ],
      };

      const serialized = serializeEvent(rawEvent);
      // Only REGISTERED (2) + ATTENDED (1) = 3 should be counted, NOT the 2 waitlisted or 1 cancelled
      expect(serialized.registeredCount).toBe(3);
      expect(serialized.waitlistCount).toBe(2);
      expect(serialized.waitingList).toEqual(["wl-1", "wl-2"]);
    });

    it("should ensure registeredCount is never negative", () => {
      const rawEvent = {
        id: "evt-neg",
        totalSeats: 10,
        registeredCount: -5,
      };

      const serialized = serializeEvent(rawEvent);
      expect(serialized.registeredCount).toBe(0);
    });
  });

  describe("promoteWaitlistCandidates safety guards", () => {
    it("should return early when seatsToFill <= 0", async () => {
      const mockTx = {};
      const resZero = await promoteWaitlistCandidates(mockTx, "evt-123", 0);
      expect(resZero).toEqual({ promotedCandidates: [], promotedCount: 0 });

      const resNegative = await promoteWaitlistCandidates(mockTx, "evt-123", -3);
      expect(resNegative).toEqual({ promotedCandidates: [], promotedCount: 0 });
    });

    it("should return early when event is unlimited seats (totalSeats <= 0)", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "evt-unlimited", totalSeats: 0, registeredCount: 10 }]),
      };

      const result = await promoteWaitlistCandidates(mockTx, "evt-unlimited", 2);
      expect(result).toEqual({ promotedCandidates: [], promotedCount: 0 });
    });

    it("should return early when available seats are 0", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "evt-full", totalSeats: 10, registeredCount: 10 }]),
      };

      const result = await promoteWaitlistCandidates(mockTx, "evt-full", 2);
      expect(result).toEqual({ promotedCandidates: [], promotedCount: 0 });
    });

    it("should promote candidates in FIFO order when available seats exist", async () => {
      const mockEvent = {
        id: "evt-100",
        title: "Hackathon 2026",
        totalSeats: 12,
        registeredCount: 10,
        waitingListIds: ["p1", "p2", "p3"],
      };

      const mockCandidates = [
        {
          id: "p1",
          eventId: "evt-100",
          studentId: "student-1",
          qrCode: "ticket-p1",
          status: "WAITLISTED",
        },
        {
          id: "p2",
          eventId: "evt-100",
          studentId: "student-2",
          qrCode: "ticket-p2",
          status: "WAITLISTED",
        },
      ];

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([mockEvent]),
        participation: {
          findMany: vi.fn().mockResolvedValue(mockCandidates),
          update: vi.fn().mockImplementation(({ where, data }) => {
            const found = mockCandidates.find((c) => c.id === where.id);
            return Promise.resolve({
              ...found,
              ...data,
              status: "REGISTERED",
            });
          }),
        },
        event: {
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const result = await promoteWaitlistCandidates(mockTx, "evt-100", 2);

      expect(result.promotedCount).toBe(2);
      expect(result.promotedCandidates).toHaveLength(2);
      expect(result.promotedCandidates[0].id).toBe("p1");
      expect(result.promotedCandidates[0].status).toBe("REGISTERED");
      expect(result.promotedCandidates[1].id).toBe("p2");
      expect(result.promotedCandidates[1].status).toBe("REGISTERED");

      // Verify event was updated with increment and filter
      expect(mockTx.event.update).toHaveBeenCalledWith({
        where: { id: "evt-100" },
        data: {
          registeredCount: { increment: 2 },
          waitingListIds: ["p3"],
        },
      });
    });
  });

  describe("notifyWaitlistCleared safety", () => {
    it("should handle empty or null candidate list gracefully without crashing", async () => {
      await expect(notifyWaitlistCleared(null, [], { title: "Test" })).resolves.not.toThrow();
      await expect(notifyWaitlistCleared(null, null, { title: "Test" })).resolves.not.toThrow();
    });
  });
});
