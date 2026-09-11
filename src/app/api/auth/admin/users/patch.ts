// ============================================
// ASG Leads — Admin User Update API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile, setUserStatus } from "@/lib/auth/user-service";
import type { AuthRole, OfficeId } from "@/lib/auth/types";

interface UpdateUserRequest {
  uid: string;
  displayName?: string;
  role?: AuthRole;
  officeIds?: OfficeId[];
  primaryOfficeId?: OfficeId | null;
  status?: "active" | "disabled";
  phone?: string | null;
}

// PATCH /api/auth/admin/users — Update a user (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const callerProfile = await getUserProfile(session.uid);
    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateUserRequest;

    if (!body.uid) {
      return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
    }

    // Get existing profile
    const existingProfile = await getUserProfile(body.uid);
    if (!existingProfile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Prevent self-demotion from admin
    if (body.uid === session.uid && body.role && body.role !== "admin") {
      return NextResponse.json({ success: false, error: "Cannot remove your own admin access" }, { status: 400 });
    }

    // Update custom claims if role or offices changed
    const claimsChanged = body.role || body.officeIds;
    if (claimsChanged) {
      const newRole = body.role ?? existingProfile.role;
      const newOfficeIds = body.officeIds ?? existingProfile.officeIds;
      
      await getAdminAuth().setCustomUserClaims(body.uid, {
        role: newRole,
        officeIds: newOfficeIds,
      });
    }

    // Update auth user properties
    const authUpdates: { displayName?: string; disabled?: boolean } = {};
    if (body.displayName) authUpdates.displayName = body.displayName;
    if (body.status === "disabled") authUpdates.disabled = true;
    else if (body.status === "active") authUpdates.disabled = false;
    
    if (Object.keys(authUpdates).length > 0) {
      await getAdminAuth().updateUser(body.uid, authUpdates);
    }

    // Update Firestore profile
    const profileUpdates: Partial<typeof existingProfile> = {};
    if (body.displayName) profileUpdates.displayName = body.displayName;
    if (body.role) profileUpdates.role = body.role;
    if (body.officeIds) profileUpdates.officeIds = body.officeIds;
    if (body.primaryOfficeId !== undefined) profileUpdates.primaryOfficeId = body.primaryOfficeId;
    if (body.status) profileUpdates.status = body.status;
    if (body.phone !== undefined) profileUpdates.phone = body.phone;

    const updatedProfile = await updateUserProfile(body.uid, profileUpdates);

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
