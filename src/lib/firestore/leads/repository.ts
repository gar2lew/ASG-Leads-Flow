import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { FieldValue, Timestamp, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { convertLeadFromFirestore } from "./converters";
import type { LeadEntity, LeadQueryFilters, PaginatedResult } from "./types";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";

const LEADS = COLLECTIONS.LEADS;

export async function getLead(leadId: string): Promise<LeadEntity | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(LEADS).doc(leadId).get();
  if (!doc.exists) return null;
  return convertLeadFromFirestore(doc as QueryDocumentSnapshot);
}

export async function createLead(data: {
  name: string;
  mobile: string;
  address: string;
  suburb?: string;
  officeId: string;
  assignedRepId: string | null;
  source: string;
  notes?: string;
  survey?: any;
  createdBy: string;
}): Promise<LeadEntity> {
  const db = getAdminFirestore();
  const now = new Date();
  const mobileNormalized = normalizeAustralianMobile(data.mobile) ?? data.mobile;

  const leadId = crypto.randomUUID();
  const leadData = {
    leadId,
    name: data.name,
    mobile: data.mobile,
    mobileNormalized,
    address: data.address,
    suburb: data.suburb ?? null,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId,
    source: data.source,
    status: "new",
    notes: data.notes ?? null,
    survey: data.survey ?? null,
    createdAt: now,
    createdBy: data.createdBy,
    updatedAt: now,
    updatedBy: data.createdBy,
    lastContactAt: null,
    nextFollowUpAt: null,
    activeCallLease: null,
    archivedAt: null,
    version: 0,
  };

  await db.collection(LEADS).doc(leadId).set(leadData);
  return { ...leadData, version: 0 } as unknown as LeadEntity;
}

export async function updateLead(
  leadId: string,
  updates: Partial<{
    name: string;
    mobile: string;
    address: string;
    suburb: string;
    officeId: string;
    assignedRepId: string | null;
    source: string;
    notes: string;
    survey: any;
    status: string;
    lastContactAt: Date;
    nextFollowUpAt: Date | null;
    archivedAt: Date | null;
  }>,
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadEntity> {
  const db = getAdminFirestore();
  const now = new Date();

  const result = await db.runTransaction(async (tx) => {
    const ref = db.collection(LEADS).doc(leadId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Lead not found");

    const current = snap.data();
    const currentVersion = current?.version ?? 0;

    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error("VERSION_CONFLICT");
    }

    const updateData: any = {
      ...updates,
      updatedAt: now,
      updatedBy,
      version: currentVersion + 1,
    };

    if (updates.mobile) {
      updateData.mobileNormalized = normalizeAustralianMobile(updates.mobile) ?? updates.mobile;
    }

    tx.update(ref, updateData);

    return { ...current, ...updateData, version: currentVersion + 1 };
  });

  return result as unknown as LeadEntity;
}

export async function changeLeadStatus(
  leadId: string,
  newStatus: string,
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadEntity> {
  return updateLead(leadId, { status: newStatus }, updatedBy, expectedVersion);
}

export async function assignLead(
  leadId: string,
  assignedRepId: string | null,
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadEntity> {
  return updateLead(leadId, { assignedRepId }, updatedBy, expectedVersion);
}

export async function archiveLead(leadId: string, updatedBy: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(LEADS).doc(leadId).update({
    archivedAt: new Date(),
    updatedAt: new Date(),
    updatedBy,
  });
}

export async function listLeads(
  filters: LeadQueryFilters = {}
): Promise<PaginatedResult<LeadEntity>> {
  const db = getAdminFirestore();
  const limit = filters.limit ?? 50;

  let query: Query = db.collection(LEADS);

  if (filters.officeId) {
    query = query.where("officeId", "==", filters.officeId);
  }
  if (filters.assignedRepId) {
    query = query.where("assignedRepId", "==", filters.assignedRepId);
  }
  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }
  if (filters.source) {
    query = query.where("source", "==", filters.source);
  }
  if (filters.mobileNormalized) {
    query = query.where("mobileNormalized", "==", filters.mobileNormalized);
  }

  query = query.orderBy("createdAt", "desc").limit(limit + 1);

  const snap = await query.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;

  return {
    items: items.map((d) => convertLeadFromFirestore(d as QueryDocumentSnapshot)),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    count: items.length,
  };
}

export async function searchLeadsByMobile(mobileNormalized: string): Promise<LeadEntity[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(LEADS).where("mobileNormalized", "==", mobileNormalized).get();
  return snap.docs.map((d) => convertLeadFromFirestore(d as QueryDocumentSnapshot));
}

export async function checkDuplicateMobile(
  mobileNormalized: string,
  excludeLeadId?: string
): Promise<boolean> {
  const existing = await searchLeadsByMobile(mobileNormalized);
  if (excludeLeadId) {
    return existing.some((l) => l.leadId !== excludeLeadId && !l.archivedAt);
  }
  return existing.some((l) => !l.archivedAt);
}
