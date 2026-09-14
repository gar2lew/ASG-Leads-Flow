// ============================================
// ASG Leads → Google Sheets Mapping
// ============================================

import type { Lead } from '@/lib/types';
import { formatZonedTime } from '@/lib/timezone';

// Sheet column structure (13 columns A-M)
export type SheetRow = {
  date: string;
  leadName: string;
  address: string;
  contactNumber: string;
  notes: string;
  updateLead: string;
  renterOwner: string;
  superannuation: string;
  repName: string;
  leadStatus: string;
  callTimestamp: string;
  callResult: string;
  leadId: string;
};

// Status mapping: canonical app value → spreadsheet display text
const STATUS_DISPLAY_MAP: Record<string, string> = {
  new: 'New',
  no_answer: 'No Answer',
  callback: 'Callback',
  contacted: 'Contacted',
  interested: 'Interested',
  qualified: 'Qualified',
  booked: 'Booked',
  revisit: 'Revisit',
  not_interested: 'Not Interested',
  disqualified: 'DQ',
  wrong_number: 'Wrong Number',
};

// Call result mapping
const CALL_RESULT_DISPLAY_MAP: Record<string, string> = {
  no_answer: 'No Answer',
  callback: 'Callback',
  contacted: 'Contacted',
  interested: 'Interested',
  not_interested: 'Not Interested',
  disqualified: 'Disqualified',
  wrong_number: 'Wrong Number',
  booked: 'Booked',
  revisit: 'Revisit',
};

export function mapStatusToDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status] ?? status;
}

export function mapCallResultToDisplay(result: string): string {
  return CALL_RESULT_DISPLAY_MAP[result] ?? result;
}

/**
 * Format a date for display in the given office timezone
 */
export function formatDateForOffice(date: string | Date | null | undefined, timezone: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return formatZonedTime(d, timezone, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Convert a Lead Firestore document to a SheetRow
 */
export function leadToSheetRow(
  lead: Lead,
  repName: string,
  lastCallResult?: string,
  renterOwner?: string,
  superannuation?: string,
  timezone: string = 'Australia/Perth'
): SheetRow {
  return {
    date: formatDateForOffice(lead.createdAt, timezone),
    leadName: lead.name ?? '',
    address: lead.address ?? '',
    contactNumber: lead.mobile ?? '',
    notes: lead.notes ?? '',
    updateLead: '',
    renterOwner: renterOwner ?? '',
    superannuation: superannuation ?? '',
    repName: repName ?? '',
    leadStatus: mapStatusToDisplay(lead.status),
    callTimestamp: lead.lastContactAt
      ? formatDateForOffice(lead.lastContactAt, timezone)
      : '',
    callResult: lastCallResult ? mapCallResultToDisplay(lastCallResult) : '',
    leadId: lead.leadId ?? '',
  };
}

/**
 * Convert a SheetRow to an array of cell values (for Sheets API)
 */
export function sheetRowToValues(row: SheetRow): string[] {
  return [
    row.date,
    row.leadName,
    row.address,
    row.contactNumber,
    row.notes,
    row.updateLead,
    row.renterOwner,
    row.superannuation,
    row.repName,
    row.leadStatus,
    row.callTimestamp,
    row.callResult,
    row.leadId,
  ];
}

/**
 * Convert an array of cell values to a SheetRow
 */
export function valuesToSheetRow(values: string[]): SheetRow | null {
  if (!values || values.length < 13) return null;
  return {
    date: values[0] ?? '',
    leadName: values[1] ?? '',
    address: values[2] ?? '',
    contactNumber: values[3] ?? '',
    notes: values[4] ?? '',
    updateLead: values[5] ?? '',
    renterOwner: values[6] ?? '',
    superannuation: values[7] ?? '',
    repName: values[8] ?? '',
    leadStatus: values[9] ?? '',
    callTimestamp: values[10] ?? '',
    callResult: values[11] ?? '',
    leadId: values[12] ?? '',
  };
}

/**
 * Extract LeadID from a sheet row (column M, index 12)
 */
export function extractLeadIdFromRow(values: string[]): string | null {
  if (!values || values.length < 13) return null;
  const leadId = values[12]?.trim();
  return leadId || null;
}
