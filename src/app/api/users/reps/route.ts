// ============================================
// ASG Leads — Users API Route (for assignment dropdown)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore();
    
    // Get active reps
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "rep")
      .where("status", "==", "active")
      .get();

    const reps = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        officeIds: data.officeIds,
      };
    });

    return NextResponse.json({ reps });
  } catch (error: any) {
    console.error("Users API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}