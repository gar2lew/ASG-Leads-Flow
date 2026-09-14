// ============================================
// ASG Leads — Import Pure Logic (No Server Dependencies)
// ============================================
// Pure parsing, mapping, validation - safe for testing

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";
import { isLeadSource } from "@/lib/domain/status";
import type { ColumnMapping, ImportableField, RawRow, ValidatedRow } from "@/lib/domain/import";

// ============================================
// Limits
// ============================================

export const IMPORT_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_ROWS: 10000,
  MAX_COLUMNS: 50,
  MAX_FIELD_LENGTH: 500,
} as const;

// ============================================
// File Type Detection
// ============================================

export type FileType = "csv" | "xlsx" | "unknown";

export function detectFileType(fileName: string, mimeType?: string): FileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (mimeType === "text/csv") return "csv";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  )
    return "xlsx";
  return "unknown";
}

// ============================================
// CSV Parsing
// ============================================

export interface ParseResult {
  headers: string[];
  rows: RawRow[];
  errors: string[];
}

export function parseCSV(fileContent: string): ParseResult {
  const errors: string[] = [];

  if (!fileContent || fileContent.trim().length === 0) {
    return { headers: [], rows: [], errors: ["File is empty"] };
  }

  const result = Papa.parse(fileContent, {
    header: false,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(`Row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  const data = result.data as string[][];

  if (data.length === 0) {
    return { headers: [], rows: [], errors: ["No data found in file"] };
  }

  const headers = data[0];

  // Check for duplicate headers
  const headerSet = new Set<string>();
  const duplicates = new Set<string>();
  for (const h of headers) {
    const normalized = h.toLowerCase().trim();
    if (headerSet.has(normalized)) {
      duplicates.add(h);
    }
    headerSet.add(normalized);
  }
  if (duplicates.size > 0) {
    errors.push(`Duplicate headers found: ${[...duplicates].join(", ")}`);
  }

  if (headers.length > IMPORT_LIMITS.MAX_COLUMNS) {
    return { headers: [], rows: [], errors: [`Too many columns: ${headers.length} (max ${IMPORT_LIMITS.MAX_COLUMNS})`] };
  }

  const rows: RawRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length === 0) continue;

    const raw: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const value = row[j] ?? "";
      raw[headers[j]] = value.trim();
    }
    rows.push({ rowNumber: i, raw });
  }

  if (rows.length > IMPORT_LIMITS.MAX_ROWS) {
    return { headers: [], rows: [], errors: [`Too many rows: ${rows.length} (max ${IMPORT_LIMITS.MAX_ROWS})`] };
  }

  return { headers, rows, errors };
}

// ============================================
// XLSX Parsing
// ============================================

export function parseXLSX(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "array" });

    if (workbook.SheetNames.length === 0) {
      return { headers: [], rows: [], errors: ["Workbook has no sheets"] };
    }

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [], errors: ["Sheet is empty"] };
    }

    const headersRaw = jsonData[0] as string[];
    const headers = headersRaw.map((h) => String(h).trim());

    if (headers.length > IMPORT_LIMITS.MAX_COLUMNS) {
      return { headers: [], rows: [], errors: [`Too many columns: ${headers.length} (max ${IMPORT_LIMITS.MAX_COLUMNS})`] };
    }

    // Check for duplicate headers
    const headerSet = new Set<string>();
    const duplicates = new Set<string>();
    for (const h of headers) {
      const normalized = h.toLowerCase().trim();
      if (headerSet.has(normalized)) {
        duplicates.add(h);
      }
      headerSet.add(normalized);
    }
    if (duplicates.size > 0) {
      errors.push(`Duplicate headers found: ${[...duplicates].join(", ")}`);
    }

    const rows: RawRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as string[];
      if (!row || row.length === 0) continue;

      const raw: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const value = row[j] ?? "";
        raw[headers[j]] = String(value).trim();
      }
      rows.push({ rowNumber: i, raw });
    }

    if (rows.length > IMPORT_LIMITS.MAX_ROWS) {
      return { headers: [], rows: [], errors: [`Too many rows: ${rows.length} (max ${IMPORT_LIMITS.MAX_ROWS})`] };
    }

    return { headers, rows, errors };
  } catch (err: any) {
    return { headers: [], rows: [], errors: [`Failed to parse XLSX: ${err.message}`] };
  }
}

// ============================================
// Auto-Mapping
// ============================================

const HEADER_MAPPINGS: Record<string, ImportableField> = {
  // Name
  name: "name",
  "lead name": "name",
  "full name": "name",
  "contact name": "name",
  // Mobile
  mobile: "mobile",
  phone: "mobile",
  "contact number": "mobile",
  "phone number": "mobile",
  "mobile number": "mobile",
  // Address
  address: "address",
  "street address": "address",
  // Suburb
  suburb: "suburb",
  city: "suburb",
  // Postcode
  postcode: "postcode",
  zip: "postcode",
  "zip code": "postcode",
  // Notes
  notes: "notes",
  comments: "notes",
  // Renter/Owner
  renterowner: "renterOwner",
  "renter owner": "renterOwner",
  "owner status": "renterOwner",
  // Employment
  employmentstatus: "employmentStatus",
  "employment status": "employmentStatus",
  // Super
  superannuation: "superannuation",
  super: "superannuation",
  // Status
  status: "status",
  "lead status": "status",
  // Assigned Rep
  assignedrep: "assignedRep",
  "assigned rep": "assignedRep",
  rep: "assignedRep",
  consultant: "assignedRep",
  agent: "assignedRep",
  staff: "assignedRep",
  // Source
  source: "source",
  "lead source": "source",
  origin: "source",
  campaign: "source",
};

export function autoMapHeaders(headers: string[]): Record<string, ImportableField | "ignore"> {
  const mapping: Record<string, ImportableField | "ignore"> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (HEADER_MAPPINGS[normalized]) {
      mapping[header] = HEADER_MAPPINGS[normalized];
    } else {
      mapping[header] = "ignore";
    }
  }

  return mapping;
}

// ============================================
// Row Validation
// ============================================

const VALID_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"];
const VALID_RENTER_OWNER = ["renter", "owner", "other"];
const VALID_EMPLOYMENT = ["full_time", "part_time", "casual", "self_employed", "retired", "other"];
const VALID_SUPER = ["0_50k", "50k_100k", "100k_200k", "200k_500k", "500k_plus", "unknown"];

export interface RowValidationResult {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ImportableField, string>>;
  normalizedMobile?: string;
  errors: string[];
  status: "valid" | "invalid" | "duplicate";
  duplicateLeadId?: string;
}

export function validateRow(
  raw: Record<string, string>,
  rowNumber: number,
  mapping: Record<string, ImportableField | "ignore">,
  duplicateMobilesInFile: Set<string>
): RowValidationResult {
  const errors: string[] = [];
  const mapped: Partial<Record<ImportableField, string>> = {};

  // Apply mapping
  for (const [header, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const value = raw[header] ?? "";
    if (value) {
      mapped[field] = value;
    }
  }

  // Validate name
  const name = mapped.name ?? "";
  if (!name || name.trim().length === 0) {
    errors.push("Name is required");
  } else if (name.length > IMPORT_LIMITS.MAX_FIELD_LENGTH) {
    errors.push("Name exceeds maximum length");
  }

  // Validate mobile
  const mobile = mapped.mobile ?? "";
  if (!mobile || mobile.trim().length === 0) {
    errors.push("Mobile is required");
  } else {
    const normalized = normalizeAustralianMobile(mobile);
    if (!normalized) {
      errors.push("Invalid Australian mobile number");
    } else {
      mapped.mobile = normalized;

      // Check duplicate in file
      if (duplicateMobilesInFile.has(normalized)) {
        errors.push("Duplicate mobile number in file");
      }
    }
  }

  // Validate status
  if (mapped.status && !VALID_STATUSES.includes(mapped.status)) {
    errors.push(`Invalid status: ${mapped.status}`);
  }

  // Validate renterOwner
  if (mapped.renterOwner && !VALID_RENTER_OWNER.includes(mapped.renterOwner)) {
    errors.push(`Invalid renter/owner: ${mapped.renterOwner}`);
  }

  // Validate employmentStatus
  if (mapped.employmentStatus && !VALID_EMPLOYMENT.includes(mapped.employmentStatus)) {
    errors.push(`Invalid employment status: ${mapped.employmentStatus}`);
  }

  // Validate superannuation
  if (mapped.superannuation && !VALID_SUPER.includes(mapped.superannuation)) {
    errors.push(`Invalid superannuation: ${mapped.superannuation}`);
  }

  // Validate source
  if (mapped.source && !isLeadSource(mapped.source)) {
    errors.push(`Invalid source: ${mapped.source}`);
  }

  // Validate field lengths
  for (const [field, value] of Object.entries(mapped)) {
    if (value && value.length > IMPORT_LIMITS.MAX_FIELD_LENGTH) {
      errors.push(`${field} exceeds maximum length`);
    }
  }

  const status: RowValidationResult["status"] = errors.length > 0 ? "invalid" : "valid";

  return {
    rowNumber,
    raw,
    mapped,
    normalizedMobile: mapped.mobile,
    errors,
    status,
  };
}

// ============================================
// Full Validation Pipeline (without Firestore calls)
// ============================================

export function validateImportRowsLocal(
  rows: RawRow[],
  mapping: ColumnMapping
): RowValidationResult[] {
  // First pass: identify which mobiles appear more than once
  const mobileCounts = new Map<string, number>();
  for (const row of rows) {
    let mobile = "";
    for (const [header, field] of Object.entries(mapping.fields)) {
      if (field === "mobile") {
        mobile = row.raw[header] ?? "";
        break;
      }
    }
    if (mobile) {
      const normalized = normalizeAustralianMobile(mobile);
      if (normalized) {
        mobileCounts.set(normalized, (mobileCounts.get(normalized) ?? 0) + 1);
      }
    }
  }

  // Second pass: validate each row, marking duplicates (not first occurrence)
  const seenMobiles = new Set<string>();
  const results: RowValidationResult[] = [];
  for (const row of rows) {
    const normalizedMobile = (() => {
      for (const [header, field] of Object.entries(mapping.fields)) {
        if (field === "mobile") {
          const mobile = row.raw[header] ?? "";
          return mobile ? normalizeAustralianMobile(mobile) : undefined;
        }
      }
      return undefined;
    })();

    // Create a per-row duplicate set: contains mobiles seen in PREVIOUS rows
    const rowDuplicateMobiles = new Set<string>();
    if (normalizedMobile && seenMobiles.has(normalizedMobile)) {
      rowDuplicateMobiles.add(normalizedMobile);
    }

    const result = validateRow(row.raw, row.rowNumber, mapping.fields, rowDuplicateMobiles);
    results.push(result);

    if (normalizedMobile) {
      seenMobiles.add(normalizedMobile);
    }
  }

  return results;
}

// ============================================
// Round-Robin Assignment
// ============================================

export function assignRoundRobin<T>(items: T[], count: number): T[] {
  if (items.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[i % items.length]);
  }
  return result;
}