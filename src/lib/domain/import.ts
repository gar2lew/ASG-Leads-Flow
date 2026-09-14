// ============================================
// ASG Leads — Import Domain Definitions
// ============================================

/** Import job status lifecycle */
export type ImportStatus =
  | "uploaded"
  | "mapping"
  | "validated"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

/** Individual row status within an import */
export type ImportRowStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "duplicate"
  | "imported"
  | "failed"
  | "skipped";

/** Supported import file types */
export type ImportFileType = "csv" | "xlsx";

/** Fields that can be mapped from import columns */
export type ImportableField =
  | "name"
  | "mobile"
  | "address"
  | "suburb"
  | "postcode"
  | "notes"
  | "renterOwner"
  | "employmentStatus"
  | "superannuation"
  | "status"
  | "assignedRep"
  | "source";

/** Assignment modes for imported leads */
export type AssignmentMode = "single" | "round-robin" | "none";

/** Mapping from source column name to target field */
export interface ColumnMapping {
  fields: Record<string, ImportableField | "ignore">;
}

/** Raw row data from parsed file (header -> value) */
export interface RawRow {
  rowNumber: number;
  raw: Record<string, string>;
}

/** Parsed and mapped row */
export interface MappedRow {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ImportableField, string>>;
}

/** Validated row with errors */
export interface ValidatedRow {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ImportableField, string>>;
  normalizedMobile: string | null;
  errors: string[];
  warnings: string[];
  status: ImportRowStatus;
  duplicateLeadId?: string;
  createdLeadId?: string;
}

/** Import job document stored in Firestore */
export interface ImportJob {
  importId: string;
  fileName: string;
  fileType: ImportFileType;
  fileSize: number;
  officeId: string;
  status: ImportStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
  assignmentMode: AssignmentMode;
  assignedRepIds: string[];
  source: string;
  version: number;
}

/** Import row document (subcollection) */
export interface ImportRow {
  rowId: string;
  importId: string;
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ImportableField, string>>;
  normalizedMobile: string | null;
  errors: string[];
  status: ImportRowStatus;
  duplicateLeadId?: string;
  createdLeadId?: string;
  assignedRepId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Result of parsing a file */
export interface ParseResult {
  headers: string[];
  rows: RawRow[];
  totalRows: number;
  fileType: ImportFileType;
}

/** Result of validating rows */
export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  readyToImport: number;
  rows: ValidatedRow[];
}

/** Import execution progress */
export interface ImportProgress {
  importId: string;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  duplicateRows: number;
  failedRows: number;
  status: ImportStatus;
}

/** Canonical header patterns for auto-mapping */
export const HEADER_PATTERNS: Record<ImportableField, string[]> = {
  name: ["name", "lead name", "full name", "contact", "customer", "client"],
  mobile: ["mobile", "phone", "contact number", "telephone", "cell", "mob"],
  address: ["address", "street", "street address", "addr", "location"],
  suburb: ["suburb", "city", "town"],
  postcode: ["postcode", "zip", "postal code"],
  notes: ["notes", "comments", "remarks", "note", "description"],
  renterOwner: ["housing", "renter", "owner", "property status"],
  employmentStatus: ["employment", "work", "job status"],
  superannuation: ["super", "superannuation", "retirement"],
  status: ["status", "lead status"],
  assignedRep: ["rep", "assigned rep", "consultant", "agent", "staff"],
  source: ["source", "origin", "campaign"],
};

/** Required fields for import */
export const REQUIRED_FIELDS: ImportableField[] = ["name", "mobile"];

/** V1 import limits */
export const IMPORT_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_ROWS: 10000,
  MAX_COLUMNS: 50,
  BATCH_SIZE: 100,
} as const;