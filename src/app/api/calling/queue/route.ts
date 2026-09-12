// ============================================
// ASG Leads — Calling Queue API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/user-service";
import { getAccessibleOffices } from "@/lib/auth/permissions";

const LEADS = COLLECTIONS.LEADS;

const CALLABLE_STATUSES = ["new", "no_answer", "callback", "contacted", "revisit"];

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const profile = await getUserProfile(session.uid);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    const db = getAdminFirestore();
    const accessibleOffices = getAccessibleOffices(profile);
    
    if (accessibleOffices.length === 0) {
      return NextResponse.json({ leads: [] });
    }

    const isRep = profile.role === "rep";

    let query = db.collection(LEADS)
      .where("officeId", "in", accessibleOffices)
      .where("status", "in", CALLABLE_STATUSES);

    if (isRep) {
      query = query.where("assignedRepId", "==", profile.uid);
    }

    query = query.orderBy("officeId").orderBy("status").orderBy("createdAt", "asc");

    const snap = await query.limit(100).get();

    const leads = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        leadId: data.leadId,
        name: data.name,
        mobile: data.mobile,
        address: data.address,
        suburb: data.suburb,
        officeId: data.officeId,
        assignedRepId: data.assignedRepId,
        source: data.source,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
        lastContactAt: data.lastContactAt?.toDate?.()?.toISOString() ?? data.lastContactAt,
        nextFollowUpAt: data.nextFollowUpAt?.toDate?.()?.toISOString() ?? data.nextFollowUpAt,
        version: data.version ?? 0,
        activeCallLease: data.activeCallLease ? {
          claimedBy: data.activeCallLease.claimedBy,
          claimedAt: data.activeCallLease.claimedAt?.toDate?.()?.toISOString() ?? data.activeCallLease.claimedAt,
          expiresAt: data.activeCallLease.expiresAt?.toDate?.()?.toISOString() ?? data.activeCallLease.expiresAt,
        } : null,
        renterOwner: data.survey?.renterOwner,
        employmentStatus: data.survey?.employmentStatus,
        superannuation: data.survey?.superannuation,
        costOfLivingResponse: data.survey?.costOfLivingResponse,
        taxResponse: data.survey?.taxResponse,
      };
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error("Calling queue API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch call queue" },
      { status: 500 }
    );
  }
}