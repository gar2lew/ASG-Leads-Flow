// ============================================
// ASG Leads — Survey Response API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createSurveyResponse, updateSurveyResponse } from "@/lib/server/surveys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sequenceNumber } = body;

    if (!sequenceNumber || sequenceNumber < 1) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_SEQUENCE", message: "Invalid sequence number" } },
        { status: 400 }
      );
    }

    const result = await createSurveyResponse(id, sequenceNumber);

    if (result.error) {
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

    return NextResponse.json({ ok: true, responseId: result.responseId }, { status: 201 });
  } catch (error: any) {
    console.error("Create survey response API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to create survey response" } },
      { status: 500 }
    );
  }
}