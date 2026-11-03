// ============================================
// ASG Leads — Lead Mutation API Routes
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  updateLeadAction,
  changeLeadStatusAction,
  assignLeadAction,
  archiveLeadAction,
  saveCallResultAction,
  acquireLeadClaimAction,
  releaseLeadClaimAction,
} from "@/lib/server/actions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update lead
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateLeadAction(id, body.data, body.expectedVersion);
    
    if (result.success) {
      return NextResponse.json({ ok: true, leadId: result.leadId });
    }
    
    if (result.error?.includes("VERSION_CONFLICT") || result.error?.includes("updated by another user")) {
      return NextResponse.json(
        { ok: false, error: { code: "VERSION_CONFLICT", message: result.error } },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: result.error } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Update lead API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update lead" } },
      { status: 500 }
    );
  }
}

// Change lead status
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.action === "status") {
      const result = await changeLeadStatusAction(id, body.status, body.expectedVersion);
      if (result.success) {
        return NextResponse.json({ ok: true, leadId: result.leadId });
      }
      if (result.error?.includes("updated by another user")) {
        return NextResponse.json(
          { ok: false, error: { code: "VERSION_CONFLICT", message: result.error } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: result.error } },
        { status: 400 }
      );
    }
    
    if (body.action === "assign") {
      const result = await assignLeadAction(id, body.assignedRepId, body.expectedVersion);
      if (result.success) {
        return NextResponse.json({ ok: true, leadId: result.leadId });
      }
      if (result.error?.includes("updated by another user")) {
        return NextResponse.json(
          { ok: false, error: { code: "VERSION_CONFLICT", message: result.error } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: result.error } },
        { status: 400 }
      );
    }
    
    if (body.action === "archive") {
      const result = await archiveLeadAction(id);
      if (result.success) {
        return NextResponse.json({ ok: true, leadId: result.leadId });
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
        { status: 500 }
      );
    }
    
    if (body.action === "call-result") {
      const result = await saveCallResultAction(
        id,
        body.callResult,
        body.note,
        body.callbackDate,
        body.callbackTime,
        body.appointmentDateTime,
        body.expectedVersion
      );
      if (result.success) {
        return NextResponse.json({ ok: true, leadId: result.leadId });
      }
      if (result.error?.includes("updated by another user")) {
        return NextResponse.json(
          { ok: false, error: { code: "VERSION_CONFLICT", message: result.error } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: result.error } },
        { status: 400 }
      );
    }
    
    if (body.action === "claim") {
      const result = await acquireLeadClaimAction(id);
      if (result.success) {
        return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
      }
      if (result.reason === "already_claimed") {
        return NextResponse.json(
          { ok: false, error: { code: "ALREADY_CLAIMED", message: "This lead is currently being worked by another rep" } },
          { status: 409 }
        );
      }
      if (result.reason === "not_authenticated") {
        return NextResponse.json(
          { ok: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ACTION", message: "Unknown action" } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Lead mutation API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to process request" } },
      { status: 500 }
    );
  }
}

// Release claim
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await releaseLeadClaimAction(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Release claim API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to release claim" } },
      { status: 500 }
    );
  }
}
