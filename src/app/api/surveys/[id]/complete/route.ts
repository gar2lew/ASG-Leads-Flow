// ============================================
// ASG Leads — Survey Complete API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { completeSurveySession, convertSurveyResponseToLead } from "@/lib/server/surveys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, responseId, leadData } = body;

    if (action === "complete") {
      const result = await completeSurveySession(id);

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
        return NextResponse.json(
          { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "convert") {
      if (!responseId) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_INPUT", message: "Response ID required" } },
          { status: 400 }
        );
      }

      if (!leadData || !leadData.name || !leadData.mobile || !leadData.address) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_INPUT", message: "Name, mobile, and address required" } },
          { status: 400 }
        );
      }

      const result = await convertSurveyResponseToLead(id, responseId, leadData);

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
        if (result.error === "ALREADY_CONVERTED") {
          return NextResponse.json(
            { ok: false, error: { code: "ALREADY_CONVERTED", message: result.error } },
            { status: 409 }
          );
        }
        if (result.error === "INVALID_MOBILE") {
          return NextResponse.json(
            { ok: false, error: { code: "INVALID_MOBILE", message: result.error } },
            { status: 400 }
          );
        }
        if (result.error === "DUPLICATE_MOBILE") {
          return NextResponse.json(
            { ok: false, error: { code: "DUPLICATE_MOBILE", message: result.error, duplicateLeadId: result.duplicateLeadId } },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, leadId: result.leadId });
    }

    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ACTION", message: "Unknown action" } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Survey complete/convert API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to process survey action" } },
      { status: 500 }
    );
  }
}