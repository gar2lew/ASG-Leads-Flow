// ============================================
// ASG Leads — Firestore Domain Types
// ============================================
// Source of truth: ASG_LEADS_ARCHITECTURE.md §4–§6
// These types define the production Firestore data model.

export type OfficeId = "perth" | "brisbane";

export type UserRole = "rep" | "manager" | "admin";

export type LeadStatus =
  | "new"
  | "no_answer"
  | "callback"
  | "contacted"
  | "interested"
  | "qualified"
  | "booked"
  | "revisit"
  | "not_interested"
  | "disqualified"
  | "wrong_number";

export type LeadSource =
  | "community_survey"
  | "csv_import"
  | "spreadsheet_import"
  | "marketing_campaign"
  | "manual_entry"
  | "referral";

export type FollowUpStatus = "pending" | "completed" | "cancelled";

export type SurveySessionStatus = "in_progress" | "completed" | "submitted" | "abandoned";

export type ImportStatus = "uploaded" | "validating" | "ready" | "processing" | "completed" | "failed";

export type SheetSyncStatus = "pending" | "synced" | "failed" | "not_required";

// ============================================
// User Document — users/{uid}
// ============================================
export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  officeIds: OfficeId[];
  defaultOfficeId: OfficeId | null;
  status: "active" | "inactive";
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

// ============================================
// Lead Document — leads/{leadId}
// ============================================
export interface LeadDocument {
  leadId: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  address: string;
  suburb?: string | null;
  officeId: OfficeId;
  assignedRepId?: string | null;
  source: LeadSource;
  sourceReference?: string | null;
  status: LeadStatus;
  currentNotes?: string | null;
  survey?: {
    renterOwner?: "renter" | "owner" | "other" | null;
    employmentStatus?: string | null;
    superannuation?: string | null;
    costOfLivingResponse?: boolean | null;
    taxResponse?: boolean | null;
  } | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  lastContactAt?: string | null;
  nextFollowUpAt?: string | null;
  activeCallLease?: {
    claimedBy: string;
    claimedAt: string;
    expiresAt: string;
  } | null;
  archivedAt?: string | null;
  sheetSync?: {
    status: SheetSyncStatus;
    lastSyncedAt?: string | null;
    lastErrorCode?: string | null;
    revision?: number;
  };
}

// ============================================
// Lead Activity — leads/{leadId}/activities/{activityId}
// ============================================
export interface LeadActivityDocument {
  activityId: string;
  leadId: string;
  type:
    | "lead_created"
    | "lead_imported"
    | "lead_assigned"
    | "lead_reassigned"
    | "call_attempted"
    | "call_completed"
    | "status_changed"
    | "note_added"
    | "follow_up_scheduled"
    | "follow_up_completed"
    | "appointment_booked"
    | "sheet_sync_failed"
    | "sheet_sync_recovered";
  description: string;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Follow-Up Document — followUps/{followUpId}
// ============================================
export interface FollowUpDocument {
  followUpId: string;
  leadId: string;
  officeId: OfficeId;
  assignedRepId: string;
  scheduledAt: string;
  status: FollowUpStatus;
  reason?: string | null;
  lastCallResult?: string | null;
  lastNote?: string | null;
  createdAt: string;
  createdBy: string;
  completedAt?: string | null;
  completedBy?: string | null;
}

// ============================================
// Survey Session — surveySessions/{sessionId}
// ============================================
export interface SurveySessionDocument {
  sessionId: string;
  officeId: OfficeId;
  repId: string;
  status: SurveySessionStatus;
  respondentCount: number;
  leadsCaptured: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  submittedAt?: string | null;
}

// ============================================
// Survey Response — surveySessions/{sessionId}/responses/{responseId}
// ============================================
export interface SurveyResponseDocument {
  responseId: string;
  sessionId: string;
  sequenceNumber: number;
  costOfLiving: boolean | null;
  tooMuchTax: boolean | null;
  housing: "renter" | "owner" | "other" | null;
  employment: string | null;
  superannuation: string | null;
  becameLead: boolean;
  leadId?: string | null;
  leadCapture?: {
    name?: string;
    mobile?: string;
    mobileNormalized?: string;
    address?: string;
    notes?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Import Record — imports/{importId}
// ============================================
export interface ImportDocument {
  importId: string;
  filename: string;
  fileType: "csv" | "xlsx";
  officeId: OfficeId;
  requestedBy: string;
  assignmentMode: "single_rep" | "round_robin";
  assignmentRepIds: string[];
  source: LeadSource;
  status: ImportStatus;
  counts: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
    imported: number;
  };
  mapping: Record<string, string>;
  createdAt: string;
  completedAt?: string | null;
  errorSummary?: string | null;
}

// ============================================
// Office — offices/{officeId}
// ============================================
export interface OfficeDocument {
  officeId: OfficeId;
  displayName: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Team — teams/{teamId}
// ============================================
export interface TeamDocument {
  teamId: string;
  name: string;
  officeId: OfficeId;
  teamLeadId: string | null;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Sheet Sync Job — sheetSyncJobs/{jobId}
// ============================================
export interface SheetSyncJobDocument {
  jobId: string;
  leadId: string;
  officeId: OfficeId;
  operation: "upsert";
  revision: number;
  status: "pending" | "processing" | "completed" | "failed";
  attemptCount: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

// ============================================
// Settings — settings/global
// ============================================
export interface SettingsDocument {
  leadStatuses: LeadStatus[];
  leadSources: LeadSource[];
  createdAt: string;
  updatedAt: string;
}
