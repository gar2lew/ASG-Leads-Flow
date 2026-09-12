import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { convertActivityFromFirestore } from "./converters";
import type { ActivityEntity } from "./types";

const LEADS = COLLECTIONS.LEADS;

export async function createActivity(data: {
  leadId: string;
  type: string;
  description: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}): Promise<ActivityEntity> {
  const db = getAdminFirestore();
  const now = new Date();
  const activityId = crypto.randomUUID();

  const activityData = {
    activityId,
    leadId: data.leadId,
    type: data.type,
    description: data.description,
    createdAt: now,
    createdBy: data.createdBy,
    metadata: data.metadata ?? {},
  };

  await db.collection(LEADS).doc(data.leadId).collection("activities").doc(activityId).set(activityData);
  return { ...activityData, createdAt: now } as ActivityEntity;
}

export async function getLeadActivities(leadId: string): Promise<ActivityEntity[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(LEADS)
    .doc(leadId)
    .collection("activities")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => convertActivityFromFirestore(d as QueryDocumentSnapshot));
}

export async function getLeadActivityCount(leadId: string): Promise<number> {
  const db = getAdminFirestore();
  const agg = await db.collection(LEADS).doc(leadId).collection("activities").count().get();
  return agg.data().count;
}
