// ============================================
// ASG Leads — Firestore Collection References
// ============================================

export const COLLECTIONS = {
  USERS: "users",
  LEADS: "leads",
  ACTIVITIES: "activities",
  FOLLOW_UPS: "followUps",
  SURVEY_SESSIONS: "surveySessions",
  SURVEY_RESPONSES: "surveyResponses",
  IMPORTS: "imports",
  OFFICES: "offices",
  TEAMS: "teams",
  SHEET_SYNC_JOBS: "sheetSyncJobs",
  SETTINGS: "settings",
  AUDIT_EVENTS: "auditEvents",
  LEAD_MOBILE_KEYS: "leadMobileKeys",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
