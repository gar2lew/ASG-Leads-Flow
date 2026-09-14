// ============================================
// ASG Leads — Import Cancel API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth/session";
import { cancelImport } from "@/lib/server/imports";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await cancelImport(id);

    if (!result.success) {
      if (result.error === "Access denied") {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: result.error } },
          { status: 403 }
        );
      }
      if (result.error === "Import not found") {
        return NextResponse.json(
          { ok: false, error: { code: "NOT_FOUND", message: result.error } },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: result.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Import cancel API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to cancel import" } },
      { status: 500 }
    );
  }
}