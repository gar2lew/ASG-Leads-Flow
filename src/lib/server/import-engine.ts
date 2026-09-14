// ============================================
// ASG Leads — Import Processing Engine (Server-side wrapper)
// ============================================
// Server-side functions that require Firebase Admin SDK

import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  IMPORT_LIMITS,
  FileType,
  detectFileType,
  parseCSV,
  parseXLSX,
  autoMapHeaders,
  validateRow,
  validateImportRowsLocal,
  assignRoundRobin,
} from "@/lib/import-pure";
import type { RawRow, ColumnMapping } from "@/lib/domain/import";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";
import type { RowValidationResult } from "@/lib/import-pure";

// Re-export pure functions for convenience
export {
  IMPORT_LIMITS,
  detectFileType,
  parseCSV,
  parseXLSX,
  autoMapHeaders,
  validateRow,
  validateImportRowsLocal,
  assignRoundRobin,
};
export type { FileType, RowValidationResult };

// ============================================
// Duplicate Detection Against Firestore
// ============================================

export async function checkExistingDuplicates(
  normalizedMobiles: string[]
): Promise<Map<string, string>> {
  const db = getAdminFirestore();
  const duplicates = new Map<string, string>();

  if (normalizedMobiles.length === 0) return duplicates;

  // Batch check in groups of 10 (Firestore "in" limit)
  const batches: string[][] = [];
  for (let i = 0; i < normalizedMobiles.length; i += 10) {
    batches.push(normalizedMobiles.slice(i, i + 10));
  }

  for (const batch of batches) {
    const snap = await db
      .collection(COLLECTIONS.LEAD_MOBILE_KEYS)
      .where("mobileNormalized", "in", batch)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      duplicates.set(data.mobileNormalized, data.leadId);
    }
  }

  return duplicates;
}

// ============================================
// Full Validation Pipeline (with Firestore)
// ============================================

export async function validateImportRows(
  rows: RawRow[],
  mapping: ColumnMapping
): Promise<RowValidationResult[]> {
  // First pass: collect all normalized mobiles
  const allMobiles: string[] = [];
  const fileMobileSet = new Set<string>();
  const duplicateMobilesInFile = new Set<string>();

  for (const row of rows) {
    // Find mobile column by mapping
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
        if (fileMobileSet.has(normalized)) {
          duplicateMobilesInFile.add(normalized);
        }
        fileMobileSet.add(normalized);
        allMobiles.push(normalized);
      }
    }
  }

  // Check against Firestore
  const existingDuplicates = await checkExistingDuplicates(allMobiles);

  // Second pass: validate each row
  const results: RowValidationResult[] = [];
  for (const row of rows) {
    const result = validateRow(row.raw, row.rowNumber, mapping.fields, duplicateMobilesInFile);

    // Check if mobile matches existing lead
    if (result.normalizedMobile && existingDuplicates.has(result.normalizedMobile)) {
      result.duplicateLeadId = existingDuplicates.get(result.normalizedMobile);
      result.status = "duplicate";
      result.errors.push("Mobile matches existing lead");
    }

    results.push(result);
  }

  return results;
}