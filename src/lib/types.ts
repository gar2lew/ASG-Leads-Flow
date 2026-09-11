export type Office = "Perth" | "Brisbane";
export type Role = "Rep" | "Manager" | "Admin";

export type LeadStatus =
  | "New"
  | "No Answer"
  | "Callback"
  | "Contacted"
  | "Interested"
  | "Qualified"
  | "Booked"
  | "Revisit"
  | "Not Interested"
  | "Disqualified"
  | "Wrong Number";

export type LeadSource =
  | "Community Survey"
  | "CSV Import"
  | "Spreadsheet Import"
  | "Marketing Campaign"
  | "Manual Entry"
  | "Referral";

export type CallResult =
  | "No Answer"
  | "Contacted"
  | "Interested"
  | "Callback"
  | "Qualified"
  | "Booked"
  | "Not Interested"
  | "Wrong Number"
  | "Disqualified";

export type EmploymentStatus =
  | "Full Time"
  | "Part Time"
  | "Self Employed"
  | "Unemployed"
  | "Retired";

export type RenterOwner = "Renter" | "Owner" | "Other";

export type SuperannuationRange =
  | "Under $50k"
  | "$50k - $100k"
  | "$75k - $150k"
  | "$100k - $200k"
  | "$200k - $500k"
  | "$500k+"
  | "Don't Know";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  office: Office | "All";
  status: "Active" | "Inactive";
  lastLogin?: string;
  phone?: string;
}

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  mobile: string;
  address: string;
  suburb: string;
  office: Office;
  assignedRep: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  renterOwner?: RenterOwner;
  employmentStatus?: EmploymentStatus;
  superannuation?: SuperannuationRange;
  costOfLivingResponse?: "Yes" | "No";
  taxResponse?: "Yes" | "No";
}

export interface Activity {
  id: string;
  leadId: string;
  type:
    | "Lead Created"
    | "Lead Imported"
    | "Lead Assigned"
    | "Call Attempted"
    | "Call Completed"
    | "Status Changed"
    | "Note Added"
    | "Follow-up Scheduled"
    | "Appointment Booked";
  description: string;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, string>;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  assignedRep: string;
  office: Office;
  scheduledAt: string;
  lastCallResult: CallResult;
  lastNote: string;
  status: "Pending" | "Completed" | "Overdue";
}

export interface SurveyRespondent {
  id: string;
  index: number;
  costOfLiving: "Yes" | "No" | null;
  tooMuchTax: "Yes" | "No" | null;
  housing: RenterOwner | null;
  employment: EmploymentStatus | null;
  superannuation: SuperannuationRange | null;
  isLead: boolean;
  name?: string;
  mobile?: string;
  address?: string;
  notes?: string;
}

export interface SurveySession {
  id: string;
  rep: string;
  office: Office;
  date: string;
  respondents: number;
  leadsCaptured: number;
  status: "In Progress" | "Completed" | "Submitted";
  completedAt?: string;
}

export interface ImportJob {
  id: string;
  filename: string;
  office: Office;
  rep: string;
  totalRecords: number;
  validRecords: number;
  duplicates: number;
  invalid: number;
  status: "Pending" | "Processing" | "Completed" | "Failed";
  createdAt: string;
}

export interface RepPerformance {
  name: string;
  calls: number;
  contacts: number;
  bookings: number;
  qualified: number;
  followUpsCompleted: number;
}
