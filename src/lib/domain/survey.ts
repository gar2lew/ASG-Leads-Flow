// ============================================
// ASG Leads — Survey Domain Definitions
// ============================================
// Centralized canonical machine-safe values for survey questions/answers

/** Housing status canonical values */
export type HousingStatus = "renter" | "owner" | "other";

/** Employment status canonical values */
export type EmploymentStatus =
  | "full_time"
  | "part_time"
  | "casual"
  | "self_employed"
  | "retired"
  | "other";

/** Superannuation range canonical values */
export type SuperannuationRange =
  | "under_50k"
  | "50k_100k"
  | "75k_150k"
  | "100k_200k"
  | "200k_500k"
  | "500k_plus"
  | "dont_know";

/** Survey question answer values */
export type CostOfLivingAnswer = "yes" | "no" | null;
export type TaxAnswer = "yes" | "no" | null;

/** Survey session status */
export type SurveySessionStatus = "draft" | "in_progress" | "completed" | "cancelled";

/** Lead capture draft data (temporary, before conversion) */
export interface LeadCaptureDraft {
  name?: string;
  mobile?: string;
  address?: string;
  notes?: string;
}

/** Survey response document (subcollection of surveySessions) */
export interface SurveyResponse {
  responseId: string;
  sessionId: string;
  sequenceNumber: number;
  costOfLivingIncreased: CostOfLivingAnswer;
  payingTooMuchTax: TaxAnswer;
  housingStatus: HousingStatus | null;
  employmentStatus: EmploymentStatus | null;
  superannuation: SuperannuationRange | null;
  becameLead: boolean;
  leadId: string | null;
  leadCaptureDraft: LeadCaptureDraft | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Survey session document (root collection) */
export interface SurveySession {
  sessionId: string;
  officeId: string;
  repUserId: string;
  status: SurveySessionStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  respondentCount: number;
  leadCount: number;
  createdBy: string;
  version: number;
}

/** Survey analytics aggregation result */
export interface SurveyAnalytics {
  totalRespondents: number;
  totalLeads: number;
  costOfLivingYesPercent: number;
  taxYesPercent: number;
  housingDistribution: Record<HousingStatus, number>;
  employmentDistribution: Record<EmploymentStatus, number>;
  superannuationDistribution: Record<SuperannuationRange, number>;
  leadConversionRate: number;
}

/** UI-facing display labels for canonical values */
export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  renter: "Renter",
  owner: "Owner",
  other: "Other",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  casual: "Casual",
  self_employed: "Self Employed",
  retired: "Retired",
  other: "Other",
};

export const SUPERANNUATION_RANGE_LABELS: Record<SuperannuationRange, string> = {
  under_50k: "Under $50k",
  "50k_100k": "$50k - $100k",
  "75k_150k": "$75k - $150k",
  "100k_200k": "$100k - $200k",
  "200k_500k": "$200k - $500k",
  "500k_plus": "$500k+",
  dont_know: "Don't Know",
};

export const COST_OF_LIVING_LABELS: Record<NonNullable<CostOfLivingAnswer>, string> = {
  yes: "Yes",
  no: "No",
};

export const TAX_LABELS: Record<NonNullable<TaxAnswer>, string> = {
  yes: "Yes",
  no: "No",
};

/** Ordered arrays for UI rendering */
export const HOUSING_STATUS_OPTIONS: HousingStatus[] = ["renter", "owner", "other"];
export const EMPLOYMENT_STATUS_OPTIONS: EmploymentStatus[] = [
  "full_time",
  "part_time",
  "casual",
  "self_employed",
  "retired",
  "other",
];
export const SUPERANNUATION_RANGE_OPTIONS: SuperannuationRange[] = [
  "under_50k",
  "50k_100k",
  "75k_150k",
  "100k_200k",
  "200k_500k",
  "500k_plus",
  "dont_know",
];
export const COST_OF_LIVING_OPTIONS: CostOfLivingAnswer[] = ["yes", "no"];
export const TAX_OPTIONS: TaxAnswer[] = ["yes", "no"];

/** Convert canonical value to display label */
export function getHousingStatusLabel(value: HousingStatus | null): string {
  return value ? HOUSING_STATUS_LABELS[value] : "";
}

export function getEmploymentStatusLabel(value: EmploymentStatus | null): string {
  return value ? EMPLOYMENT_STATUS_LABELS[value] : "";
}

export function getSuperannuationRangeLabel(value: SuperannuationRange | null): string {
  return value ? SUPERANNUATION_RANGE_LABELS[value] : "";
}

export function getCostOfLivingLabel(value: CostOfLivingAnswer): string {
  return value ? COST_OF_LIVING_LABELS[value] : "";
}

export function getTaxLabel(value: TaxAnswer): string {
  return value ? TAX_LABELS[value] : "";
}

/** Convert display label to canonical value (for backward compatibility) */
export function housingStatusFromLabel(label: string): HousingStatus | null {
  const entry = Object.entries(HOUSING_STATUS_LABELS).find(
    ([, v]) => v.toLowerCase() === label.toLowerCase()
  );
  return (entry?.[0] as HousingStatus) ?? null;
}

export function employmentStatusFromLabel(label: string): EmploymentStatus | null {
  const entry = Object.entries(EMPLOYMENT_STATUS_LABELS).find(
    ([, v]) => v.toLowerCase() === label.toLowerCase()
  );
  return (entry?.[0] as EmploymentStatus) ?? null;
}

export function superannuationRangeFromLabel(label: string): SuperannuationRange | null {
  const entry = Object.entries(SUPERANNUATION_RANGE_LABELS).find(
    ([, v]) => v.toLowerCase() === label.toLowerCase()
  );
  return (entry?.[0] as SuperannuationRange) ?? null;
}