// ============================================
// ASG Leads — Survey Session Detail API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getSurveySession, updateSurveySession, completeSurveySession, listSurveyResponses } from "@/lib/server/surveys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getSurveySession(id);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Survey session not found" } },
        { status: 404 }
      );
    }

    // Also fetch responses
    const responses = await listSurveyResponses(id);

    return NextResponse.json({
      ok: true,
      session: {
        sessionId: session.sessionId,
        officeId: session.officeId,
        repUserId: session.repUserId,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        respondentCount: session.respondentCount,
        leadCount: session.leadCount,
        version: session.version,
      },
      responses: responses.map((r) => ({
        responseId: r.responseId,
        sequenceNumber: r.sequenceNumber,
        costOfLivingIncreased: r.costOfLivingIncreased,
        payingTooMuchTax: r.payingTooMuchTax,
        housingStatus: r.housingStatus,
        employmentStatus: r.employmentStatus,
        superannuation: r.superannuation,
        becameLead: r.becameLead,
        leadId: r.leadId,
        leadCaptureDraft: r.leadCaptureDraft,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Get survey session API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to fetch survey session" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, respondentCount, leadCount, completedAt, expectedVersion } = body;

    const result = await updateSurveySession(id, {
      status,
      respondentCount,
      leadCount,
      completedAt: completedAt ? new Date(completedAt) : undefined,
    }, expectedVersion);

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
      if (result.error?.includes("another user")) {
        return NextResponse.json(
          { ok: false, error: { code: "VERSION_CONFLICT", message: result.error } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Update survey session API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update survey session" } },
      { status: 500 }
    );
  }
}