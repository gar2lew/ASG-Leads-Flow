// ============================================
// ASG Leads — Permissions / Authorization Helpers
// ============================================
// Central permission logic — do not scatter role strings across components

import type { UserProfile, AuthRole, OfficeId } from "./types";

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === "admin";
}

export function isManager(user: UserProfile | null): boolean {
  return user?.role === "manager";
}

export function isRep(user: UserProfile | null): boolean {
  return user?.role === "rep";
}

export function isActive(user: UserProfile | null): boolean {
  return user?.status === "active";
}

export function canAccessAdmin(user: UserProfile | null): boolean {
  return isAdmin(user) || isManager(user);
}

export function canManageUsers(user: UserProfile | null): boolean {
  return isAdmin(user);
}

export function canManageSettings(user: UserProfile | null): boolean {
  return isAdmin(user);
}

export function canManageOffices(user: UserProfile | null): boolean {
  return isAdmin(user);
}

export function canManageTeams(user: UserProfile | null): boolean {
  return isAdmin(user);
}

export function canImportLeads(user: UserProfile | null): boolean {
  return isAdmin(user) || isManager(user);
}

export function canAccessReports(user: UserProfile | null): boolean {
  return isAdmin(user) || isManager(user);
}

export function canViewAllOffices(user: UserProfile | null): boolean {
  return isAdmin(user);
}

export function canAccessOffice(user: UserProfile | null, officeId: OfficeId): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.officeIds.includes(officeId);
}

export function canManageOffice(user: UserProfile | null, officeId: OfficeId): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) return user.officeIds.includes(officeId);
  return false;
}

export function canViewLead(user: UserProfile | null, leadOfficeId: OfficeId, assignedRepId?: string | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!user.officeIds.includes(leadOfficeId)) return false;
  if (isManager(user)) return true;
  // Rep can see assigned leads in their office
  return assignedRepId === user.uid;
}

export function canEditLead(user: UserProfile | null, leadOfficeId: OfficeId, assignedRepId?: string | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!user.officeIds.includes(leadOfficeId)) return false;
  if (isManager(user)) return true;
  return assignedRepId === user.uid;
}

export function getAccessibleOffices(user: UserProfile | null): OfficeId[] {
  if (!user) return [];
  if (isAdmin(user)) return ["perth", "brisbane"];
  return user.officeIds;
}

export function getDefaultOffice(user: UserProfile | null): OfficeId {
  if (!user) return "perth";
  if (user.primaryOfficeId && user.officeIds.includes(user.primaryOfficeId)) {
    return user.primaryOfficeId;
  }
  return user.officeIds[0] ?? "perth";
}
