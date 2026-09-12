// ============================================
// ASG Leads — Survey Sessions API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createSurveySession, listSurveySessions } from "@/lib/server/surveys";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const officeId = body.officeId;

    if (!officeId || (officeId !== "perth" && officeId !== "brisbane")) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_OFFICE", message: "Invalid office" } },
        { status: 400 }
      );
    }

    const result = await createSurveySession(officeId);

    if (result.error) {
      if (result.error === "Not authenticated") {
        return NextResponse.json(
          { ok: false, error: { code: "UNAUTHENTICATED", message: result.error } },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sessionId: result.sessionId }, { status: 201 });
  } catch (error: any) {
    console.error("Create survey session API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to create survey session" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: {
      officeId?: string;
      status?: import("@/lib/domain/survey").SurveySessionStatus;
      limit?: number;
      repUserId?: string;
    } = {};

    if (searchParams.get("officeId")) filters.officeId = searchParams.get("officeId")!;
    const statusParam = searchParams.get("status");
    const validStatuses: readonly string[] = ["draft", "in_progress", "completed", "cancelled"];
    if (statusParam && validStatuses.includes(statusParam)) {
      filters.status = statusParam as import("@/lib/domain/survey").SurveySessionStatus;
    }
    if (searchParams.get("limit")) filters.limit = parseInt(searchParams.get("limit")!);
    if (searchParams.get("repUserId")) filters.repUserId = searchParams.get("repUserId")!;

    const sessions = await listSurveySessions(filters);

    return NextResponse.json({
      ok: true,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        officeId: s.officeId,
        repUserId: s.repUserId,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        respondentCount: s.respondentCount,
        leadCount: s.leadCount,
      })),
    });
  } catch (error: any) {
    console.error("List survey sessions API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to list survey sessions" } },
      { status: 500 }
    );
  }
}