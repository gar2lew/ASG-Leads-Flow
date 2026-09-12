// ============================================
// ASG Leads — Lead Status Model
// ============================================

export const LEAD_STATUSES = [
  'new',
  'no_answer',
  'callback',
  'contacted',
  'interested',
  'qualified',
  'booked',
  'revisit',
  'not_interested',
  'disqualified',
  'wrong_number',
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  new: 'New',
  no_answer: 'No Answer',
  callback: 'Callback',
  contacted: 'Contacted',
  interested: 'Interested',
  qualified: 'Qualified',
  booked: 'Booked',
  revisit: 'Revisit',
  not_interested: 'Not Interested',
  disqualified: 'Disqualified',
  wrong_number: 'Wrong Number',
};

export const CALLABLE_STATUSES: LeadStatusValue[] = [
  'new',
  'no_answer',
  'callback',
  'contacted',
  'revisit',
];

export function isLeadStatus(value: string): value is LeadStatusValue {
  return LEAD_STATUSES.includes(value as LeadStatusValue);
}

export function getLeadStatusLabel(status: LeadStatusValue): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

export function isCallableStatus(status: LeadStatusValue): boolean {
  return CALLABLE_STATUSES.includes(status);
}

// ============================================
// ASG Leads — Call Results
// ============================================

export const CALL_RESULTS = [
  'no_answer',
  'contacted',
  'interested',
  'callback',
  'qualified',
  'booked',
  'not_interested',
  'wrong_number',
  'disqualified',
] as const;

export type CallResultValue = (typeof CALL_RESULTS)[number];

export const CALL_RESULT_LABELS: Record<CallResultValue, string> = {
  no_answer: 'No Answer',
  contacted: 'Contacted',
  interested: 'Interested',
  callback: 'Callback',
  qualified: 'Qualified',
  booked: 'Booked',
  not_interested: 'Not Interested',
  wrong_number: 'Wrong Number',
  disqualified: 'Disqualified',
};

export function isCallResult(value: string): value is CallResultValue {
  return CALL_RESULTS.includes(value as CallResultValue);
}

export function getCallResultLabel(result: CallResultValue): string {
  return CALL_RESULT_LABELS[result] ?? result;
}

// ============================================
// ASG Leads — Lead Sources
// ============================================

export const LEAD_SOURCES = [
  'community_survey',
  'csv_import',
  'spreadsheet_import',
  'marketing_campaign',
  'manual_entry',
  'referral',
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSourceValue, string> = {
  community_survey: 'Community Survey',
  csv_import: 'CSV Import',
  spreadsheet_import: 'Spreadsheet Import',
  marketing_campaign: 'Marketing Campaign',
  manual_entry: 'Manual Entry',
  referral: 'Referral',
};

export function isLeadSource(value: string): value is LeadSourceValue {
  return LEAD_SOURCES.includes(value as LeadSourceValue);
}

export function getLeadSourceLabel(source: LeadSourceValue): string {
  return LEAD_SOURCE_LABELS[source] ?? source;
}

// ============================================
// ASG Leads — Follow-Up Statuses
// ============================================

export const FOLLOWUP_STATUSES = ['pending', 'completed', 'cancelled'] as const;
export type FollowUpStatusValue = (typeof FOLLOWUP_STATUSES)[number];

export function isFollowUpStatus(value: string): value is FollowUpStatusValue {
  return FOLLOWUP_STATUSES.includes(value as FollowUpStatusValue);
}

// ============================================
// ASG Leads — Activity Types
// ============================================

export const ACTIVITY_TYPES = [
  'lead_created',
  'lead_imported',
  'lead_assigned',
  'lead_reassigned',
  'call_attempted',
  'call_completed',
  'status_changed',
  'note_added',
  'follow_up_scheduled',
  'follow_up_completed',
  'appointment_booked',
  'lead_archived',
  'sheet_sync_failed',
  'sheet_sync_recovered',
] as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: string): value is ActivityTypeValue {
  return ACTIVITY_TYPES.includes(value as ActivityTypeValue);
}
