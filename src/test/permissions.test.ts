// ============================================
// ASG Leads — Authorization Unit Tests
// ============================================
// Tests for permission helper functions
// Run with: npm run test (vitest)

import { describe, it, expect } from "vitest";
import type { UserProfile } from "@/lib/auth/types";
import {
  isAdmin,
  isManager,
  isRep,
  isActive,
  canAccessAdmin,
  canManageUsers,
  canManageSettings,
  canManageOffices,
  canManageTeams,
  canImportLeads,
  canAccessReports,
  canViewAllOffices,
  canAccessOffice,
  canManageOffice,
  canViewLead,
  canEditLead,
  getAccessibleOffices,
  getDefaultOffice,
} from "@/lib/auth/permissions";

function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "test-uid",
    email: "test@example.test",
    displayName: "Test User",
    role: "rep",
    officeIds: ["perth"],
    primaryOfficeId: "perth",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Role identification", () => {
  it("should correctly identify admin role", () => {
    const user = createMockUser({ role: "admin" });
    expect(isAdmin(user)).toBe(true);
    expect(isManager(user)).toBe(false);
    expect(isRep(user)).toBe(false);
  });

  it("should correctly identify manager role", () => {
    const user = createMockUser({ role: "manager" });
    expect(isAdmin(user)).toBe(false);
    expect(isManager(user)).toBe(true);
    expect(isRep(user)).toBe(false);
  });

  it("should correctly identify rep role", () => {
    const user = createMockUser({ role: "rep" });
    expect(isAdmin(user)).toBe(false);
    expect(isManager(user)).toBe(false);
    expect(isRep(user)).toBe(true);
  });

  it("should return false for null user", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isManager(null)).toBe(false);
    expect(isRep(null)).toBe(false);
  });
});

describe("Status checks", () => {
  it("should identify active users", () => {
    const user = createMockUser({ status: "active" });
    expect(isActive(user)).toBe(true);
  });

  it("should identify disabled users", () => {
    const user = createMockUser({ status: "disabled" });
    expect(isActive(user)).toBe(false);
  });
});

describe("Admin access", () => {
  it("should allow admin to access admin areas", () => {
    const user = createMockUser({ role: "admin" });
    expect(canAccessAdmin(user)).toBe(true);
  });

  it("should allow manager to access admin areas", () => {
    const user = createMockUser({ role: "manager" });
    expect(canAccessAdmin(user)).toBe(true);
  });

  it("should deny rep access to admin areas", () => {
    const user = createMockUser({ role: "rep" });
    expect(canAccessAdmin(user)).toBe(false);
  });

  it("should allow only admin to manage users", () => {
    expect(canManageUsers(createMockUser({ role: "admin" }))).toBe(true);
    expect(canManageUsers(createMockUser({ role: "manager" }))).toBe(false);
    expect(canManageUsers(createMockUser({ role: "rep" }))).toBe(false);
  });

  it("should allow only admin to manage settings", () => {
    expect(canManageSettings(createMockUser({ role: "admin" }))).toBe(true);
    expect(canManageSettings(createMockUser({ role: "manager" }))).toBe(false);
    expect(canManageSettings(createMockUser({ role: "rep" }))).toBe(false);
  });
});

describe("Import and report access", () => {
  it("should allow admin and manager to import leads", () => {
    expect(canImportLeads(createMockUser({ role: "admin" }))).toBe(true);
    expect(canImportLeads(createMockUser({ role: "manager" }))).toBe(true);
    expect(canImportLeads(createMockUser({ role: "rep" }))).toBe(false);
  });

  it("should allow admin and manager to access reports", () => {
    expect(canAccessReports(createMockUser({ role: "admin" }))).toBe(true);
    expect(canAccessReports(createMockUser({ role: "manager" }))).toBe(true);
    expect(canAccessReports(createMockUser({ role: "rep" }))).toBe(false);
  });
});

describe("Office access", () => {
  it("should allow admin to access all offices", () => {
    const user = createMockUser({ role: "admin" });
    expect(canViewAllOffices(user)).toBe(true);
    expect(canAccessOffice(user, "perth")).toBe(true);
    expect(canAccessOffice(user, "brisbane")).toBe(true);
  });

  it("should restrict rep to assigned office", () => {
    const user = createMockUser({ role: "rep", officeIds: ["perth"] });
    expect(canViewAllOffices(user)).toBe(false);
    expect(canAccessOffice(user, "perth")).toBe(true);
    expect(canAccessOffice(user, "brisbane")).toBe(false);
  });

  it("should restrict manager to assigned office", () => {
    const user = createMockUser({ role: "manager", officeIds: ["perth"] });
    expect(canViewAllOffices(user)).toBe(false);
    expect(canAccessOffice(user, "perth")).toBe(true);
    expect(canAccessOffice(user, "brisbane")).toBe(false);
  });

  it("should allow multi-office manager access to both offices", () => {
    const user = createMockUser({ role: "manager", officeIds: ["perth", "brisbane"] });
    expect(canAccessOffice(user, "perth")).toBe(true);
    expect(canAccessOffice(user, "brisbane")).toBe(true);
  });

  it("should return false for null user office access", () => {
    expect(canAccessOffice(null, "perth")).toBe(false);
  });
});

describe("Lead visibility and edit permissions", () => {
  it("should allow admin to view and edit all leads", () => {
    const user = createMockUser({ role: "admin" });
    expect(canViewLead(user, "perth", "some-rep")).toBe(true);
    expect(canViewLead(user, "brisbane", "some-rep")).toBe(true);
    expect(canEditLead(user, "perth", "some-rep")).toBe(true);
    expect(canEditLead(user, "brisbane", "some-rep")).toBe(true);
  });

  it("should allow manager to view and edit leads in their office", () => {
    const user = createMockUser({ role: "manager", officeIds: ["perth"] });
    expect(canViewLead(user, "perth", "some-rep")).toBe(true);
    expect(canViewLead(user, "brisbane", "some-rep")).toBe(false);
    expect(canEditLead(user, "perth", "some-rep")).toBe(true);
    expect(canEditLead(user, "brisbane", "some-rep")).toBe(false);
  });

  it("should allow rep to view only assigned leads in their office", () => {
    const user = createMockUser({ role: "rep", officeIds: ["perth"], uid: "rep-1" });
    expect(canViewLead(user, "perth", "rep-1")).toBe(true);
    expect(canViewLead(user, "perth", "rep-2")).toBe(false);
    expect(canViewLead(user, "brisbane", "rep-1")).toBe(false);
    expect(canEditLead(user, "perth", "rep-1")).toBe(true);
    expect(canEditLead(user, "perth", "rep-2")).toBe(false);
  });

  it("should return false for null user lead access", () => {
    expect(canViewLead(null, "perth", "some-rep")).toBe(false);
    expect(canEditLead(null, "perth", "some-rep")).toBe(false);
  });
});

describe("Accessible offices", () => {
  it("should return all offices for admin", () => {
    const user = createMockUser({ role: "admin" });
    const offices = getAccessibleOffices(user);
    expect(offices).toContain("perth");
    expect(offices).toContain("brisbane");
  });

  it("should return assigned offices for manager", () => {
    const user = createMockUser({ role: "manager", officeIds: ["perth"] });
    const offices = getAccessibleOffices(user);
    expect(offices).toEqual(["perth"]);
  });

  it("should return assigned offices for rep", () => {
    const user = createMockUser({ role: "rep", officeIds: ["perth"] });
    const offices = getAccessibleOffices(user);
    expect(offices).toEqual(["perth"]);
  });

  it("should return empty array for null user", () => {
    expect(getAccessibleOffices(null)).toEqual([]);
  });
});

describe("Default office", () => {
  it("should return primary office if valid", () => {
    const user = createMockUser({ primaryOfficeId: "perth", officeIds: ["perth"] });
    expect(getDefaultOffice(user)).toBe("perth");
  });

  it("should return first office if primary is invalid", () => {
    const user = createMockUser({ primaryOfficeId: null, officeIds: ["brisbane"] });
    expect(getDefaultOffice(user)).toBe("brisbane");
  });

  it("should return perth for null user", () => {
    expect(getDefaultOffice(null)).toBe("perth");
  });
});
