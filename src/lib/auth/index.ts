// ============================================
// ASG Leads — Auth Provider Index
// ============================================

export { AuthProvider, useAuth } from "./context";
export { signIn, signOut, resetPassword, subscribeToAuthChanges, getAuthToken } from "./client";
export { establishSession, destroySession } from "./session-client";
export type { UserProfile, AuthUser, AuthError, AuthRole, OfficeId, CustomClaims } from "./types";
export * as permissions from "./permissions";
