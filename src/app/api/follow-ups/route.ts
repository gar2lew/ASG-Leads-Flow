// ============================================
// ASG Leads — Follow-Ups API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getFollowUpsForUser } from "@/lib/server/leads";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: any = {};

    if (searchParams.get("office")) {
      filters.officeId = searchParams.get("office");
    }
    if (searchParams.get("status") && searchParams.get("status") !== "All") {
      filters.status = searchParams.get("status");
    }
    if (searchParams.get("rep") && searchParams.get("rep") !== "All") {
      filters.assignedRepId = searchParams.get("rep");
    }
    if (searchParams.get("leadId")) {
      filters.leadId = searchParams.get("leadId");
    }
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limitNum = parseInt(limitParam);
      if (!isNaN(limitNum)) {
        filters.limit = limitNum;
      }
    }

    const followUps = await getFollowUpsForUser(filters);

    return NextResponse.json({ followUps });
  } catch (error: any) {
    console.error("Follow-ups API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch follow-ups" },
      { status: 500 }
    );
  }
}