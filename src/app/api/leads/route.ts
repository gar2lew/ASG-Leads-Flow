// ============================================
// ASG Leads — Create Lead API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createLeadAction } from "@/lib/server/actions";
import { getLeadsForUser } from "@/lib/server/leads";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: Parameters<typeof getLeadsForUser>[0] = {};

    if (searchParams.get("office")) {
      filters.officeId = searchParams.get("office") as string;
    }
    const status = searchParams.get("status");
    if (status && status !== "All") {
      filters.status = status as any;
    }
    const source = searchParams.get("source");
    if (source && source !== "All") {
      filters.source = source;
    }
    if (searchParams.get("rep") && searchParams.get("rep") !== "All") {
      filters.assignedRepId = searchParams.get("rep") as string;
    }
    if (searchParams.get("cursor")) {
      filters.cursor = searchParams.get("cursor") as string;
    }
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limitNum = parseInt(limitParam, 10);
      if (!isNaN(limitNum)) {
        filters.limit = limitNum;
      }
    }

    const result = await getLeadsForUser(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("List leads API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to fetch leads" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createLeadAction(body);
    
    if (result.success) {
      return NextResponse.json({ ok: true, leadId: result.leadId }, { status: 201 });
    }
    
    if (result.duplicateWarning) {
      return NextResponse.json(
        { ok: false, error: { code: "DUPLICATE_LEAD", message: result.error, duplicateLeadId: result.duplicateLeadId } },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: result.error } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Create lead API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to create lead" } },
      { status: 500 }
    );
  }
}