// ============================================
// ASG Leads — Import Parse API Route
// ============================================
// Accepts raw file content (CSV string or base64 XLSX),
// returns parsed headers and sample rows.

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth/session";
import { detectFileType, parseCSV, parseXLSX, IMPORT_LIMITS } from "@/lib/server/import-engine";

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
    const body = await request.json();
    const { fileContent, fileName, mimeType, encoding } = body;

    if (!fileContent || !fileName) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "fileContent and fileName are required" } },
        { status: 400 }
      );
    }

    const fileType = detectFileType(fileName, mimeType);

    if (fileType === "unknown") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported file type. Use CSV or XLSX." } },
        { status: 400 }
      );
    }

    let result;

    if (fileType === "csv") {
      // fileContent should be a UTF-8 string
      const content = encoding === "base64" ? Buffer.from(fileContent, "base64").toString("utf-8") : fileContent;
      result = parseCSV(content);
    } else {
      // XLSX: fileContent should be base64 encoded
      const buffer = Buffer.from(fileContent, "base64");
      if (buffer.byteLength > IMPORT_LIMITS.MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: { code: "FILE_TOO_LARGE", message: `File exceeds ${IMPORT_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit` } },
          { status: 400 }
        );
      }
      result = parseXLSX(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    }

    if (result.errors.length > 0 && result.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: "PARSE_ERROR", message: result.errors[0] } },
        { status: 400 }
      );
    }

    // Return sample (first 10 rows) for mapping UI
    const sampleRows = result.rows.slice(0, 10).map((r) => r.raw);

    return NextResponse.json({
      ok: true,
      headers: result.headers,
      totalRows: result.rows.length,
      sampleRows,
      parseWarnings: result.errors,
    });
  } catch (error: any) {
    console.error("Import parse API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to parse file" } },
      { status: 500 }
    );
  }
}