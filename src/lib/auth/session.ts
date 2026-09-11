// ============================================
// ASG Leads — Session Management (Server)
// ============================================
// Server-side session cookie management
// Uses Firebase Admin to verify ID tokens and set secure cookies

import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "asg_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  uid: string;
  email: string | null;
}

export async function createSession(idToken: string): Promise<SessionData | null> {
  try {
    // Verify the ID token with Firebase Admin
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    
    const sessionData: SessionData = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
    };

    // Create session cookie
    const expiresIn = SESSION_DURATION_MS;
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });

    return sessionData;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) return null;

    // Verify the session cookie with Firebase Admin
    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email ?? null,
    };
  } catch {
    return null;
  }
}
