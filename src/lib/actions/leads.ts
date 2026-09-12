"use server";

import { revalidatePath } from "next/cache";
import { createLead, updateLead, changeLeadStatus, assignLead, archiveLead, checkDuplicateMobile } from "@/lib/firestore/leads/repository";
import { createActivity } from "@/lib/firestore/leads/activities";
import { createFollowUp, getOpenFollowUpsForLead } from "@/lib/firestore/leads/follow-ups";
import { normalizeAustralianMobile } from "@/lib/domain/mobile";
import { validateLeadInput, validateLeadUpdateInput } from "@/lib/domain/validation";
import { isLeadStatus, isLeadSource } from "@/lib/domain/status";
import type { LeadSourceValue, LeadStatusValue } from "@/lib/domain/status";

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
  },
  createdBy: string
): Promise<LeadActionResult> {
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

  // Check for duplicates
  const isDuplicate = await checkDuplicateMobile(mobileNormalized);
  if (isDuplicate) {
    return {
      success: false,
      error: "A lead with this mobile number already exists",
      duplicateWarning: true,
    };
  }

  const lead = await createLead({
    name: data.name,
    mobile: data.mobile,
    address: data.address,
    suburb: data.suburb,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId ?? null,
    source: input.source,
    notes: data.notes,
    survey: data.survey,
    createdBy,
  });

  await createActivity({
    leadId: lead.leadId,
    type: "lead_created",
    description: `Lead created by ${createdBy}`,
    createdBy,
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, leadId: lead.leadId };
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
  }>,
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  const updateInput: any = { ...data };
  if (data.source) {
    updateInput.source = normalizeSource(data.source);
  }
  const validation = validateLeadUpdateInput(updateInput);
  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.errors?.join(", ") };
  }

  try {
    const lead = await updateLead(leadId, updateInput, updatedBy, expectedVersion);

    await createActivity({
      leadId,
      type: "lead_updated",
      description: `Lead updated by ${updatedBy}`,
      createdBy: updatedBy,
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId: lead.leadId };
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
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  if (!isLeadStatus(newStatus)) {
    return { success: false, error: "Invalid status value" };
  }

  try {
    const lead = await changeLeadStatus(leadId, newStatus, updatedBy, expectedVersion);

    await createActivity({
      leadId,
      type: "status_changed",
      description: `Status changed to ${newStatus}`,
      createdBy: updatedBy,
      metadata: { newStatus },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId: lead.leadId };
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
  updatedBy: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  try {
    const lead = await assignLead(leadId, assignedRepId, updatedBy, expectedVersion);

    await createActivity({
      leadId,
      type: "lead_assigned",
      description: `Lead assigned to ${assignedRepId}`,
      createdBy: updatedBy,
      metadata: { assignedRepId },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, leadId: lead.leadId };
  } catch (err: any) {
    if (err.message === "VERSION_CONFLICT") {
      return { success: false, error: "This lead was updated by another user. Please refresh and try again." };
    }
    return { success: false, error: err.message };
  }
}

export async function archiveLeadAction(
  leadId: string,
  updatedBy: string
): Promise<LeadActionResult> {
  await archiveLead(leadId, updatedBy);

  await createActivity({
    leadId,
    type: "lead_archived",
    description: `Lead archived by ${updatedBy}`,
    createdBy: updatedBy,
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
  userId: string,
  expectedVersion?: number
): Promise<LeadActionResult> {
  try {
    const updates: any = {
      status: callResult.toLowerCase().replace(/ /g, "_"),
      lastContactAt: new Date(),
    };

    if (note) {
      updates.notes = note;
    }

    if (callResult === "callback" && callbackDate && callbackTime) {
      const scheduledAt = new Date(`${callbackDate}T${callbackTime}`);
      updates.nextFollowUpAt = scheduledAt;

      // Create follow-up
      const lead = await updateLead(leadId, updates, userId, expectedVersion);

      await createFollowUp({
        leadId,
        officeId: lead.officeId,
        assignedRepId: lead.assignedRepId ?? userId,
        scheduledAt,
        lastCallResult: callResult,
        lastNote: note,
        createdBy: userId,
      });

      await createActivity({
        leadId,
        type: "follow_up_scheduled",
        description: `Callback scheduled for ${scheduledAt.toLocaleString("en-AU")}`,
        createdBy: userId,
      });
    } else {
      await updateLead(leadId, updates, userId, expectedVersion);
    }

    await createActivity({
      leadId,
      type: "call_completed",
      description: `Call result: ${callResult}${note ? `. Note: ${note}` : ""}`,
      createdBy: userId,
      metadata: { callResult, note },
    });

    if (note) {
      await createActivity({
        leadId,
        type: "note_added",
        description: note,
        createdBy: userId,
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
  followUpId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { completeFollowUp, getFollowUp } = await import("@/lib/firestore/leads/follow-ups");

  const followUp = await getFollowUp(followUpId);
  if (!followUp) {
    return { success: false, error: "Follow-up not found" };
  }

  await completeFollowUp(followUpId, userId);

  await createActivity({
    leadId: followUp.leadId,
    type: "follow_up_completed",
    description: `Follow-up completed by ${userId}`,
    createdBy: userId,
  });

  // Update lead's nextFollowUpAt if there are other open follow-ups
  const openFollowUps = await getOpenFollowUpsForLead(followUp.leadId);
  if (openFollowUps.length > 0) {
    await updateLead(followUp.leadId, { nextFollowUpAt: openFollowUps[0].scheduledAt }, userId);
  } else {
    await updateLead(followUp.leadId, { nextFollowUpAt: null }, userId);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/leads");
  return { success: true };
}
