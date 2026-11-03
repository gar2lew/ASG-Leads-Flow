// ============================================
// ASG Leads — Lead Server Actions (Server-only)
// ============================================

import "server-only";

import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Timestamp } from "firebase-admin/firestore";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";
import { validateLeadInput, validateLeadUpdateInput } from "@/lib/domain/validation";
import { isLeadStatus, isLeadSource } from "@/lib/domain/status";
import type { LeadSourceValue } from "@/lib/domain/status";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/user-service";
import { buildAppointmentActivityData, getCallSchedulingError, parseOfficeLocalDateTime } from "@/lib/domain/call-scheduling";
import { formatZonedTime, officeToTimeZone } from "@/lib/timezone";

const LEADS = COLLECTIONS.LEADS;

export interface LeadActionResult {
  success: boolean;
  leadId?: string;
  error?: string;
  duplicateWarning?: boolean;
  duplicateLeadId?: string;
}

function normalizeSource(source: string): LeadSourceValue | undefined {
  return isLeadSource(source) ? source : undefined;
}

/**
 * SECURITY: All actor identity is derived from the authenticated server session.
 * Client components must NOT supply userId/actorId for mutation operations.
 */
async function getActor(): Promise<{ uid: string; profile: any } | null> {
  const session = await validateSession();
  if (!session) return null;
  const profile = await getUserProfile(session.uid);
  if (!profile) return null;
  return { uid: session.uid, profile };
}

export async function createLeadAction(
  data: {
    name: string;
    mobile: string;
    address: string;
    suburb?: string;
    officeId: string;
    assignedRepId?: string;
    source: string;
    notes?: string;
    survey?: any;
  }
): Promise<LeadActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };
  if (actor.profile.role === "rep") return { success: false, error: "Reps cannot create leads via this method" };

  const input = {
    ...data,
    source: normalizeSource(data.source) ?? ("manual_entry" as const),
  };
  const validation = validateLeadInput(input);
  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.errors?.join(", ") };
  }

  const mobileNormalized = normalizeAustralianMobile(data.mobile);
  if (!mobileNormalized) {
    return { success: false, error: "Invalid Australian mobile number" };
  }

  const db = getAdminFirestore();
  const uniquenessKey = `mobile_${mobileNormalized}`;
  const existingKey = await db.collection("leadMobileKeys").doc(uniquenessKey).get();
  if (existingKey.exists) {
    return {
      success: false,
      error: "A lead with this mobile number already exists",
      duplicateWarning: true,
      duplicateLeadId: existingKey.data()?.leadId,
    };
  }

  const batch = db.batch();
  const leadRef = db.collection(LEADS).doc();
  const leadId = leadRef.id;
  const now = new Date();
  const createdBy = actor.uid;

  const leadData = {
    leadId,
    name: data.name,
    mobile: data.mobile,
    mobileNormalized,
    address: data.address,
    suburb: data.suburb ?? null,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId ?? null,
    source: input.source,
    status: "new",
    notes: data.notes ?? null,
    survey: data.survey ?? null,
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
    lastContactAt: null,
    nextFollowUpAt: null,
    activeCallLease: null,
    archivedAt: null,
    version: 0,
  };

  batch.set(leadRef, leadData);
  batch.set(db.collection("leadMobileKeys").doc(uniquenessKey), {
    leadId,
    mobileNormalized,
    createdAt: now,
  });
  batch.set(db.collection(LEADS).doc(leadId).collection("activities").doc(), {
    activityId: crypto.randomUUID(),
    leadId,
    type: "lead_created",
    description: `Lead created by ${createdBy}`,
    createdAt: now,
    createdBy,
    metadata: {},
  });

  await batch.commit();

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, leadId };
}

export async function updateLeadAction(
  leadId: string,
  data: Partial<{
    name: string;
    mobile: string;
    address: string;
    suburb: string;
    officeId: string;
    assignedRepId: string;
    source: string;
    notes: string;
    survey: any;
    nextFollowUpAt: string;
  }>,
  expectedVersion?: number
): Promise<LeadActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const updateInput: any = { ...data };
  if (data.source) {
    updateInput.source = normalizeSource(data.source);
  }
  const validation = validateLeadUpdateInput(updateInput);
  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.errors?.join(", ") };
  }

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const now = new Date();
  const updatedBy = actor.uid;

  try {
    const lead = await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) throw new Error("Lead not found");

      const current = snap.data()!;
      const currentVersion = current.version ?? 0;

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      if (data.mobile) {
        const normalized = normalizeAustralianMobile(data.mobile);
        if (!normalized) throw new Error("Invalid Australian mobile number");
        updateInput.mobileNormalized = normalized;

        if (normalized !== current.mobileNormalized) {
          const oldKey = `mobile_${current.mobileNormalized}`;
          const newKey = `mobile_${normalized}`;
          const existingKey = await tx.get(db.collection("leadMobileKeys").doc(newKey));
          if (existingKey.exists) throw new Error("Mobile number already exists");
          tx.delete(db.collection("leadMobileKeys").doc(oldKey));
          tx.set(db.collection("leadMobileKeys").doc(newKey), {
            leadId,
            mobileNormalized: normalized,
            createdAt: now,
          });
        }
      }

      tx.update(leadRef, {
        ...updateInput,
        updatedAt: now,
        updatedBy,
        version: currentVersion + 1,
      });

      return { ...current, ...updateInput, updatedAt: now, updatedBy, version: currentVersion + 1 };
    });

    await db.collection(LEADS).doc(leadId).collection("activities").add({
      activityId: crypto.randomUUID(),
      leadId,
      type: "lead_updated",
      description: `Lead updated by ${updatedBy}`,
      createdAt: now,
      createdBy: updatedBy,
      metadata: {},
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This lead was updated by another user. Please refresh and try again." };
    }
    return { success: false, error: err.message };
  }
}

export async function changeLeadStatusAction(
  leadId: string,
  newStatus: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  if (!isLeadStatus(newStatus)) {
    return { success: false, error: "Invalid status value" };
  }

  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const now = new Date();
  const updatedBy = actor.uid;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) throw new Error("Lead not found");

      const current = snap.data()!;
      const currentVersion = current.version ?? 0;

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      tx.update(leadRef, {
        status: newStatus,
        updatedAt: now,
        updatedBy,
        version: currentVersion + 1,
      });

      return { ...current, status: newStatus, updatedAt: now, updatedBy, version: currentVersion + 1 };
    });

    await db.collection(LEADS).doc(leadId).collection("activities").add({
      activityId: crypto.randomUUID(),
      leadId,
      type: "status_changed",
      description: `Status changed to ${newStatus}`,
      createdAt: now,
      createdBy: updatedBy,
      metadata: { newStatus },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This lead was updated by another user. Please refresh and try again." };
    }
    return { success: false, error: err.message };
  }
}

export async function assignLeadAction(
  leadId: string,
  assignedRepId: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const now = new Date();
  const updatedBy = actor.uid;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) throw new Error("Lead not found");

      const current = snap.data()!;
      const currentVersion = current.version ?? 0;

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      tx.update(leadRef, {
        assignedRepId,
        updatedAt: now,
        updatedBy,
        version: currentVersion + 1,
      });

      return { ...current, assignedRepId, updatedAt: now, updatedBy, version: currentVersion + 1 };
    });

    await db.collection(LEADS).doc(leadId).collection("activities").add({
      activityId: crypto.randomUUID(),
      leadId,
      type: "lead_assigned",
      description: `Lead assigned to ${assignedRepId}`,
      createdAt: now,
      createdBy: updatedBy,
      metadata: { assignedRepId },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This lead was updated by another user. Please refresh and try again." };
    }
    return { success: false, error: err.message };
  }
}

export async function archiveLeadAction(
  leadId: string
): Promise<LeadActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const db = getAdminFirestore();
  const now = new Date();
  const updatedBy = actor.uid;

  await db.collection(LEADS).doc(leadId).update({
    archivedAt: now,
    updatedAt: now,
    updatedBy,
  });

  await db.collection(LEADS).doc(leadId).collection("activities").add({
    activityId: crypto.randomUUID(),
    leadId,
    type: "lead_archived",
    description: `Lead archived by ${updatedBy}`,
    createdAt: now,
    createdBy: updatedBy,
    metadata: {},
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { success: true, leadId };
}

export async function saveCallResultAction(
  leadId: string,
  callResult: string,
  note: string | undefined,
  callbackDate: string | undefined,
  callbackTime: string | undefined,
  appointmentDateTime: string | undefined,
  expectedVersion?: number
): Promise<LeadActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const now = new Date();
  const userId = actor.uid;

  try {
    const scheduleValidationError = await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) throw new Error("Lead not found");

      const current = snap.data()!;
      const currentVersion = current.version ?? 0;

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      const validationError = getCallSchedulingError(
        callResult,
        callbackDate ?? "",
        callbackTime ?? "",
        appointmentDateTime ?? "",
        current.officeId,
      );
      if (validationError) return validationError;

      const timeZone = officeToTimeZone(current.officeId);
      const scheduledAt = callResult === "Callback"
        ? parseOfficeLocalDateTime(`${callbackDate}T${callbackTime}`, current.officeId)
        : null;
      const appointmentAt = callResult === "Booked"
        ? parseOfficeLocalDateTime(appointmentDateTime!, current.officeId)
        : null;

      const updates: Record<string, unknown> = {
        status: callResult.toLowerCase().replace(/ /g, "_"),
        lastContactAt: now,
      };

      if (note) {
        updates.notes = note;
      }

      if (callResult === "Callback" && scheduledAt) {
        updates.nextFollowUpAt = scheduledAt;

        const followUpRef = db.collection(COLLECTIONS.FOLLOW_UPS).doc();
        tx.set(followUpRef, {
          followUpId: followUpRef.id,
          leadId,
          officeId: current.officeId,
          assignedRepId: current.assignedRepId ?? userId,
          scheduledAt,
          status: "pending",
          reason: null,
          lastCallResult: callResult,
          lastNote: note,
          createdAt: now,
          createdBy: userId,
          completedAt: null,
          completedBy: null,
        });

        tx.set(db.collection(LEADS).doc(leadId).collection("activities").doc(), {
          activityId: crypto.randomUUID(),
          leadId,
          type: "follow_up_scheduled",
          description: `Callback scheduled for ${formatZonedTime(scheduledAt, timeZone, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`,
          createdAt: now,
          createdBy: userId,
          metadata: { callResult, scheduledAt },
        });
      }

      tx.update(leadRef, {
        ...updates,
        updatedAt: now,
        updatedBy: userId,
        version: currentVersion + 1,
      });

      if (callResult === "Booked" && appointmentAt) {
        const appointmentActivityRef = leadRef.collection("activities").doc();
        tx.set(appointmentActivityRef, {
          activityId: appointmentActivityRef.id,
          leadId,
          ...buildAppointmentActivityData(appointmentAt, current.officeId),
          createdAt: now,
          createdBy: userId,
        });
      }

      return null;
    });

    if (scheduleValidationError) {
      return { success: false, error: scheduleValidationError };
    }

    await db.collection(LEADS).doc(leadId).collection("activities").add({
      activityId: crypto.randomUUID(),
      leadId,
      type: "call_completed",
      description: `Call result: ${callResult}${note ? `. Note: ${note}` : ""}`,
      createdAt: now,
      createdBy: userId,
      metadata: { callResult, note },
    });

    if (note) {
      await db.collection(LEADS).doc(leadId).collection("activities").add({
        activityId: crypto.randomUUID(),
        leadId,
        type: "note_added",
        description: note,
        createdAt: now,
        createdBy: userId,
        metadata: {},
      });
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/calling");
    revalidatePath("/follow-ups");
    return { success: true, leadId };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This lead was updated by another user. Please refresh and try again." };
    }
    return { success: false, error: err.message };
  }
}

export async function completeFollowUpAction(
  followUpId: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated" };

  const db = getAdminFirestore();
  const followUpRef = db.collection(COLLECTIONS.FOLLOW_UPS).doc(followUpId);
  const now = new Date();
  const userId = actor.uid;

  const followUpSnap = await followUpRef.get();
  if (!followUpSnap.exists) {
    return { success: false, error: "Follow-up not found" };
  }

  const followUp = followUpSnap.data()!;
  const leadId = followUp.leadId;

  await followUpRef.update({
    status: "completed",
    completedAt: now,
    completedBy: userId,
  });

  await db.collection(LEADS).doc(leadId).collection("activities").add({
    activityId: crypto.randomUUID(),
    leadId,
    type: "follow_up_completed",
    description: `Follow-up completed by ${userId}`,
    createdAt: now,
    createdBy: userId,
    metadata: {},
  });

  const openFollowUps = await db
    .collection(COLLECTIONS.FOLLOW_UPS)
    .where("leadId", "==", leadId)
    .where("status", "==", "pending")
    .orderBy("scheduledAt", "asc")
    .get();

  if (openFollowUps.size > 0) {
    const nextFollowUp = openFollowUps.docs[0].data();
    await db.collection(LEADS).doc(leadId).update({
      nextFollowUpAt: nextFollowUp.scheduledAt,
      updatedAt: now,
      updatedBy: userId,
    });
  } else {
    await db.collection(LEADS).doc(leadId).update({
      nextFollowUpAt: null,
      updatedAt: now,
      updatedBy: userId,
    });
  }

  revalidatePath("/follow-ups");
  revalidatePath("/leads");
  return { success: true };
}

export async function acquireLeadClaimAction(
  leadId: string
): Promise<{ success: boolean; reason?: string; expiresAt?: Date }> {
  const actor = await getActor();
  if (!actor) return { success: false, reason: "not_authenticated" };

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const userId = actor.uid;

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(leadRef);
    if (!snap.exists) {
      return { success: false, reason: "not_found" };
    }

    const data = snap.data();
    const existingLease = data?.activeCallLease;

    if (existingLease) {
      const existingExpiresAt = existingLease.expiresAt instanceof Timestamp
        ? existingLease.expiresAt.toDate()
        : new Date(existingLease.expiresAt);

      if (existingExpiresAt > now && existingLease.claimedBy !== userId) {
        return { success: false, reason: "already_claimed" };
      }
    }

    tx.update(leadRef, {
      activeCallLease: {
        claimedBy: userId,
        claimedAt: now,
        expiresAt,
      },
    });

    return { success: true, expiresAt };
  });

  return result;
}

export async function releaseLeadClaimAction(
  leadId: string
): Promise<void> {
  const actor = await getActor();
  if (!actor) return;

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS).doc(leadId);
  const snap = await leadRef.get();

  if (!snap.exists) return;

  const data = snap.data();
  if (data?.activeCallLease?.claimedBy === actor.uid) {
    await leadRef.update({ activeCallLease: null });
  }
}
