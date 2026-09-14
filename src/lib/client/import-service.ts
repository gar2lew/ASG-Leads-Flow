// ============================================
// ASG Leads — Import Client Service
// ============================================

import type { ColumnMapping, RawRow, ValidatedRow, ImportableField } from "@/lib/domain/import";

export interface ImportJobSummary {
  importId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  officeId: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
  assignmentMode: string;
  assignedRepIds: string[];
  source: string;
}

export interface ImportDetail extends ImportJobSummary {
  rows: ImportRowDetail[];
}

export interface ImportRowDetail {
  rowId: string;
  importId: string;
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ImportableField, string>>;
  normalizedMobile: string | null;
  errors: string[];
  status: string;
  duplicateLeadId: string | null;
  createdLeadId: string | null;
  assignedRepId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ParseResponse {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  parseWarnings: string[];
}

export interface ValidationResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  readyToImport: number;
  rows: ValidatedRow[];
}

export interface ExecuteResponse {
  imported: number;
  failed: number;
  duplicates: number;
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error?.message || "API call failed");
  }

  return data as T;
}

export async function createImportJob(params: {
  fileName: string;
  fileType: "csv" | "xlsx";
  fileSize: number;
  officeId: string;
  assignmentMode: "single" | "round-robin" | "none";
  assignedRepIds: string[];
  source: string;
}): Promise<string> {
  const data = await apiCall<{ importId: string }>("/api/imports", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return data.importId;
}

export async function parseFile(
  importId: string,
  fileContent: string,
  fileName: string,
  encoding?: string
): Promise<ParseResponse> {
  return apiCall<ParseResponse>(`/api/imports/${importId}/parse`, {
    method: "POST",
    body: JSON.stringify({ fileContent, fileName, encoding }),
  });
}

export async function validateRows(
  importId: string,
  mapping: ColumnMapping,
  rows: RawRow[]
): Promise<ValidationResponse> {
  return apiCall<ValidationResponse>(`/api/imports/${importId}/validate`, {
    method: "POST",
    body: JSON.stringify({ mapping, rows }),
  });
}

export async function executeImport(importId: string): Promise<ExecuteResponse> {
  return apiCall<ExecuteResponse>(`/api/imports/${importId}/execute`, {
    method: "POST",
  });
}

export async function cancelImport(importId: string): Promise<void> {
  await apiCall(`/api/imports/${importId}/cancel`, {
    method: "POST",
  });
}

export async function getImportDetail(importId: string): Promise<ImportDetail> {
  return apiCall<ImportDetail>(`/api/imports/${importId}`);
}

export async function listImportJobs(filters?: {
  officeId?: string;
  status?: string;
  limit?: number;
}): Promise<ImportJobSummary[]> {
  const params = new URLSearchParams();
  if (filters?.officeId) params.set("officeId", filters.officeId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());

  const queryString = params.toString();
  return apiCall<ImportJobSummary[]>(`/api/imports${queryString ? `?${queryString}` : ""}`);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}