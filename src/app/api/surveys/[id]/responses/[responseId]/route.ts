// ============================================
// ASG Leads — Survey Response Detail API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { updateSurveyResponse, convertSurveyResponseToLead } from "@/lib/server/surveys";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params;
    const body = await request.json();
    const updates = body.updates;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "Invalid updates object" } },
        { status: 400 }
      );
    }

    const result = await updateSurveyResponse(id, responseId, updates);

    if (!result.success) {
      if (result.error === "Not authenticated") {
        return NextResponse.json(
          { ok: false, error: { code: "UNAUTHENTICATED", message: result.error } },
          { status: 401 }
        );
      }
      if (result.error === "Access denied") {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: result.error } },
          { status: 403 }
        );
      }
      if (result.error === "Session not in progress") {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_STATE", message: result.error } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Update survey response API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update survey response" } },
      { status: 500 }
    );
  }
}