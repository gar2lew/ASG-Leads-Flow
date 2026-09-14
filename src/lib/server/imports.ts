// ============================================
// ASG Leads — Import Repository
// ============================================
// Server-side operations for lead imports

import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/user-service";
import { getAccessibleOffices } from "@/lib/auth/permissions";
import type { OfficeId } from "@/lib/auth/types";
import type {
  ImportJob,
  ImportRow,
  ImportStatus,
  ValidatedRow,
  ColumnMapping,
  ImportableField,
  RawRow,
} from "@/lib/domain/import";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";
import { isLeadSource } from "@/lib/domain/status";
import { createLeadAction } from "@/lib/server/actions";
import type { DocumentSnapshot, Query } from "firebase-admin/firestore";

const IMPORTS = COLLECTIONS.IMPORTS;
const IMPORT_ROWS = "importRows";

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function importFromDoc(doc: DocumentSnapshot): ImportJob {
  const data = doc.data() as Record<string, any>;
  return {
    importId: data.importId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    officeId: data.officeId,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    completedAt: toDate(data.completedAt) ?? undefined,
    totalRows: data.totalRows ?? 0,
    validRows: data.validRows ?? 0,
    invalidRows: data.invalidRows ?? 0,
    duplicateRows: data.duplicateRows ?? 0,
    importedRows: data.importedRows ?? 0,
    failedRows: data.failedRows ?? 0,
    assignmentMode: data.assignmentMode ?? "none",
    assignedRepIds: data.assignedRepIds ?? [],
    source: data.source ?? "csv_import",
    version: data.version ?? 1,
  };
}

export async function createImportJob(data: {
  fileName: string;
  fileType: "csv" | "xlsx";
  fileSize: number;
  officeId: string;
  assignmentMode: "single" | "round-robin" | "none";
  assignedRepIds: string[];
  source: string;
}): Promise<{ importId: string; error?: string }> {
  const session = await validateSession();
  if (!session) return { importId: "", error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { importId: "", error: "User profile not found" };

  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(data.officeId as OfficeId)) {
    return { importId: "", error: "Office not accessible" };
  }

  const db = getAdminFirestore();
  const now = new Date();
  const importId = crypto.randomUUID();

  const importData = {
    importId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    officeId: data.officeId,
    status: "uploaded" as ImportStatus,
    createdBy: session.uid,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    importedRows: 0,
    failedRows: 0,
    assignmentMode: data.assignmentMode,
    assignedRepIds: data.assignedRepIds,
    source: data.source,
    version: 1,
  };

  await db.collection(IMPORTS).doc(importId).set(importData);
  return { importId };
}

export async function getImportJob(importId: string): Promise<ImportJob | null> {
  const session = await validateSession();
  if (!session) return null;

  const profile = await getUserProfile(session.uid);
  if (!profile) return null;

  const db = getAdminFirestore();
  const doc = await db.collection(IMPORTS).doc(importId).get();
  if (!doc.exists) return null;

  const importJob = importFromDoc(doc);
  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(importJob.officeId as OfficeId)) return null;

  const isRep = profile.role === "rep";
  if (isRep && importJob.createdBy !== session.uid) return null;

  return importJob;
}

export async function listImportJobs(filters: {
  officeId?: string;
  status?: ImportStatus;
  limit?: number;
  createdBy?: string;
} = {}): Promise<ImportJob[]> {
  const session = await validateSession();
  if (!session) return [];

  const profile = await getUserProfile(session.uid);
  if (!profile) return [];

  const db = getAdminFirestore();
  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) return [];

  const isRep = profile.role === "rep";

  let query: Query = db.collection(IMPORTS);

  if (filters.officeId) {
    if (!accessibleOffices.includes(filters.officeId as OfficeId)) return [];
    query = query.where("officeId", "==", filters.officeId);
  } else if (isRep) {
    query = query.where("createdBy", "==", session.uid);
  } else {
    query = query.where("officeId", "in", accessibleOffices);
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  if (filters.createdBy && !isRep) {
    query = query.where("createdBy", "==", filters.createdBy);
  }

  query = query.orderBy("createdAt", "desc").limit(filters.limit ?? 50);

  const snap = await query.get();
  return snap.docs.map(importFromDoc);
}

export async function saveValidatedRows(
  importId: string,
  rows: ValidatedRow[]
): Promise<{ success: boolean; error?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const importRef = db.collection(IMPORTS).doc(importId);

  try {
    const importDoc = await importRef.get();
    if (!importDoc.exists) return { success: false, error: "Import not found" };

    const importData = importDoc.data()!;
    const accessibleOffices = getAccessibleOffices(profile);
    if (!accessibleOffices.includes(importData.officeId as OfficeId)) {
      return { success: false, error: "Access denied" };
    }

    const isRep = profile.role === "rep";
    if (isRep && importData.createdBy !== session.uid) {
      return { success: false, error: "Access denied" };
    }

    // Save rows in batches
    let batch = db.batch();
    let counter = 0;

    for (const row of rows) {
      const rowId = `row-${row.rowNumber}`;
      const rowRef = importRef.collection(IMPORT_ROWS).doc(rowId);

      batch.set(rowRef, {
        rowId,
        importId,
        rowNumber: row.rowNumber,
        raw: row.raw,
        mapped: row.mapped,
        normalizedMobile: row.normalizedMobile,
        errors: row.errors,
        status: row.status,
        duplicateLeadId: row.duplicateLeadId ?? null,
        createdLeadId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      counter++;
      if (counter === 500) {
        await batch.commit();
        batch = db.batch();
        counter = 0;
      }
    }

    if (counter > 0) {
      await batch.commit();
    }

    // Update import counts
    const validRows = rows.filter((r) => r.status === "valid").length;
    const invalidRows = rows.filter((r) => r.status === "invalid").length;
    const duplicateRows = rows.filter((r) => r.status === "duplicate").length;

    await importRef.update({
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      status: "validated",
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeImport(importId: string): Promise<{
  success: boolean;
  imported: number;
  failed: number;
  duplicates: number;
  error?: string;
}> {
  const session = await validateSession();
  if (!session) return { success: false, imported: 0, failed: 0, duplicates: 0, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, imported: 0, failed: 0, duplicates: 0, error: "User profile not found" };

  const db = getAdminFirestore();
  const importRef = db.collection(IMPORTS).doc(importId);

  try {
    const importDoc = await importRef.get();
    if (!importDoc.exists) return { success: false, imported: 0, failed: 0, duplicates: 0, error: "Import not found" };

    const importData = importDoc.data()!;
    const accessibleOffices = getAccessibleOffices(profile);
    if (!accessibleOffices.includes(importData.officeId as OfficeId)) {
      return { success: false, imported: 0, failed: 0, duplicates: 0, error: "Access denied" };
    }

    // Update status to importing
    await importRef.update({ status: "importing", updatedAt: new Date() });

    // Get all valid rows
    const rowsSnap = await importRef
      .collection(IMPORT_ROWS)
      .where("status", "==", "valid")
      .orderBy("rowNumber", "asc")
      .get();

    const validRows = rowsSnap.docs.map((d) => d.data());
    let imported = 0;
    let failed = 0;
    let duplicates = 0;
    const assignedRepIds = importData.assignedRepIds ?? [];
    const assignmentMode = importData.assignmentMode ?? "none";
    let roundRobinIndex = 0;

    for (const rowData of validRows) {
      try {
        // Idempotency check: skip if already imported
        if (rowData.status === "imported" && rowData.createdLeadId) {
          imported++;
          continue;
        }

        // Determine assigned rep
        let assignedRepId: string | undefined;
        if (assignmentMode === "single" && assignedRepIds.length > 0) {
          assignedRepId = assignedRepIds[0];
        } else if (assignmentMode === "round-robin" && assignedRepIds.length > 0) {
          assignedRepId = assignedRepIds[roundRobinIndex % assignedRepIds.length];
          roundRobinIndex++;
        }

        // Create lead using existing action
        const result = await createLeadAction({
          name: rowData.mapped?.name ?? "",
          mobile: rowData.mapped?.mobile ?? "",
          address: rowData.mapped?.address ?? "",
          suburb: rowData.mapped?.suburb ?? "",
          officeId: importData.officeId,
          assignedRepId,
          source: importData.source ?? "csv_import",
          notes: rowData.mapped?.notes ?? undefined,
        });

        if (result.success) {
          imported++;
          await importRef.collection(IMPORT_ROWS).doc(rowData.rowId).update({
            status: "imported",
            createdLeadId: result.leadId,
            assignedRepId: assignedRepId ?? null,
            updatedAt: new Date(),
          });
        } else if (result.duplicateWarning) {
          duplicates++;
          await importRef.collection(IMPORT_ROWS).doc(rowData.rowId).update({
            status: "duplicate",
            duplicateLeadId: result.duplicateLeadId,
            updatedAt: new Date(),
          });
        } else {
          failed++;
          await importRef.collection(IMPORT_ROWS).doc(rowData.rowId).update({
            status: "failed",
            errors: [result.error ?? "Unknown error"],
            updatedAt: new Date(),
          });
        }
      } catch (err: any) {
        failed++;
        await importRef.collection(IMPORT_ROWS).doc(rowData.rowId).update({
          status: "failed",
          errors: [err.message ?? "Unknown error"],
          updatedAt: new Date(),
        });
      }
    }

    // Determine final status
    const finalStatus: ImportStatus = failed > 0 ? "completed_with_errors" : "completed";

    await importRef.update({
      status: finalStatus,
      importedRows: imported,
      failedRows: failed,
      duplicateRows: duplicates,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, imported, failed, duplicates };
  } catch (err: any) {
    await importRef.update({ status: "failed", updatedAt: new Date() });
    return { success: false, imported: 0, failed: 0, duplicates: 0, error: err.message };
  }
}

export async function cancelImport(importId: string): Promise<{ success: boolean; error?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const importRef = db.collection(IMPORTS).doc(importId);

  const importDoc = await importRef.get();
  if (!importDoc.exists) return { success: false, error: "Import not found" };

  const importData = importDoc.data()!;
  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(importData.officeId as OfficeId)) {
    return { success: false, error: "Access denied" };
  }

  await importRef.update({ status: "cancelled", updatedAt: new Date() });
  return { success: true };
}

export function getImportRows(importId: string, rows: ValidatedRow[]): ImportRow[] {
  return rows.map((row) => ({
    rowId: `row-${row.rowNumber}`,
    importId,
    rowNumber: row.rowNumber,
    raw: row.raw,
    mapped: row.mapped,
    normalizedMobile: row.normalizedMobile,
    errors: row.errors,
    status: row.status,
    duplicateLeadId: row.duplicateLeadId,
    createdLeadId: undefined,
    assignedRepId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}