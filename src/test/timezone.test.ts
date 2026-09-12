// ============================================
// ASG Leads — Timezone Tests
// ============================================
// Tests timezone handling for Perth and Brisbane offices.

import { describe, it, expect } from "vitest";
import { formatZonedTime, startOfDayInTimeZone, officeToTimeZone, classifyFollowUpTime } from "@/lib/timezone";

describe("TIMEZONE", () => {
  describe("officeToTimeZone", () => {
    it("returns Australia/Perth for perth office", () => {
      expect(officeToTimeZone("perth")).toBe("Australia/Perth");
    });

    it("returns Australia/Brisbane for brisbane office", () => {
      expect(officeToTimeZone("brisbane")).toBe("Australia/Brisbane");
    });

    it("returns UTC for unknown office", () => {
      expect(officeToTimeZone("unknown")).toBe("UTC");
    });
  });

  describe("formatZonedTime", () => {
    it("formats a UTC time in Perth timezone (UTC+8)", () => {
      // 2026-09-12T10:00:00Z -> Perth: 2026-09-12T18:00:00
      const utcDate = new Date("2026-09-12T10:00:00Z");
      const formatted = formatZonedTime(utcDate, "Australia/Perth", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      // Perth is UTC+8, so 10:00 UTC = 18:00 Perth
      // Note: en-AU locale formats September as "Sept" not "Sep"
      expect(formatted).toContain("12 Sept 2026");
      expect(formatted).toContain("6:00"); // 18:00 in 12-hour format
    });

    it("formats a UTC time in Brisbane timezone (UTC+10)", () => {
      const utcDate = new Date("2026-09-12T10:00:00Z");
      const formatted = formatZonedTime(utcDate, "Australia/Brisbane", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      // Brisbane is UTC+10, so 10:00 UTC = 20:00 Brisbane
      expect(formatted).toContain("12 Sept 2026");
      expect(formatted).toContain("8:00"); // 20:00 in 12-hour format
    });
  });

  describe("startOfDayInTimeZone", () => {
    it("returns start of day in Perth timezone", () => {
      // 2026-09-12T20:00:00Z is 2026-09-13T04:00:00 in Perth (UTC+8)
      const utcString = "2026-09-12T20:00:00.000Z";
      const result = startOfDayInTimeZone(utcString, "Australia/Perth");
      
      // In Perth, 2026-09-12T20:00:00Z is 2026-09-13T04:00:00 Perth time
      // So start of day should be 2026-09-13T00:00:00
      const expectedYear = result.getUTCFullYear();
      const expectedMonth = result.getUTCMonth();
      const expectedDay = result.getUTCDate();
      
      // Perth is UTC+8, so 20:00 UTC = 04:00 next day Perth
      expect(expectedYear).toBe(2026);
      expect(expectedMonth).toBe(8); // September (0-indexed)
      expect(expectedDay).toBe(13);
    });

    it("returns start of day in Brisbane timezone", () => {
      // 2026-09-12T15:00:00Z is 2026-09-13T01:00:00 in Brisbane (UTC+10)
      const utcString = "2026-09-12T15:00:00.000Z";
      const result = startOfDayInTimeZone(utcString, "Australia/Brisbane");
      
      // Brisbane is UTC+10, so 15:00 UTC = 01:00 next day Brisbane
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(8);
      expect(result.getUTCDate()).toBe(13);
    });

    it("handles midnight boundary correctly", () => {
      // 2026-09-12T16:00:00Z is 2026-09-13T00:00:00 in Perth (UTC+8)
      const utcString = "2026-09-12T16:00:00.000Z";
      const result = startOfDayInTimeZone(utcString, "Australia/Perth");
      
      // Should be 2026-09-13T00:00:00 UTC (which represents 2026-09-13T00:00:00 Perth)
      expect(result.getUTCDate()).toBe(13);
    });
  });

  describe("classifyFollowUpTime", () => {
    it("classifies overdue follow-up", () => {
      const now = new Date("2026-09-12T10:00:00Z");
      const scheduledAt = "2026-09-11T09:00:00Z"; // yesterday in Perth
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("overdue");
    });

    it("classifies today follow-up in Perth", () => {
      const now = new Date("2026-09-12T10:00:00Z"); // 18:00 Perth
      const scheduledAt = "2026-09-12T12:00:00Z"; // 20:00 Perth (today)
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("today");
    });

    it("classifies tomorrow follow-up in Perth", () => {
      const now = new Date("2026-09-12T10:00:00Z"); // 18:00 Perth
      const scheduledAt = "2026-09-13T02:00:00Z"; // 10:00 Perth tomorrow
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("tomorrow");
    });

    it("classifies upcoming follow-up in Perth", () => {
      const now = new Date("2026-09-12T10:00:00Z"); // 18:00 Perth
      const scheduledAt = "2026-09-15T02:00:00Z"; // 10:00 Perth on Monday
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("upcoming");
    });

    it("classifies today follow-up in Brisbane", () => {
      const now = new Date("2026-09-12T10:00:00Z"); // 20:00 Brisbane
      const scheduledAt = "2026-09-12T12:00:00Z"; // 22:00 Brisbane (today)
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Brisbane");
      expect(result).toBe("today");
    });

    it("classifies overdue at day boundary in Perth", () => {
      // Now is 2026-09-12T15:59:59Z = 2026-09-12T23:59:59 Perth
      const now = new Date("2026-09-12T15:59:59Z");
      // Scheduled at 2026-09-12T00:00:01Z = 2026-09-12T08:00:01 Perth
      const scheduledAt = "2026-09-12T00:00:01Z";
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("today");
    });

    it("handles exact midnight boundary - overdue", () => {
      // Now is exactly 2026-09-12T16:00:00Z = 2026-09-13T00:00:00 Perth
      // Start of day in Perth = Sept 13 00:00 Perth
      const now = new Date("2026-09-12T16:00:00Z");
      // Scheduled at 2026-09-12T15:59:59Z = 2026-09-12T23:59:59 Perth time
      // This is still Sept 12 in Perth, so it's OVERDUE (before todayStart which is Sept 13)
      const scheduledAt = "2026-09-12T15:59:59Z";
      const result = classifyFollowUpTime(scheduledAt, now, "Australia/Perth");
      expect(result).toBe("overdue");
    });
  });
});