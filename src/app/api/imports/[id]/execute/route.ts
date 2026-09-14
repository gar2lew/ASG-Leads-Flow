// ============================================
// ASG Leads — Import Execute API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth/session";
import { getImportJob, executeImport } from "@/lib/server/imports";

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
    const importJob = await getImportJob(id);

    if (!importJob) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Import not found" } },
        { status: 404 }
      );
    }

    if (importJob.status !== "validated") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATUS", message: `Cannot execute import in status: ${importJob.status}` } },
        { status: 400 }
      );
    }

    const result = await executeImport(id);

    if (!result.success) {
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

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      failed: result.failed,
      duplicates: result.duplicates,
    });
  } catch (error: any) {
    console.error("Import execute API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to execute import" } },
      { status: 500 }
    );
  }
}