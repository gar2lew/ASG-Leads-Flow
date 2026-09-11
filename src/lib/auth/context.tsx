// ============================================
// ASG Leads — Auth Provider — HARDENED
// ============================================
// Client-side auth state management with server-side session verification

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getAuthToken, signIn as firebaseSignIn, signOut as firebaseSignOut, resetPassword as firebaseResetPassword, subscribeToAuthChanges } from "./client";
import { establishSession, destroySession } from "./session-client";
import type { UserProfile, AuthUser, AuthError, AuthRole, OfficeId } from "./types";
import * as permissions from "./permissions";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  isAdmin: boolean;
  isManager: boolean;
  isRep: boolean;
  isActive: boolean;
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canImportLeads: boolean;
  canAccessReports: boolean;
  canAccessOffice: (officeId: OfficeId) => boolean;
  canManageOffice: (officeId: OfficeId) => boolean;
  canViewLead: (leadOfficeId: OfficeId, assignedRepId?: string | null) => boolean;
  canEditLead: (leadOfficeId: OfficeId, assignedRepId?: string | null) => boolean;
  getAccessibleOffices: () => OfficeId[];
  getDefaultOffice: () => OfficeId;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/auth/profile?uid=${uid}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(authUser);
        const userProfile = await fetchUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await firebaseSignIn(email, password);
      
      if (!result.success) {
        setError(result.error ?? { code: "unknown", message: "Sign in failed" });
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      const sessionCreated = await establishSession();
      if (!sessionCreated) {
        await firebaseSignOut();
        setError({ code: "session-failed", message: "Failed to create session" });
        setLoading(false);
        return { success: false };
      }
      
      return { success: true };
    } catch (err: unknown) {
      const authErr: AuthError = { code: "unknown", message: "An unexpected error occurred" };
      setError(authErr);
      setLoading(false);
      return { success: false, error: authErr };
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut();
      await destroySession();
      setUser(null);
      setProfile(null);
    } catch {
      // Ignore errors during sign out
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    return await firebaseResetPassword(email);
  }, []);

  const isAdmin = permissions.isAdmin(profile);
  const isManager = permissions.isManager(profile);
  const isRep = permissions.isRep(profile);
  const isActive = permissions.isActive(profile);
  const canAccessAdmin = permissions.canAccessAdmin(profile);
  const canManageUsers = permissions.canManageUsers(profile);
  const canManageSettings = permissions.canManageSettings(profile);
  const canImportLeads = permissions.canImportLeads(profile);
  const canAccessReports = permissions.canAccessReports(profile);
  const canAccessOffice = useCallback((officeId: OfficeId) => permissions.canAccessOffice(profile, officeId), [profile]);
  const canManageOffice = useCallback((officeId: OfficeId) => permissions.canManageOffice(profile, officeId), [profile]);
  const canViewLead = useCallback((leadOfficeId: OfficeId, assignedRepId?: string | null) => permissions.canViewLead(profile, leadOfficeId, assignedRepId), [profile]);
  const canEditLead = useCallback((leadOfficeId: OfficeId, assignedRepId?: string | null) => permissions.canEditLead(profile, leadOfficeId, assignedRepId), [profile]);
  const getAccessibleOffices = useCallback(() => permissions.getAccessibleOffices(profile), [profile]);
  const getDefaultOffice = useCallback(() => permissions.getDefaultOffice(profile), [profile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    isAdmin,
    isManager,
    isRep,
    isActive,
    canAccessAdmin,
    canManageUsers,
    canManageSettings,
    canImportLeads,
    canAccessReports,
    canAccessOffice,
    canManageOffice,
    canViewLead,
    canEditLead,
    getAccessibleOffices,
    getDefaultOffice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
