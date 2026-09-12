// ============================================
// ASG Leads — Server-Side Lead Queries
// ============================================
// Server components for fetching lead data with authorization

import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { convertLeadFromFirestore } from "@/lib/firestore/leads/converters";
import type { LeadEntity, LeadQueryFilters } from "@/lib/firestore/leads/types";
import { getAccessibleOffices } from "@/lib/auth/permissions";
import { validateSession } from "@/lib/auth/session";
import type { OfficeId } from "@/lib/auth/types";

const LEADS = COLLECTIONS.LEADS;

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

export interface LeadCursor {
  createdAt: string;
  documentId: string;
}

export interface ServerLeadQueryResult {
  leads: LeadEntity[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

function parseCursor(cursor: string | undefined): LeadCursor | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (decoded.createdAt && decoded.documentId) {
      return decoded as LeadCursor;
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: LeadCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export async function getLeadsForUser(filters: LeadQueryFilters = {}): Promise<ServerLeadQueryResult> {
  const session = await validateSession();
  if (!session) {
    return { leads: [], totalCount: 0, hasMore: false, nextCursor: null };
  }

  const profile = await getUserProfile(session.uid);
  if (!profile) {
    return { leads: [], totalCount: 0, hasMore: false, nextCursor: null };
  }

  const db = getAdminFirestore();
  const limit = filters.limit ?? 50;

  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) {
    return { leads: [], totalCount: 0, hasMore: false, nextCursor: null };
  }

  // Build query using any to avoid Query/CollectionReference type conflicts
  let query: any = db.collection(LEADS);

  const isRep = profile.role === "rep";

  if (isRep) {
    query = query.where("assignedRepId", "==", profile.uid);
    query = query.where("officeId", "in", accessibleOffices);
  } else if (filters.officeId) {
    if (!accessibleOffices.includes(filters.officeId as OfficeId)) {
      return { leads: [], totalCount: 0, hasMore: false, nextCursor: null };
    }
    query = query.where("officeId", "==", filters.officeId);
  } else {
    query = query.where("officeId", "in", accessibleOffices);
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }
  if (filters.source) {
    query = query.where("source", "==", filters.source);
  }
  if (filters.assignedRepId && !isRep) {
    query = query.where("assignedRepId", "==", filters.assignedRepId);
  }
  if (filters.mobileNormalized) {
    query = query.where("mobileNormalized", "==", filters.mobileNormalized);
  }

  // Order by createdAt desc, then leadId asc as deterministic tie-breaker
  query = query.orderBy("createdAt", "desc").orderBy("leadId", "asc");

  // Handle cursor-based pagination
  const cursor = parseCursor(filters.cursor);
  if (cursor) {
    query = query.startAfter(new Date(cursor.createdAt), cursor.documentId);
  }

  // Fetch limit + 1 to determine hasMore
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;

  const lastItem = items[items.length - 1];
  const nextCursor: LeadCursor | null = hasMore && lastItem
    ? {
        createdAt: (lastItem as any).createdAt?.toDate?.()?.toISOString()
          ?? (lastItem as any).createdAt
          ?? new Date().toISOString(),
        documentId: (lastItem as any).leadId,
      }
    : null;

  return {
    leads: items.map((d: any) => convertLeadFromFirestore(d)),
    totalCount: items.length,
    hasMore,
    nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
  };
}

export async function getLeadById(leadId: string): Promise<LeadEntity | null> {
  const session = await validateSession();
  if (!session) return null;

  const profile = await getUserProfile(session.uid);
  if (!profile) return null;

  const db = getAdminFirestore();
  const doc = await db.collection(LEADS).doc(leadId).get();
  if (!doc.exists) return null;

  const lead = convertLeadFromFirestore(doc as any);

  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(lead.officeId as OfficeId)) return null;

  const isRep = profile.role === "rep";
  if (isRep && lead.assignedRepId !== session.uid) return null;

  return lead;
}

export async function getUserProfiles(uids: string[]): Promise<Map<string, { displayName: string; email: string }>> {
  if (uids.length === 0) return new Map();

  const db = getAdminFirestore();
  const uniqueUids = [...new Set(uids)];
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueUids.length; i += 10) {
    chunks.push(uniqueUids.slice(i, i + 10));
  }

  const profileMap = new Map<string, { displayName: string; email: string }>();

  for (const chunk of chunks) {
    const snap = await db.collection("users").where("uid", "in", chunk).get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      profileMap.set(data.uid, {
        displayName: data.displayName,
        email: data.email,
      });
    });
  }

  return profileMap;
}

export async function getLeadActivities(leadId: string): Promise<any[]> {
  const session = await validateSession();
  if (!session) return [];

  const profile = await getUserProfile(session.uid);
  if (!profile) return [];

  const db = getAdminFirestore();
  const lead = await getLeadById(leadId);
  if (!lead) return [];

  const snap = await db
    .collection(LEADS)
    .doc(leadId)
    .collection("activities")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      activityId: data.activityId,
      leadId: data.leadId,
      type: data.type,
      description: data.description,
      createdAt: toDate(data.createdAt)?.toISOString() ?? new Date().toISOString(),
      createdBy: data.createdBy,
      metadata: data.metadata,
    };
  });
}

export async function getFollowUpsForUser(filters: {
  officeId?: string;
  assignedRepId?: string;
  status?: string;
  limit?: number;
  leadId?: string;
} = {}): Promise<any[]> {
  const session = await validateSession();
  if (!session) return [];

  const profile = await getUserProfile(session.uid);
  if (!profile) return [];

  const db = getAdminFirestore();
  const limit = filters.limit ?? 100;

  let query: any = db.collection(COLLECTIONS.FOLLOW_UPS);

  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) return [];

  const isRep = profile.role === "rep";

  if (filters.leadId) {
    query = query.where("leadId", "==", filters.leadId);
  } else if (isRep) {
    query = query.where("assignedRepId", "==", profile.uid);
    query = query.where("officeId", "in", accessibleOffices);
  } else if (filters.officeId) {
    if (!accessibleOffices.includes(filters.officeId as OfficeId)) return [];
    query = query.where("officeId", "==", filters.officeId);
  } else {
    query = query.where("officeId", "in", accessibleOffices);
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }
  if (filters.assignedRepId && !isRep) {
    query = query.where("assignedRepId", "==", filters.assignedRepId);
  }

  query = query.orderBy("scheduledAt", "asc").limit(limit);

  const snap = await query.get();
  return snap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      followUpId: data.followUpId,
      leadId: data.leadId,
      officeId: data.officeId,
      assignedRepId: data.assignedRepId,
      scheduledAt: toDate(data.scheduledAt)?.toISOString() ?? new Date().toISOString(),
      status: data.status,
      reason: data.reason,
      lastCallResult: data.lastCallResult,
      lastNote: data.lastNote,
      createdAt: toDate(data.createdAt)?.toISOString() ?? new Date().toISOString(),
      createdBy: data.createdBy,
      completedAt: toDate(data.completedAt)?.toISOString(),
      completedBy: data.completedBy,
    };
  });
}

export async function getDashboardMetrics(): Promise<{
  myLeads: number;
  leadsToCall: number;
  followUpsDue: number;
  newLeads: number;
  bookedLeads: number;
  officeLeadCounts: { perth: number; brisbane: number };
}> {
  const session = await validateSession();
  if (!session) {
    return { myLeads: 0, leadsToCall: 0, followUpsDue: 0, newLeads: 0, bookedLeads: 0, officeLeadCounts: { perth: 0, brisbane: 0 } };
  }

  const profile = await getUserProfile(session.uid);
  if (!profile) {
    return { myLeads: 0, leadsToCall: 0, followUpsDue: 0, newLeads: 0, bookedLeads: 0, officeLeadCounts: { perth: 0, brisbane: 0 } };
  }

  const db = getAdminFirestore();
  const isRep = profile.role === "rep";

  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) {
    return { myLeads: 0, leadsToCall: 0, followUpsDue: 0, newLeads: 0, bookedLeads: 0, officeLeadCounts: { perth: 0, brisbane: 0 } };
  }

  const callableStatuses = ["new", "no_answer", "callback", "contacted", "revisit"];

  let myLeads = 0;
  let leadsToCall = 0;
  let newLeads = 0;
  let bookedLeads = 0;
  const officeLeadCounts = { perth: 0, brisbane: 0 };

  for (const officeId of accessibleOffices) {
    let totalQuery: any = db.collection(LEADS).where("officeId", "==", officeId);
    if (isRep) {
      totalQuery = totalQuery.where("assignedRepId", "==", profile.uid);
    }
    const totalSnap = await totalQuery.count().get();
    const total = totalSnap.data().count;
    officeLeadCounts[officeId as "perth" | "brisbane"] = total;

    myLeads += total;

    const callableQuery = totalQuery.where("status", "in", callableStatuses);
    const callableSnap = await callableQuery.count().get();
    leadsToCall += callableSnap.data().count;

    const newQuery = totalQuery.where("status", "==", "new");
    const newSnap = await newQuery.count().get();
    newLeads += newSnap.data().count;

    const bookedQuery = totalQuery.where("status", "==", "booked");
    const bookedSnap = await bookedQuery.count().get();
    bookedLeads += bookedSnap.data().count;
  }

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  let followUpsDue = 0;
  let followUpQuery: any = db.collection(COLLECTIONS.FOLLOW_UPS)
    .where("officeId", "in", accessibleOffices)
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", todayEnd);

  if (isRep) {
    followUpQuery = followUpQuery.where("assignedRepId", "==", profile.uid);
  }

  const followUpSnap = await followUpQuery.count().get();
  followUpsDue = followUpSnap.data().count;

  return {
    myLeads,
    leadsToCall,
    followUpsDue,
    newLeads,
    bookedLeads,
    officeLeadCounts,
  };
}

// Helper function to get user profile
async function getUserProfile(uid: string) {
  const { getUserProfile: fetchProfile } = await import("@/lib/auth/user-service");
  return fetchProfile(uid);
}