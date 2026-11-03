import { describe, expect, it } from "vitest";
import {
  buildAppointmentActivityData,
  getCallSchedulingError,
  parseOfficeLocalDateTime,
} from "@/lib/domain/call-scheduling";

describe("parseOfficeLocalDateTime", () => {
  it("converts Perth office-local input to UTC", () => {
    expect(parseOfficeLocalDateTime("2026-11-03T09:30", "perth")?.toISOString()).toBe(
      "2026-11-03T01:30:00.000Z",
    );
  });

  it("converts Brisbane office-local input to UTC", () => {
    expect(parseOfficeLocalDateTime("2026-11-03T09:30", "brisbane")?.toISOString()).toBe(
      "2026-11-02T23:30:00.000Z",
    );
  });

  it("rejects invalid dates and malformed local date-times", () => {
    expect(parseOfficeLocalDateTime("2026-02-30T09:30", "perth")).toBeNull();
    expect(parseOfficeLocalDateTime("03/11/2026 09:30", "perth")).toBeNull();
  });
});

describe("getCallSchedulingError", () => {
  it("requires both callback date and time", () => {
    expect(getCallSchedulingError("Callback", "2026-11-03", "", "", "perth")).toBe(
      "Callback date and time are required.",
    );
  });

  it("accepts a complete callback schedule", () => {
    expect(getCallSchedulingError("Callback", "2026-11-03", "09:30", "", "perth")).toBeNull();
  });

  it("rejects invalid callback dates", () => {
    expect(getCallSchedulingError("Callback", "2026-02-30", "09:30", "", "perth")).toBe(
      "Enter a valid callback date and time.",
    );
  });

  it("requires an appointment date and time for booked calls", () => {
    expect(getCallSchedulingError("Booked", "", "", "", "brisbane")).toBe(
      "Appointment date and time are required.",
    );
  });

  it("accepts a complete appointment schedule", () => {
    expect(getCallSchedulingError("Booked", "", "", "2026-11-03T09:30", "brisbane")).toBeNull();
  });

  it("rejects invalid appointment date-times", () => {
    expect(getCallSchedulingError("Booked", "", "", "2026-02-30T09:30", "brisbane")).toBe(
      "Enter a valid appointment date and time.",
    );
  });

  it("does not require scheduling details for other outcomes", () => {
    expect(getCallSchedulingError("Contacted", "", "", "", "perth")).toBeNull();
  });
});

describe("buildAppointmentActivityData", () => {
  it("records the booked time in the lead office's local timezone", () => {
    const appointmentAt = new Date("2026-11-03T01:30:00.000Z");
    const activity = buildAppointmentActivityData(appointmentAt, "perth");

    expect(activity.type).toBe("appointment_booked");
    expect(activity.description).toContain("9:30 am");
    expect(activity.metadata).toEqual({ callResult: "Booked", appointmentAt });
  });
});
