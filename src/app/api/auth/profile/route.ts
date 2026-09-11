// ============================================
// ASG Leads — User Profile API Route (Server)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth/user-service";
import { validateSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    // Validate session
    const session = await validateSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid") ?? session.uid;
    
    // Users can only read their own profile unless admin
    if (uid !== session.uid) {
      // Check if requesting user is admin
      const adminProfile = await getUserProfile(session.uid);
      if (!adminProfile || adminProfile.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    const profile = await getUserProfile(uid);
    
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: profile });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
