import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { convertFollowUpFromFirestore } from "./converters";
import type { FollowUpEntity, PaginatedResult } from "./types";

const FOLLOW_UPS = COLLECTIONS.FOLLOW_UPS;

export async function createFollowUp(data: {
  leadId: string;
  officeId: string;
  assignedRepId: string;
  scheduledAt: Date;
  reason?: string;
  lastCallResult?: string;
  lastNote?: string;
  createdBy: string;
}): Promise<FollowUpEntity> {
  const db = getAdminFirestore();
  const now = new Date();
  const followUpId = crypto.randomUUID();

  const followUpData = {
    followUpId,
    leadId: data.leadId,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId,
    scheduledAt: data.scheduledAt,
    status: "pending",
    reason: data.reason ?? null,
    lastCallResult: data.lastCallResult ?? null,
    lastNote: data.lastNote ?? null,
    createdAt: now,
    createdBy: data.createdBy,
    completedAt: null,
    completedBy: null,
  };

  await db.collection(FOLLOW_UPS).doc(followUpId).set(followUpData);
  return { ...followUpData, createdAt: now } as FollowUpEntity;
}

export async function getFollowUp(followUpId: string): Promise<FollowUpEntity | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(FOLLOW_UPS).doc(followUpId).get();
  if (!doc.exists) return null;
  return convertFollowUpFromFirestore(doc as QueryDocumentSnapshot);
}

export async function updateFollowUp(
  followUpId: string,
  updates: Partial<{
    scheduledAt: Date;
    status: string;
    reason: string;
    lastCallResult: string;
    lastNote: string;
    completedAt: Date;
    completedBy: string;
  }>
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(FOLLOW_UPS).doc(followUpId).update(updates);
}

export async function completeFollowUp(
  followUpId: string,
  completedBy: string
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(FOLLOW_UPS).doc(followUpId).update({
    status: "completed",
    completedAt: new Date(),
    completedBy,
  });
}

export async function listFollowUps(filters: {
  officeId?: string;
  assignedRepId?: string;
  status?: string;
  limit?: number;
} = {}): Promise<PaginatedResult<FollowUpEntity>> {
  const db = getAdminFirestore();
  const limit = filters.limit ?? 50;

  let query: Query = db.collection(FOLLOW_UPS);

  if (filters.officeId) {
    query = query.where("officeId", "==", filters.officeId);
  }
  if (filters.assignedRepId) {
    query = query.where("assignedRepId", "==", filters.assignedRepId);
  }
  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  query = query.orderBy("scheduledAt", "asc").limit(limit + 1);

  const snap = await query.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;

  return {
    items: items.map((d) => convertFollowUpFromFirestore(d as QueryDocumentSnapshot)),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    count: items.length,
  };
}

export async function getOpenFollowUpsForLead(leadId: string): Promise<FollowUpEntity[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(FOLLOW_UPS)
    .where("leadId", "==", leadId)
    .where("status", "==", "pending")
    .orderBy("scheduledAt", "asc")
    .get();

  return snap.docs.map((d) => convertFollowUpFromFirestore(d as QueryDocumentSnapshot));
}

export async function getDueFollowUps(
  assignedRepId: string,
  before: Date
): Promise<FollowUpEntity[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(FOLLOW_UPS)
    .where("assignedRepId", "==", assignedRepId)
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", before)
    .orderBy("scheduledAt", "asc")
    .get();

  return snap.docs.map((d) => convertFollowUpFromFirestore(d as QueryDocumentSnapshot));
}
