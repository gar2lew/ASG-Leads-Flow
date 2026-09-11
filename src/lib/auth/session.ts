// ============================================
// ASG Leads — Session Management (Server) — HARDENED
// ============================================

import "server-only";

import { cookies, headers } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getUserProfile } from "@/lib/auth/user-service";

export const SESSION_COOKIE_NAME = "asg_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  uid: string;
  email: string | null;
}

export async function createSession(idToken: string): Promise<SessionData | null> {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    
    const sessionData: SessionData = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
    };

    const expiresIn = SESSION_DURATION_MS;
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });

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

    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function isUserDisabled(uid: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(uid);
    return profile?.status === "disabled";
  } catch {
    return true;
  }
}

// CSRF protection helper
export async function validateRequestOrigin(): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");
  
  if (process.env.NODE_ENV === "production") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const allowedOrigins = [`https://${host}`];
    if (siteUrl) allowedOrigins.push(siteUrl);
    
    if (!origin) return false;
    return allowedOrigins.includes(origin);
  }
  
  if (origin) {
    return origin.includes("localhost") || origin === `http://${host}`;
  }
  
  return true;
}
