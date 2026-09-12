// ============================================
// ASG Leads — Firestore Survey Repository
// ============================================
// Server-side operations for survey sessions and responses

import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { DocumentSnapshot, FieldValue, Query, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/user-service";
import { getAccessibleOffices } from "@/lib/auth/permissions";
import type { OfficeId } from "@/lib/auth/types";
import type { SurveySession, SurveyResponse, SurveySessionStatus } from "@/lib/domain/survey";

const SESSIONS = COLLECTIONS.SURVEY_SESSIONS;
const RESPONSES = COLLECTIONS.SURVEY_RESPONSES;

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function sessionFromDoc(doc: DocumentSnapshot): SurveySession {
  const data = doc.data() as Record<string, any>;
  return {
    sessionId: data.sessionId,
    officeId: data.officeId,
    repUserId: data.repUserId,
    status: data.status,
    startedAt: toDate(data.startedAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    completedAt: toDate(data.completedAt),
    respondentCount: data.respondentCount ?? 0,
    leadCount: data.leadCount ?? 0,
    createdBy: data.createdBy,
    version: data.version ?? 1,
  };
}

function responseFromDoc(doc: DocumentSnapshot): SurveyResponse {
  const data = doc.data() as Record<string, any>;
  return {
    responseId: data.responseId,
    sessionId: data.sessionId,
    sequenceNumber: data.sequenceNumber,
    costOfLivingIncreased: data.costOfLivingIncreased ?? null,
    payingTooMuchTax: data.payingTooMuchTax ?? null,
    housingStatus: data.housingStatus ?? null,
    employmentStatus: data.employmentStatus ?? null,
    superannuation: data.superannuation ?? null,
    becameLead: data.becameLead ?? false,
    leadId: data.leadId ?? null,
    leadCaptureDraft: data.leadCaptureDraft ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

export async function createSurveySession(
  officeId: string
): Promise<{ sessionId: string; error?: string }> {
  const session = await validateSession();
  if (!session) return { sessionId: "", error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { sessionId: "", error: "User profile not found" };

  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(officeId as OfficeId)) {
    return { sessionId: "", error: "Office not accessible" };
  }

  const db = getAdminFirestore();
  const now = new Date();
  const sessionId = crypto.randomUUID();

  const sessionData = {
    sessionId,
    officeId,
    repUserId: session.uid,
    status: "in_progress" as SurveySessionStatus,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    respondentCount: 0,
    leadCount: 0,
    createdBy: session.uid,
    version: 1,
  };

  await db.collection(SESSIONS).doc(sessionId).set(sessionData);

  return { sessionId };
}

export async function getSurveySession(sessionId: string): Promise<SurveySession | null> {
  const session = await validateSession();
  if (!session) return null;

  const profile = await getUserProfile(session.uid);
  if (!profile) return null;

  const db = getAdminFirestore();
  const doc = await db.collection(SESSIONS).doc(sessionId).get();
  if (!doc.exists) return null;

  const surveySession = sessionFromDoc(doc);

  // Authorization check
  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(surveySession.officeId as OfficeId)) return null;

  const isRep = profile.role === "rep";
  if (isRep && surveySession.repUserId !== session.uid) return null;

  return surveySession;
}

export async function getActiveSurveySession(officeId?: string): Promise<SurveySession | null> {
  const session = await validateSession();
  if (!session) return null;

  const profile = await getUserProfile(session.uid);
  if (!profile) return null;

  const db = getAdminFirestore();
  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) return null;

  const targetOffice = officeId ?? profile.primaryOfficeId;
  if (!targetOffice || !accessibleOffices.includes(targetOffice as OfficeId)) {
    return null;
  }

  const isRep = profile.role === "rep";

  let query: Query = db.collection(SESSIONS)
    .where("officeId", "==", targetOffice)
    .where("status", "in", ["draft", "in_progress"]);

  if (isRep) {
    query = query.where("repUserId", "==", session.uid);
  }

  query = query.orderBy("updatedAt", "desc").limit(1);

  const snap = await query.get();
  if (snap.empty) return null;

  const surveySession = sessionFromDoc(snap.docs[0]);
  return surveySession;
}

export async function listSurveySessions(filters: {
  officeId?: string;
  status?: SurveySessionStatus;
  limit?: number;
  repUserId?: string;
} = {}): Promise<SurveySession[]> {
  const session = await validateSession();
  if (!session) return [];

  const profile = await getUserProfile(session.uid);
  if (!profile) return [];

  const db = getAdminFirestore();
  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) return [];

  const isRep = profile.role === "rep";

  let query: Query = db.collection(SESSIONS);

  // Office filter
  if (filters.officeId) {
    if (!accessibleOffices.includes(filters.officeId as OfficeId)) return [];
    query = query.where("officeId", "==", filters.officeId);
  } else if (isRep) {
    query = query.where("repUserId", "==", session.uid);
  } else {
    query = query.where("officeId", "in", accessibleOffices);
  }

  // Status filter
  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  // Rep filter (for managers/admins)
  if (filters.repUserId && !isRep) {
    query = query.where("repUserId", "==", filters.repUserId);
  }

  query = query.orderBy("updatedAt", "desc").limit(filters.limit ?? 50);

  const snap = await query.get();
  return snap.docs.map(sessionFromDoc);
}

export async function updateSurveySession(
  sessionId: string,
  updates: Partial<SurveySession>,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const sessionRef = db.collection(SESSIONS).doc(sessionId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) throw new Error("Survey session not found");

      const current = snap.data()!;
      const currentVersion = current.version ?? 1;

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      const accessibleOffices = getAccessibleOffices(profile);
      if (!accessibleOffices.includes(current.officeId as OfficeId)) {
        throw new Error("FORBIDDEN");
      }

      const isRep = profile.role === "rep";
      if (isRep && current.repUserId !== session.uid) {
        throw new Error("FORBIDDEN");
      }

      // Only allow certain fields to be updated
      const allowedUpdates: Record<string, any> = {};
      if (updates.status) allowedUpdates.status = updates.status;
      if (updates.respondentCount !== undefined) allowedUpdates.respondentCount = updates.respondentCount;
      if (updates.leadCount !== undefined) allowedUpdates.leadCount = updates.leadCount;
      if (updates.completedAt) allowedUpdates.completedAt = updates.completedAt;

      allowedUpdates.updatedAt = new Date();
      allowedUpdates.version = currentVersion + 1;

      tx.update(sessionRef, allowedUpdates);
    });

    return { success: true };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This session was updated by another user. Please refresh and try again." };
    }
    if (err.message === "FORBIDDEN") {
      return { success: false, error: "Access denied" };
    }
    return { success: false, error: err.message };
  }
}

export async function completeSurveySession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const sessionRef = db.collection(SESSIONS).doc(sessionId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) throw new Error("Survey session not found");

      const current = snap.data()!;
      const accessibleOffices = getAccessibleOffices(profile);
      if (!accessibleOffices.includes(current.officeId as OfficeId)) {
        throw new Error("FORBIDDEN");
      }

      const isRep = profile.role === "rep";
      if (isRep && current.repUserId !== session.uid) {
        throw new Error("FORBIDDEN");
      }

      // Calculate counts from responses
      const responsesSnap = await db
        .collection(SESSIONS)
        .doc(sessionId)
        .collection(RESPONSES)
        .get();

      const respondentCount = responsesSnap.docs.length;
      let leadCount = 0;
      responsesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.becameLead === true) leadCount++;
      });

      tx.update(sessionRef, {
        status: "completed",
        completedAt: new Date(),
        respondentCount,
        leadCount,
        updatedAt: new Date(),
        version: (current.version ?? 1) + 1,
      });
    });

    return { success: true };
  } catch (err: any) {
    if (err.message === "FORBIDDEN") {
      return { success: false, error: "Access denied" };
    }
    return { success: false, error: err.message };
  }
}

export async function createSurveyResponse(
  sessionId: string,
  sequenceNumber: number
): Promise<{ responseId: string; error?: string }> {
  const session = await validateSession();
  if (!session) return { responseId: "", error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { responseId: "", error: "User profile not found" };

  const db = getAdminFirestore();
  const sessionRef = db.collection(SESSIONS).doc(sessionId);

  try {
    const responseId = crypto.randomUUID();
    const now = new Date();

    await db.runTransaction(async (tx) => {
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) throw new Error("Survey session not found");

      const current = sessionSnap.data()!;
      const accessibleOffices = getAccessibleOffices(profile);
      if (!accessibleOffices.includes(current.officeId as OfficeId)) {
        throw new Error("FORBIDDEN");
      }

      const isRep = profile.role === "rep";
      if (isRep && current.repUserId !== session.uid) {
        throw new Error("FORBIDDEN");
      }

      if (current.status !== "in_progress" && current.status !== "draft") {
        throw new Error("Session not in progress");
      }

      const responseData = {
        responseId,
        sessionId,
        sequenceNumber,
        costOfLivingIncreased: null,
        payingTooMuchTax: null,
        housingStatus: null,
        employmentStatus: null,
        superannuation: null,
        becameLead: false,
        leadId: null,
        leadCaptureDraft: null,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(sessionRef.collection(RESPONSES).doc(responseId), responseData);

      // Update session respondent count
      tx.update(sessionRef, {
        respondentCount: (current.respondentCount ?? 0) + 1,
        updatedAt: now,
        version: (current.version ?? 1) + 1,
      });
    });

    return { responseId };
  } catch (err: any) {
    if (err.message === "FORBIDDEN") {
      return { responseId: "", error: "Access denied" };
    }
    return { responseId: "", error: err.message };
  }
}

export async function getSurveyResponse(responseId: string): Promise<SurveyResponse | null> {
  const session = await validateSession();
  if (!session) return null;

  const profile = await getUserProfile(session.uid);
  if (!profile) return null;

  const db = getAdminFirestore();

  // Find which session this response belongs to
  // We need to query all sessions the user can access
  const sessions = await listSurveySessions({ limit: 100 });
  const sessionIds = sessions.map((s) => s.sessionId);

  for (const sessionId of sessionIds) {
    const doc = await db.collection(SESSIONS).doc(sessionId).collection(RESPONSES).doc(responseId).get();
    if (doc.exists) {
      return responseFromDoc(doc);
    }
  }

  return null;
}

export async function updateSurveyResponse(
  sessionId: string,
  responseId: string,
  updates: Partial<SurveyResponse>
): Promise<{ success: boolean; error?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const responseRef = db.collection(SESSIONS).doc(sessionId).collection(RESPONSES).doc(responseId);

  try {
    await db.runTransaction(async (tx) => {
      const sessionSnap = await tx.get(db.collection(SESSIONS).doc(sessionId));
      if (!sessionSnap.exists) throw new Error("Survey session not found");

      const currentSession = sessionSnap.data()!;
      const accessibleOffices = getAccessibleOffices(profile);
      if (!accessibleOffices.includes(currentSession.officeId as OfficeId)) {
        throw new Error("FORBIDDEN");
      }

      const isRep = profile.role === "rep";
      if (isRep && currentSession.repUserId !== session.uid) {
        throw new Error("FORBIDDEN");
      }

      if (currentSession.status !== "in_progress" && currentSession.status !== "draft") {
        throw new Error("Session not in progress");
      }

      const responseSnap = await tx.get(responseRef);
      if (!responseSnap.exists) throw new Error("Response not found");

      // Only allow certain fields to be updated
      const allowedUpdates: Record<string, any> = {};
      const allowedFields = [
        "costOfLivingIncreased",
        "payingTooMuchTax",
        "housingStatus",
        "employmentStatus",
        "superannuation",
        "becameLead",
        "leadId",
        "leadCaptureDraft",
      ];

      for (const field of allowedFields) {
        if (field in updates) {
          allowedUpdates[field] = (updates as any)[field];
        }
      }

      allowedUpdates.updatedAt = new Date();

      tx.update(responseRef, allowedUpdates);
    });

    return { success: true };
  } catch (err: any) {
    if (err.message === "FORBIDDEN") {
      return { success: false, error: "Access denied" };
    }
    return { success: false, error: err.message };
  }
}

export async function listSurveyResponses(sessionId: string): Promise<SurveyResponse[]> {
  const session = await validateSession();
  if (!session) return [];

  const profile = await getUserProfile(session.uid);
  if (!profile) return [];

  const db = getAdminFirestore();
  const sessionRef = db.collection(SESSIONS).doc(sessionId);

  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return [];

  const sessionData = sessionSnap.data()!;
  const accessibleOffices = getAccessibleOffices(profile);
  if (!accessibleOffices.includes(sessionData.officeId as OfficeId)) return [];

  const isRep = profile.role === "rep";
  if (isRep && sessionData.repUserId !== session.uid) return [];

  const snap = await sessionRef.collection(RESPONSES).orderBy("sequenceNumber", "asc").get();
  return snap.docs.map(responseFromDoc);
}

// Custom error class for duplicate mobile detection
class DuplicateMobileError extends Error {
  leadId: string | undefined;
  constructor(leadId: string | undefined) {
    super("DUPLICATE_MOBILE");
    this.leadId = leadId;
  }
}

export async function convertSurveyResponseToLead(
  sessionId: string,
  responseId: string,
  leadData: {
    name: string;
    mobile: string;
    address: string;
    notes?: string;
  }
): Promise<{ success: boolean; leadId?: string; error?: string; duplicateLeadId?: string }> {
  const session = await validateSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const profile = await getUserProfile(session.uid);
  if (!profile) return { success: false, error: "User profile not found" };

  const db = getAdminFirestore();
  const sessionRef = db.collection(SESSIONS).doc(sessionId);
  const responseRef = sessionRef.collection(RESPONSES).doc(responseId);
  const LEADS = COLLECTIONS.LEADS;

  try {
    const leadId = await db.runTransaction(async (tx) => {
      // Get session
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) throw new Error("Survey session not found");

      const sessionData = sessionSnap.data()!;
      const accessibleOffices = getAccessibleOffices(profile);
      if (!accessibleOffices.includes(sessionData.officeId as OfficeId)) {
        throw new Error("FORBIDDEN");
      }

      const isRep = profile.role === "rep";
      if (isRep && sessionData.repUserId !== session.uid) {
        throw new Error("FORBIDDEN");
      }

      // Get response
      const responseSnap = await tx.get(responseRef);
      if (!responseSnap.exists) throw new Error("Survey response not found");

      const responseData = responseSnap.data()!;
      if (responseData.becameLead) {
        throw new Error("ALREADY_CONVERTED");
      }

      // Validate mobile
      const { normalizeAustralianMobile } = await import("@/lib/domain/mobile");
      const mobileNormalized = normalizeAustralianMobile(leadData.mobile);
      if (!mobileNormalized) {
        throw new Error("INVALID_MOBILE");
      }

      // Check duplicate mobile
      const mobileKeyRef = db.collection("leadMobileKeys").doc(mobileNormalized);
      const mobileKeySnap = await tx.get(mobileKeyRef);
      if (mobileKeySnap.exists) {
        const existingLeadId = mobileKeySnap.data()?.leadId;
        throw new DuplicateMobileError(existingLeadId);
      }

      // Create lead
      const leadId = crypto.randomUUID();
      const now = new Date();

      const leadDoc = {
        leadId,
        name: leadData.name,
        mobile: leadData.mobile,
        mobileNormalized,
        address: leadData.address,
        suburb: null,
        officeId: sessionData.officeId,
        assignedRepId: sessionData.repUserId,
        source: "community_survey",
        status: "new",
        notes: leadData.notes ?? null,
        survey: {
          renterOwner: responseData.housingStatus
            ? (responseData.housingStatus === "renter" ? "Renter" : responseData.housingStatus === "owner" ? "Owner" : "Other")
            : null,
          employmentStatus: responseData.employmentStatus
            ? (responseData.employmentStatus === "full_time" ? "Full Time" :
               responseData.employmentStatus === "part_time" ? "Part Time" :
               responseData.employmentStatus === "casual" ? "Casual" :
               responseData.employmentStatus === "self_employed" ? "Self Employed" :
               responseData.employmentStatus === "retired" ? "Retired" : "Other")
            : null,
          superannuation: responseData.superannuation
            ? SUPERANNUATION_DISPLAY[responseData.superannuation]
            : null,
          costOfLivingResponse: responseData.costOfLivingIncreased === "yes" ? "Yes" : "No",
          taxResponse: responseData.payingTooMuchTax === "yes" ? "Yes" : "No",
        },
        createdAt: now,
        createdBy: session.uid,
        updatedAt: now,
        updatedBy: session.uid,
        lastContactAt: null,
        nextFollowUpAt: null,
        activeCallLease: null,
        archivedAt: null,
        version: 0,
      };

      tx.set(db.collection(LEADS).doc(leadId), leadDoc);
      tx.set(mobileKeyRef, { leadId, mobileNormalized, createdAt: now });

      // Create activity
      tx.set(db.collection(LEADS).doc(leadId).collection("activities").doc(), {
        activityId: crypto.randomUUID(),
        leadId,
        type: "lead_created",
        description: `Lead created from survey session ${sessionId}`,
        createdAt: now,
        createdBy: session.uid,
        metadata: { surveySessionId: sessionId, surveyResponseId: responseId },
      });

      // Update response
      tx.update(responseRef, {
        becameLead: true,
        leadId,
        leadCaptureDraft: null,
        updatedAt: now,
      });

      // Update session lead count
      tx.update(sessionRef, {
        leadCount: (sessionData.leadCount ?? 0) + 1,
        updatedAt: now,
        version: (sessionData.version ?? 1) + 1,
      });

      return leadId;
    });

    return { success: true, leadId };
  } catch (err: any) {
    if (err instanceof DuplicateMobileError) {
      return { success: false, error: "A lead with this mobile number already exists", duplicateLeadId: err.leadId };
    }
    if (err.message === "FORBIDDEN") {
      return { success: false, error: "Access denied" };
    }
    if (err.message === "ALREADY_CONVERTED") {
      return { success: false, error: "This respondent has already been converted to a lead" };
    }
    if (err.message === "INVALID_MOBILE") {
      return { success: false, error: "Invalid Australian mobile number" };
    }
    return { success: false, error: err.message };
  }
}

// Display mapping for superannuation
const SUPERANNUATION_DISPLAY: Record<string, string> = {
  under_50k: "Under $50k",
  "50k_100k": "$50k - $100k",
  "75k_150k": "$75k - $150k",
  "100k_200k": "$100k - $200k",
  "200k_500k": "$200k - $500k",
  "500k_plus": "$500k+",
  dont_know: "Don't Know",
};

export async function getSurveyAnalytics(filters: {
  officeId?: string;
  repUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  totalRespondents: number;
  totalLeads: number;
  costOfLivingYesPercent: number;
  taxYesPercent: number;
  housingDistribution: Record<string, number>;
  employmentDistribution: Record<string, number>;
  superannuationDistribution: Record<string, number>;
  leadConversionRate: number;
}> {
  const session = await validateSession();
  if (!session) return emptyAnalytics();

  const profile = await getUserProfile(session.uid);
  if (!profile) return emptyAnalytics();

  const db = getAdminFirestore();
  const accessibleOffices = getAccessibleOffices(profile);
  if (accessibleOffices.length === 0) return emptyAnalytics();

  const isRep = profile.role === "rep";

  // Get all relevant sessions
  let sessionQuery: Query = db.collection(SESSIONS).where("status", "==", "completed");

  if (filters.officeId) {
    if (!accessibleOffices.includes(filters.officeId as OfficeId)) return emptyAnalytics();
    sessionQuery = sessionQuery.where("officeId", "==", filters.officeId);
  } else if (isRep) {
    sessionQuery = sessionQuery.where("repUserId", "==", session.uid);
  } else {
    sessionQuery = sessionQuery.where("officeId", "in", accessibleOffices);
  }

  if (filters.repUserId && !isRep) {
    sessionQuery = sessionQuery.where("repUserId", "==", filters.repUserId);
  }

  const sessionsSnap = await sessionQuery.get();
  const sessionIds = sessionsSnap.docs.map((d) => d.id);

  if (sessionIds.length === 0) return emptyAnalytics();

  // Fetch responses for all sessions
  let totalRespondents = 0;
  let totalLeads = 0;
  let costOfLivingYes = 0;
  let taxYes = 0;
  const housingDist: Record<string, number> = {};
  const employmentDist: Record<string, number> = {};
  const superDist: Record<string, number> = {};

  for (const sessionId of sessionIds) {
    const responsesSnap = await db
      .collection(SESSIONS)
      .doc(sessionId)
      .collection(RESPONSES)
      .get();

    for (const doc of responsesSnap.docs) {
      const data = doc.data() as SurveyResponse;
      totalRespondents++;
      if (data.becameLead) totalLeads++;

      if (data.costOfLivingIncreased === "yes") costOfLivingYes++;
      if (data.payingTooMuchTax === "yes") taxYes++;

      if (data.housingStatus) {
        housingDist[data.housingStatus] = (housingDist[data.housingStatus] ?? 0) + 1;
      }
      if (data.employmentStatus) {
        employmentDist[data.employmentStatus] = (employmentDist[data.employmentStatus] ?? 0) + 1;
      }
      if (data.superannuation) {
        superDist[data.superannuation] = (superDist[data.superannuation] ?? 0) + 1;
      }
    }
  }

  return {
    totalRespondents,
    totalLeads,
    costOfLivingYesPercent: totalRespondents > 0 ? Math.round((costOfLivingYes / totalRespondents) * 100) : 0,
    taxYesPercent: totalRespondents > 0 ? Math.round((taxYes / totalRespondents) * 100) : 0,
    housingDistribution: housingDist,
    employmentDistribution: employmentDist,
    superannuationDistribution: superDist,
    leadConversionRate: totalRespondents > 0 ? Math.round((totalLeads / totalRespondents) * 100) : 0,
  };
}

function emptyAnalytics() {
  return {
    totalRespondents: 0,
    totalLeads: 0,
    costOfLivingYesPercent: 0,
    taxYesPercent: 0,
    housingDistribution: {} as Record<string, number>,
    employmentDistribution: {} as Record<string, number>,
    superannuationDistribution: {} as Record<string, number>,
    leadConversionRate: 0,
  };
}