// ============================================
// ASG Leads — Survey Analytics API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getSurveyAnalytics } from "@/lib/server/surveys";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: {
      officeId?: string;
      repUserId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {};

    if (searchParams.get("officeId")) filters.officeId = searchParams.get("officeId")!;
    if (searchParams.get("repUserId")) filters.repUserId = searchParams.get("repUserId")!;
    if (searchParams.get("dateFrom")) filters.dateFrom = new Date(searchParams.get("dateFrom")!);
    if (searchParams.get("dateTo")) filters.dateTo = new Date(searchParams.get("dateTo")!);

    const analytics = await getSurveyAnalytics(filters);

    return NextResponse.json({ ok: true, analytics });
  } catch (error: any) {
    console.error("Survey analytics API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to fetch survey analytics" } },
      { status: 500 }
    );
  }
}