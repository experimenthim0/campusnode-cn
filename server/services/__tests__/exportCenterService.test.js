import { describe, it, expect } from "vitest";
import {
  DATASETS,
  getSessionDateRange,
  getAuthorizedDatasets,
  generateCSV,
  recordExportLog,
  getExportHistory,
} from "../exportCenterService.js";
import { PERMISSIONS } from "../../utils/rbac.js";

describe("Export Center Service Unit Tests", () => {
  describe("Academic Session & Semester Date Range Calculation", () => {
    it("Calculates correct date range for Odd Semester (July 1 to Dec 31)", () => {
      const range = getSessionDateRange("2026–27", "Odd");
      expect(range).not.toBeNull();
      expect(range.gte.getFullYear()).toBe(2026);
      expect(range.gte.getMonth()).toBe(6); // July (0-indexed)
      expect(range.gte.getDate()).toBe(1);

      expect(range.lte.getFullYear()).toBe(2026);
      expect(range.lte.getMonth()).toBe(11); // Dec
      expect(range.lte.getDate()).toBe(31);
    });

    it("Calculates correct date range for Even Semester (Jan 1 to June 30)", () => {
      const range = getSessionDateRange("2026–27", "Even");
      expect(range).not.toBeNull();
      expect(range.gte.getFullYear()).toBe(2027);
      expect(range.gte.getMonth()).toBe(0); // Jan
      expect(range.gte.getDate()).toBe(1);

      expect(range.lte.getFullYear()).toBe(2027);
      expect(range.lte.getMonth()).toBe(5); // June
      expect(range.lte.getDate()).toBe(30);
    });

    it("Calculates full session date range when semester is All", () => {
      const range = getSessionDateRange("2026–27", "All");
      expect(range).not.toBeNull();
      expect(range.gte.getFullYear()).toBe(2026);
      expect(range.lte.getFullYear()).toBe(2027);
    });

    it("Returns null for 'all' session parameter", () => {
      expect(getSessionDateRange("all", "Odd")).toBeNull();
    });
  });

  describe("Authorized Datasets Filter", () => {
    it("Admin user should get access to all active datasets", () => {
      const adminUser = { userId: "admin1", role: "admin" };
      const datasets = getAuthorizedDatasets(adminUser);
      expect(datasets.length).toBe(6);
      const datasetIds = datasets.map((d) => d.id);
      expect(datasetIds).toContain("events");
      expect(datasetIds).toContain("registrations");
      expect(datasetIds).toContain("students");
      expect(datasetIds).toContain("clubs");
      expect(datasetIds).toContain("transactions");
      expect(datasetIds).toContain("payouts");
    });

    it("Faculty coordinator should get access to faculty authorized datasets", () => {
      const facultyUser = { userId: "fac1", role: "facultyCoordinator", clubId: "club1" };
      const datasets = getAuthorizedDatasets(facultyUser);
      const datasetIds = datasets.map((d) => d.id);

      expect(datasetIds).toContain("events");
      expect(datasetIds).toContain("registrations");
      expect(datasetIds).toContain("clubs");
    });
  });

  describe("CSV Generation", () => {
    it("Generates valid CSV with UTF-8 BOM, headers, and quoted field values", () => {
      const mockRecords = [
        {
          id: "evt1",
          title: "Hackathon 2026",
          clubName: "LADC, NITJ",
          venue: "Main Auditorium",
          startTime: "8/18/2026, 10:00:00 AM",
          entryFee: 100,
          reviewStatus: "PUBLISHED",
          registeredCount: 150,
        },
      ];

      const columns = ["title", "clubName", "venue", "entryFee", "reviewStatus"];
      const csv = generateCSV(mockRecords, columns, "events");

      // Verify UTF-8 BOM prefix
      expect(csv.startsWith("\uFEFF")).toBe(true);

      expect(csv).includes('"Event Title","Organising Club","Venue","Entry Fee (₹)","Approval Status"');

      expect(csv).includes('"Hackathon 2026","LADC, NITJ","Main Auditorium","100","PUBLISHED"');
    });
  });

  describe("Export History Audit Log", () => {
    it(
      "Records export metadata into history buffer",
      async () => {
        const log = await recordExportLog({
          dataset: "events",
          recordCount: 42,
          actorId: "admin_test",
          actorEmail: "clubsetuadmin@nitj.ac.in",
          actorRole: "admin",
          filters: { session: "2026–27" },
          columns: ["title", "venue"],
        });

        const history = await getExportHistory(10);
        expect(history.length).toBeGreaterThan(0);
        const latest = history[0];
        expect(latest.dataset).toBe("events");
        expect(latest.recordCount).toBe(42);
        expect(latest.actorEmail).toBe("clubsetuadmin@nitj.ac.in");

        try {
          if (prisma.exportLog && log?.id) {
            await prisma.exportLog.delete({ where: { id: log.id } });
          }
        } catch {
        }
      },
      15000
    );
  });
});
