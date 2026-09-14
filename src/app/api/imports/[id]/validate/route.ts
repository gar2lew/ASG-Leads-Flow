// ============================================
// ASG Leads — Import Validate API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth/session";
import { getImportJob, saveValidatedRows } from "@/lib/server/imports";
import { validateImportRows } from "@/lib/server/import-engine";
import type { ColumnMapping, RawRow, ValidatedRow } from "@/lib/domain/import";

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

    const body = await request.json();
    const { mapping, rows: rawRows } = body as {
      mapping: ColumnMapping;
      rows: RawRow[];
    };

    if (!mapping || !mapping.fields) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "Column mapping is required" } },
        { status: 400 }
      );
    }

    if (!rawRows || !Array.isArray(rawRows)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "Rows array is required" } },
        { status: 400 }
      );
    }

    // Validate rows
    const validationResults = await validateImportRows(rawRows, mapping);

    // Map to ValidatedRow format
    const validatedRows: ValidatedRow[] = validationResults.map((r) => ({
      rowNumber: r.rowNumber,
      raw: r.raw,
      mapped: r.mapped,
      normalizedMobile: r.normalizedMobile ?? null,
      errors: r.errors,
      warnings: [],
      status: r.status,
      duplicateLeadId: r.duplicateLeadId,
    }));

    // Save validated rows
    const saveResult = await saveValidatedRows(id, validatedRows);

    if (!saveResult.success) {
      if (saveResult.error === "Access denied") {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: saveResult.error } },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { code: "SERVER_ERROR", message: saveResult.error } },
        { status: 500 }
      );
    }

    const validRows = validatedRows.filter((r) => r.status === "valid").length;
    const invalidRows = validatedRows.filter((r) => r.status === "invalid").length;
    const duplicateRows = validatedRows.filter((r) => r.status === "duplicate").length;

    return NextResponse.json({
      ok: true,
      totalRows: validatedRows.length,
      validRows,
      invalidRows,
      duplicateRows,
      readyToImport: validRows,
      rows: validatedRows.slice(0, 100), // Return first 100 for preview
    });
  } catch (error: any) {
    console.error("Import validate API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to validate rows" } },
      { status: 500 }
    );
  }
}