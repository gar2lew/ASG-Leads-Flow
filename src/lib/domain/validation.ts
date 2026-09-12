// ============================================
// ASG Leads — Validation Schemas
// ============================================

import type { LeadStatusValue, LeadSourceValue } from './status';
import { isLeadStatus, isLeadSource } from './status';
import { normalizeAustralianMobile } from './mobile';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

export interface LeadInput {
  name: string;
  mobile: string;
  address?: string;
  suburb?: string;
  officeId?: string;
  assignedRepId?: string;
  source?: LeadSourceValue;
  notes?: string;
  renterOwner?: string;
  employmentStatus?: string;
  superannuation?: string;
  costOfLivingResponse?: boolean;
  taxResponse?: boolean;
}

export interface LeadUpdateInput {
  name?: string;
  mobile?: string;
  address?: string;
  suburb?: string;
  officeId?: string;
  assignedRepId?: string;
  source?: LeadSourceValue;
  notes?: string;
  renterOwner?: string;
  employmentStatus?: string;
  superannuation?: string;
  costOfLivingResponse?: boolean;
  taxResponse?: boolean;
}

export function validateLeadInput(input: LeadInput): ValidationResult<LeadInput> {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!input.mobile) {
    errors.push('Mobile is required');
  } else {
    const normalized = normalizeAustralianMobile(input.mobile);
    if (!normalized) {
      errors.push('Invalid Australian mobile number');
    }
  }

  if (!input.address || input.address.trim().length < 5) {
    errors.push('Address is required');
  }

  if (input.source && !isLeadSource(input.source)) {
    errors.push('Invalid lead source');
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateLeadUpdateInput(input: LeadUpdateInput): ValidationResult<LeadUpdateInput> {
  const errors: string[] = [];

  if (input.name !== undefined && input.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (input.mobile !== undefined && input.mobile) {
    const normalized = normalizeAustralianMobile(input.mobile);
    if (!normalized) {
      errors.push('Invalid Australian mobile number');
    }
  }

  if (input.source && !isLeadSource(input.source)) {
    errors.push('Invalid lead source');
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateStatusChange(from: LeadStatusValue, to: LeadStatusValue): ValidationResult<{ from: LeadStatusValue; to: LeadStatusValue }> {
  if (!isLeadStatus(from)) {
    return { valid: false, errors: [`Invalid current status: ${from}`] };
  }
  if (!isLeadStatus(to)) {
    return { valid: false, errors: [`Invalid target status: ${to}`] };
  }
  return { valid: true, data: { from, to } };
}

export function validateFollowUpDate(dateStr: string): ValidationResult<string> {
  if (!dateStr) {
    return { valid: false, errors: ['Follow-up date is required'] };
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, errors: ['Invalid date format'] };
  }
  return { valid: true, data: dateStr };
}
