// ============================================
// ASG Leads — Firestore Converters
// ============================================

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import type { LeadDocument, LeadActivityDocument, FollowUpDocument } from '@/lib/firestore/leads/types';
import type { LeadEntity, ActivityEntity, FollowUpEntity } from './types';

function toDate(value: Timestamp | Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') return new Date(value);
  return null;
}

export function convertLeadFromFirestore(doc: QueryDocumentSnapshot): LeadEntity {
  const data = doc.data() as LeadDocument;
  return {
    leadId: data.leadId,
    name: data.name,
    mobile: data.mobile,
    mobileNormalized: data.mobileNormalized,
    address: data.address,
    suburb: data.suburb ?? null,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId ?? null,
    source: data.source,
    status: data.status,
    notes: data.currentNotes ?? null,
    survey: data.survey ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy,
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    updatedBy: data.updatedBy,
    lastContactAt: toDate(data.lastContactAt),
    nextFollowUpAt: toDate(data.nextFollowUpAt),
    activeCallLease: data.activeCallLease ?? null,
    archivedAt: toDate(data.archivedAt),
    version: (data as any).version ?? 0,
  };
}

export function convertActivityFromFirestore(doc: QueryDocumentSnapshot): ActivityEntity {
  const data = doc.data() as LeadActivityDocument;
  return {
    activityId: data.activityId,
    leadId: data.leadId,
    type: data.type,
    description: data.description,
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy,
    metadata: data.metadata,
  };
}

export function convertFollowUpFromFirestore(doc: QueryDocumentSnapshot): FollowUpEntity {
  const data = doc.data() as FollowUpDocument;
  return {
    followUpId: data.followUpId,
    leadId: data.leadId,
    officeId: data.officeId,
    assignedRepId: data.assignedRepId,
    scheduledAt: toDate(data.scheduledAt) ?? new Date(),
    status: data.status,
    reason: data.reason ?? null,
    lastCallResult: data.lastCallResult ?? null,
    lastNote: data.lastNote ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy,
    completedAt: toDate(data.completedAt),
    completedBy: data.completedBy ?? null,
  };
}
