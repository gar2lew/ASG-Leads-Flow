// ============================================
// ASG Leads — Create Lead API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createLeadAction } from "@/lib/server/actions";

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