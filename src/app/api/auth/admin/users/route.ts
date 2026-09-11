// ============================================
// ASG Leads — Admin User Provisioning API
// ============================================
// Handles user administration (admin only)
// POST   /api/auth/admin/users — Create user
// GET    /api/auth/admin/users — List users
// PATCH  /api/auth/admin/users — Update user

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { validateSession } from "@/lib/auth/session";
import { createUserProfile, getUserProfile, updateUserProfile } from "@/lib/auth/user-service";
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

interface UpdateUserRequest {
  uid: string;
  displayName?: string;
  role?: AuthRole;
  officeIds?: OfficeId[];
  primaryOfficeId?: OfficeId | null;
  status?: "active" | "disabled";
  phone?: string | null;
}

// POST /api/auth/admin/users — Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const callerProfile = await getUserProfile(session.uid);
    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as CreateUserRequest;

    if (!body.email || !body.password || !body.displayName || !body.role || !body.officeIds?.length) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!["rep", "manager", "admin"].includes(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const validOffices: OfficeId[] = ["perth", "brisbane"];
    if (!body.officeIds.every((id) => validOffices.includes(id))) {
      return NextResponse.json({ success: false, error: "Invalid office ID" }, { status: 400 });
    }

    // Create Firebase Auth user first
    const authRecord = await getAdminAuth().createUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      disabled: false,
    });

    try {
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
    } catch (innerErr) {
      // Rollback: delete the auth user if claims/profile creation fails
      await getAdminAuth().deleteUser(authRecord.uid);
      throw innerErr;
    }
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
