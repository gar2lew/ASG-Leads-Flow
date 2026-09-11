// ============================================
// ASG Leads — Session API Routes — HARDENED
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createSession, clearSession, validateSession, isUserDisabled, validateRequestOrigin } from "@/lib/auth/session";

// POST /api/auth/session — Create session from ID token
// CSRF protection: validates Origin header matches expected origin
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!(await validateRequestOrigin())) {
    return NextResponse.json(
      { success: false, error: "Invalid origin" },
      { status: 403 }
    );
  }

  try {
    const { idToken } = await request.json();
    
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing ID token" },
        { status: 400 }
      );
    }

    // Verify token and check if user is disabled
    const sessionData = await createSession(idToken);
    
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Invalid token or user not found" },
        { status: 401 }
      );
    }

    // Check if user is disabled
    const disabled = await isUserDisabled(sessionData.uid);
    if (disabled) {
      // Clear the session we just created
      await clearSession();
      return NextResponse.json(
        { success: false, error: "Account is disabled" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: sessionData });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/session — Clear session
export async function DELETE() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to clear session" },
      { status: 500 }
    );
  }
}

// GET /api/auth/session — Validate and return session
export async function GET() {
  try {
    const session = await validateSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No valid session" },
        { status: 401 }
      );
    }

    // Check if user is disabled
    const disabled = await isUserDisabled(session.uid);
    if (disabled) {
      await clearSession();
      return NextResponse.json(
        { success: false, error: "Account is disabled" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to validate session" },
      { status: 500 }
    );
  }
}
