// ============================================
// ASG Leads — Status & Validation Unit Tests
// ============================================

import { describe, it, expect } from "vitest";
import {
  isLeadStatus,
  getLeadStatusLabel,
  isCallableStatus,
  isCallResult,
  getCallResultLabel,
  isLeadSource,
  getLeadSourceLabel,
  LEAD_STATUSES,
  CALLABLE_STATUSES,
} from "@/lib/domain/status";
import {
  validateLeadInput,
  validateLeadUpdateInput,
  validateStatusChange,
  validateFollowUpDate,
} from "@/lib/domain/validation";

describe("isLeadStatus", () => {
  it("accepts valid statuses", () => {
    expect(isLeadStatus("new")).toBe(true);
    expect(isLeadStatus("callback")).toBe(true);
    expect(isLeadStatus("wrong_number")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isLeadStatus("invalid")).toBe(false);
    expect(isLeadStatus("")).toBe(false);
    expect(isLeadStatus("New")).toBe(false); // case-sensitive
  });
});

describe("getLeadStatusLabel", () => {
  it("returns display labels", () => {
    expect(getLeadStatusLabel("new")).toBe("New");
    expect(getLeadStatusLabel("no_answer")).toBe("No Answer");
    expect(getLeadStatusLabel("wrong_number")).toBe("Wrong Number");
  });
});

describe("isCallableStatus", () => {
  it("includes callable statuses", () => {
    expect(isCallableStatus("new")).toBe(true);
    expect(isCallableStatus("no_answer")).toBe(true);
    expect(isCallableStatus("callback")).toBe(true);
    expect(isCallableStatus("contacted")).toBe(true);
    expect(isCallableStatus("revisit")).toBe(true);
  });

  it("excludes non-callable statuses", () => {
    expect(isCallableStatus("booked")).toBe(false);
    expect(isCallableStatus("not_interested")).toBe(false);
    expect(isCallableStatus("disqualified")).toBe(false);
    expect(isCallableStatus("wrong_number")).toBe(false);
  });
});

describe("isCallResult", () => {
  it("accepts valid call results", () => {
    expect(isCallResult("no_answer")).toBe(true);
    expect(isCallResult("contacted")).toBe(true);
    expect(isCallResult("booked")).toBe(true);
  });

  it("rejects invalid call results", () => {
    expect(isCallResult("invalid")).toBe(false);
    expect(isCallResult("No Answer")).toBe(false);
  });
});

describe("validateLeadInput", () => {
  it("validates a correct lead", () => {
    const result = validateLeadInput({
      name: "John Smith",
      mobile: "0412 345 678",
      address: "123 Test St",
      suburb: "Perth CBD",
      source: "manual_entry",
    });
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("rejects short name", () => {
    const result = validateLeadInput({
      name: "J",
      mobile: "0412 345 678",
      address: "123 Test St",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name must be at least 2 characters");
  });

  it("rejects invalid mobile", () => {
    const result = validateLeadInput({
      name: "John Smith",
      mobile: "123",
      address: "123 Test St",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid Australian mobile number");
  });

  it("rejects missing address", () => {
    const result = validateLeadInput({
      name: "John Smith",
      mobile: "0412 345 678",
      address: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Address is required");
  });

  it("rejects invalid source", () => {
    const result = validateLeadInput({
      name: "John Smith",
      mobile: "0412 345 678",
      address: "123 Test St",
      source: "invalid_source" as any,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid lead source");
  });
});

describe("validateLeadUpdateInput", () => {
  it("allows partial updates", () => {
    const result = validateLeadUpdateInput({ name: "Updated Name" });
    expect(result.valid).toBe(true);
  });

  it("validates mobile if provided", () => {
    const result = validateLeadUpdateInput({ mobile: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid Australian mobile number");
  });

  it("skips mobile validation if not provided", () => {
    const result = validateLeadUpdateInput({ name: "Valid Name" });
    expect(result.valid).toBe(true);
  });
});

describe("validateStatusChange", () => {
  it("accepts valid transition", () => {
    const result = validateStatusChange("new", "contacted");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid from status", () => {
    const result = validateStatusChange("invalid" as any, "contacted");
    expect(result.valid).toBe(false);
  });

  it("rejects invalid to status", () => {
    const result = validateStatusChange("new", "invalid" as any);
    expect(result.valid).toBe(false);
  });
});

describe("validateFollowUpDate", () => {
  it("accepts valid date", () => {
    const result = validateFollowUpDate("2026-12-31T14:00");
    expect(result.valid).toBe(true);
  });

  it("rejects empty date", () => {
    const result = validateFollowUpDate("");
    expect(result.valid).toBe(false);
  });

  it("rejects invalid date", () => {
    const result = validateFollowUpDate("not-a-date");
    expect(result.valid).toBe(false);
  });
});
