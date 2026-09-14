// ============================================
// ASG Leads — Import Detail API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getImportJob, saveValidatedRows, executeImport, cancelImport } from "@/lib/server/imports";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const importJob = await getImportJob(id);

    if (!importJob) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Import not found" } },
        { status: 404 }
      );
    }

    // Also fetch rows
    const db = (await import("@/lib/firebase/admin")).getAdminFirestore();
    const rowsSnap = await db
      .collection("imports")
      .doc(id)
      .collection("importRows")
      .orderBy("rowNumber", "asc")
      .get();

    const rows = rowsSnap.docs.map((d) => d.data());

    return NextResponse.json({
      ok: true,
      import: {
        importId: importJob.importId,
        fileName: importJob.fileName,
        fileType: importJob.fileType,
        fileSize: importJob.fileSize,
        officeId: importJob.officeId,
        status: importJob.status,
        createdBy: importJob.createdBy,
        createdAt: importJob.createdAt.toISOString(),
        updatedAt: importJob.updatedAt.toISOString(),
        completedAt: importJob.completedAt?.toISOString() ?? null,
        totalRows: importJob.totalRows,
        validRows: importJob.validRows,
        invalidRows: importJob.invalidRows,
        duplicateRows: importJob.duplicateRows,
        importedRows: importJob.importedRows,
        failedRows: importJob.failedRows,
        assignmentMode: importJob.assignmentMode,
        assignedRepIds: importJob.assignedRepIds,
        source: importJob.source,
      },
      rows: rows.map((r) => ({
        rowId: r.rowId,
        importId: r.importId,
        rowNumber: r.rowNumber,
        raw: r.raw,
        mapped: r.mapped,
        normalizedMobile: r.normalizedMobile,
        errors: r.errors,
        status: r.status,
        duplicateLeadId: r.duplicateLeadId,
        createdLeadId: r.createdLeadId,
        assignedRepId: r.assignedRepId,
        createdAt: r.createdAt?.toISOString() ?? null,
        updatedAt: r.updatedAt?.toISOString() ?? null,
      })),
    });
  } catch (error: any) {
    console.error("Get import API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to fetch import" } },
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
    const { action, rows } = body;

    if (action === "save-validated") {
      if (!rows || !Array.isArray(rows)) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_INPUT", message: "Rows array required" } },
          { status: 400 }
        );
      }

      const result = await saveValidatedRows(id, rows);

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
    }

    if (action === "execute") {
      const result = await executeImport(id);

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

      return NextResponse.json({
        ok: true,
        imported: result.imported,
        failed: result.failed,
        duplicates: result.duplicates,
      });
    }

    if (action === "cancel") {
      const result = await cancelImport(id);

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
    }

    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ACTION", message: "Unknown action" } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Import action API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to process import action" } },
      { status: 500 }
    );
  }
}