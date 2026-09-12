// ============================================
// ASG Leads — Complete Follow-Up API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { completeFollowUpAction } from "@/lib/server/actions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await completeFollowUpAction(id);
    
    if (result.success) {
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Complete follow-up API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to complete follow-up" } },
      { status: 500 }
    );
  }
}