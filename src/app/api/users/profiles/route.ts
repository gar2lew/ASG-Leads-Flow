// ============================================
// ASG Leads — User Profiles API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getUserProfiles } from "@/lib/server/leads";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uidsParam = searchParams.get("uids");

    if (!uidsParam) {
      return NextResponse.json(
        { error: "Missing 'uids' parameter" },
        { status: 400 }
      );
    }

    // Split by comma and filter out empty strings
    const uids = uidsParam
      .split(",")
      .map((uid) => uid.trim())
      .filter((uid) => uid.length > 0);

    if (uids.length === 0) {
      return NextResponse.json({ profiles: new Map() });
    }

    const profilesMap = await getUserProfiles(uids);

    // Convert Map to serializable object
    const profilesObj: Record<string, { displayName: string; email: string }> = {};
    profilesMap.forEach((value, key) => {
      profilesObj[key] = value;
    });

    return NextResponse.json({ profiles: profilesObj });
  } catch (error: any) {
    console.error("User profiles API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user profiles" },
      { status: 500 }
    );
  }
}