// ============================================
// ASG Leads — Firestore Repository Types
// ============================================

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { LeadDocument, LeadActivityDocument, FollowUpDocument } from '@/lib/firebase/types';
import type { LeadStatusValue, ActivityTypeValue } from '@/lib/domain/status';

export { LeadDocument, LeadActivityDocument, FollowUpDocument };

export interface LeadEntity {
  leadId: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  address: string;
  suburb: string | null;
  officeId: string;
  assignedRepId: string | null;
  source: string;
  status: LeadStatusValue;
  notes: string | null;
  survey: LeadDocument['survey'];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  activeCallLease: LeadDocument['activeCallLease'];
  archivedAt: Date | null;
  version: number;
}

export interface ActivityEntity {
  activityId: string;
  leadId: string;
  type: ActivityTypeValue;
  description: string;
  createdAt: Date;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface FollowUpEntity {
  followUpId: string;
  leadId: string;
  officeId: string;
  assignedRepId: string;
  scheduledAt: Date;
  status: string;
  reason: string | null;
  lastCallResult: string | null;
  lastNote: string | null;
  createdAt: Date;
  createdBy: string;
  completedAt: Date | null;
  completedBy: string | null;
}

export interface PaginationCursor {
  lastDoc: QueryDocumentSnapshot | null;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
  count: number;
}

export interface LeadQueryFilters {
  officeId?: string;
  assignedRepId?: string;
  status?: LeadStatusValue;
  source?: string;
  searchTerm?: string;
  mobileNormalized?: string;
  limit?: number;
  cursor?: string;
}
