// ============================================
// ASG Leads — Session API Routes
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createSession, clearSession, validateSession } from "@/lib/auth/session";

// POST /api/auth/session — Create session from ID token
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing ID token" },
        { status: 400 }
      );
    }

    const sessionData = await createSession(idToken);
    
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Invalid token or user not found" },
        { status: 401 }
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

    return NextResponse.json({ success: true, data: session });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to validate session" },
      { status: 500 }
    );
  }
}
