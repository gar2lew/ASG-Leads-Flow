// ============================================
// ASG Leads — Imports API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createImportJob, listImportJobs } from "@/lib/server/imports";
import type { ImportStatus } from "@/lib/domain/import";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, officeId, assignmentMode, assignedRepIds, source } = body;

    if (!fileName || !fileType || !officeId) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "fileName, fileType, and officeId are required" } },
        { status: 400 }
      );
    }

    if (!["csv", "xlsx"].includes(fileType)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_FILE_TYPE", message: "Only CSV and XLSX files are supported" } },
        { status: 400 }
      );
    }

    if (!["single", "round-robin", "none"].includes(assignmentMode)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_ASSIGNMENT", message: "Invalid assignment mode" } },
        { status: 400 }
      );
    }

    const result = await createImportJob({
      fileName,
      fileType,
      fileSize,
      officeId,
      assignmentMode,
      assignedRepIds: assignedRepIds ?? [],
      source: source ?? "csv_import",
    });

    if (result.error) {
      if (result.error === "Not authenticated") {
        return NextResponse.json(
          { ok: false, error: { code: "UNAUTHENTICATED", message: result.error } },
          { status: 401 }
        );
      }
      if (result.error === "Office not accessible") {
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

    return NextResponse.json({ ok: true, importId: result.importId }, { status: 201 });
  } catch (error: any) {
    console.error("Create import job API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to create import job" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: {
      officeId?: string;
      status?: ImportStatus;
      limit?: number;
      createdBy?: string;
    } = {};

    if (searchParams.get("officeId")) filters.officeId = searchParams.get("officeId")!;
    if (searchParams.get("status")) {
      const status = searchParams.get("status")!;
      const validStatuses = ["uploaded", "mapping", "validated", "importing", "completed", "completed_with_errors", "failed", "cancelled"] as const;
      if ((validStatuses as readonly string[]).includes(status)) filters.status = status as ImportStatus;
    }
    if (searchParams.get("limit")) filters.limit = parseInt(searchParams.get("limit")!);
    if (searchParams.get("createdBy")) filters.createdBy = searchParams.get("createdBy")!;

    const imports = await listImportJobs(filters);

    return NextResponse.json({
      ok: true,
      imports: imports.map((imp) => ({
        importId: imp.importId,
        fileName: imp.fileName,
        fileType: imp.fileType,
        fileSize: imp.fileSize,
        officeId: imp.officeId,
        status: imp.status,
        createdBy: imp.createdBy,
        createdAt: imp.createdAt.toISOString(),
        updatedAt: imp.updatedAt.toISOString(),
        completedAt: imp.completedAt?.toISOString() ?? null,
        totalRows: imp.totalRows,
        validRows: imp.validRows,
        invalidRows: imp.invalidRows,
        duplicateRows: imp.duplicateRows,
        importedRows: imp.importedRows,
        failedRows: imp.failedRows,
        assignmentMode: imp.assignmentMode,
        assignedRepIds: imp.assignedRepIds,
        source: imp.source,
      })),
    });
  } catch (error: any) {
    console.error("List imports API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to list imports" } },
      { status: 500 }
    );
  }
}