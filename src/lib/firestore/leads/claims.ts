import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";

const LEADS = COLLECTIONS.LEADS;
const CLAIM_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface ClaimResult {
  success: boolean;
  reason?: "already_claimed" | "expired" | "not_found";
  expiresAt?: Date;
}

export async function acquireLeadClaim(
  leadId: string,
  userId: string
): Promise<ClaimResult> {
  const db = getAdminFirestore();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MS);

  return db.runTransaction(async (tx) => {
    const ref = db.collection(LEADS).doc(leadId);
    const snap = await tx.get(ref);

    if (!snap.exists) {
      return { success: false, reason: "not_found" };
    }

    const data = snap.data();
    const existingLease = data?.activeCallLease;

    if (existingLease) {
      const existingExpiresAt = existingLease.expiresAt instanceof Timestamp
        ? existingLease.expiresAt.toDate()
        : new Date(existingLease.expiresAt);

      // If existing claim is still active and not by current user
      if (existingExpiresAt > now && existingLease.claimedBy !== userId) {
        return { success: false, reason: "already_claimed" };
      }
    }

    tx.update(ref, {
      activeCallLease: {
        claimedBy: userId,
        claimedAt: now,
        expiresAt,
      },
    });

    return { success: true, expiresAt };
  });
}

export async function releaseLeadClaim(leadId: string, userId: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(LEADS).doc(leadId);
  const snap = await ref.get();

  if (!snap.exists) return;

  const data = snap.data();
  if (data?.activeCallLease?.claimedBy === userId) {
    await ref.update({ activeCallLease: null });
  }
}

export async function refreshLeadClaim(leadId: string, userId: string): Promise<ClaimResult> {
  const db = getAdminFirestore();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MS);

  const ref = db.collection(LEADS).doc(leadId);
  const snap = await ref.get();

  if (!snap.exists) {
    return { success: false, reason: "not_found" };
  }

  const data = snap.data();
  const existingLease = data?.activeCallLease;

  if (!existingLease || existingLease.claimedBy !== userId) {
    return { success: false, reason: "already_claimed" };
  }

  await ref.update({
    "activeCallLease.expiresAt": expiresAt,
  });

  return { success: true, expiresAt };
}

export async function isLeadClaimActive(leadId: string, userId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const snap = await db.collection(LEADS).doc(leadId).get();

  if (!snap.exists) return false;

  const data = snap.data();
  const lease = data?.activeCallLease;
  if (!lease) return false;
  if (lease.claimedBy !== userId) return false;

  const expiresAt = lease.expiresAt instanceof Timestamp
    ? lease.expiresAt.toDate()
    : new Date(lease.expiresAt);

  return expiresAt > new Date();
}
