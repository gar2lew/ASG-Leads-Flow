// ============================================
// ASG Leads — Session Client (Browser)
// ============================================
// Client-side session API helpers

"use client";

import { getAuthToken } from "./client";

export async function establishSession(): Promise<boolean> {
  try {
    const idToken = await getAuthToken();
    if (!idToken) return false;
    
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function destroySession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // Ignore errors during session destruction
  }
}
