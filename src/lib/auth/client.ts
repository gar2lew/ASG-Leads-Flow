// ============================================
// ASG Leads — Auth Client Service
// ============================================
// Client-side Firebase Auth operations
// Handles sign in, sign out, password reset, and auth state

"use client";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AuthError } from "./types";
import { mapAuthError } from "./types";

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    return {
      success: false,
      error: {
        code: firebaseError.code ?? "unknown",
        message: mapAuthError(firebaseError.code, "Sign in failed. Please try again."),
      },
    };
  }
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    return {
      success: false,
      error: {
        code: firebaseError.code ?? "unknown",
        message: mapAuthError(firebaseError.code, "Failed to send reset email. Please try again."),
      },
    };
  }
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export function getAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) return Promise.resolve(null);
  return auth.currentUser.getIdToken();
}
