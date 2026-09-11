// ============================================
// ASG Leads — Admin User Provisioning API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { validateSession } from "@/lib/auth/session";
import { createUserProfile, getUserProfile } from "@/lib/auth/user-service";
import type { AuthRole, OfficeId } from "@/lib/auth/types";

interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  role: AuthRole;
  officeIds: OfficeId[];
  primaryOfficeId?: OfficeId | null;
  phone?: string | null;
}

// POST /api/auth/admin/users — Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify caller is authenticated and is admin
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Get caller profile to verify admin role
    const callerProfile = await getUserProfile(session.uid);
    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as CreateUserRequest;

    // Validate required fields
    if (!body.email || !body.password || !body.displayName || !body.role || !body.officeIds?.length) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Validate role
    if (!["rep", "manager", "admin"].includes(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    // Validate office IDs
    const validOffices: OfficeId[] = ["perth", "brisbane"];
    if (!body.officeIds.every((id) => validOffices.includes(id))) {
      return NextResponse.json({ success: false, error: "Invalid office ID" }, { status: 400 });
    }

    // Create Firebase Auth user
    const authRecord = await getAdminAuth().createUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      disabled: false,
    });

    // Set custom claims
    await getAdminAuth().setCustomUserClaims(authRecord.uid, {
      role: body.role,
      officeIds: body.officeIds,
    });

    // Create Firestore user profile
    const profile = await createUserProfile({
      uid: authRecord.uid,
      email: body.email,
      displayName: body.displayName,
      role: body.role,
      officeIds: body.officeIds,
      primaryOfficeId: body.primaryOfficeId ?? body.officeIds[0],
      phone: body.phone ?? null,
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const message = error.code === "auth/email-already-exists" 
      ? "A user with this email already exists" 
      : "Failed to create user";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// GET /api/auth/admin/users — List all users (admin only)
export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const callerProfile = await getUserProfile(session.uid);
    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    // Get all Firebase Auth users
    const authUsers = await getAdminAuth().listUsers();
    
    return NextResponse.json({ 
      success: true, 
      data: authUsers.users.map((u) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        disabled: u.disabled,
        customClaims: u.customClaims ?? {},
        metadata: {
          creationTime: u.metadata.creationTime,
          lastSignInTime: u.metadata.lastSignInTime,
        },
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to list users" }, { status: 500 });
  }
}
