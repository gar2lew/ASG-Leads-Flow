// ============================================
// ASG Leads — Google Sheets Mapping Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  mapStatusToDisplay,
  mapCallResultToDisplay,
  leadToSheetRow,
  sheetRowToValues,
  valuesToSheetRow,
  extractLeadIdFromRow,
  formatDateForOffice,
} from '@/lib/google/mappings';
import type { Lead } from '@/lib/types';

describe('mapStatusToDisplay', () => {
  it('maps known statuses correctly', () => {
    expect(mapStatusToDisplay('new')).toBe('New');
    expect(mapStatusToDisplay('no_answer')).toBe('No Answer');
    expect(mapStatusToDisplay('callback')).toBe('Callback');
    expect(mapStatusToDisplay('contacted')).toBe('Contacted');
    expect(mapStatusToDisplay('interested')).toBe('Interested');
    expect(mapStatusToDisplay('qualified')).toBe('Qualified');
    expect(mapStatusToDisplay('booked')).toBe('Booked');
    expect(mapStatusToDisplay('revisit')).toBe('Revisit');
    expect(mapStatusToDisplay('not_interested')).toBe('Not Interested');
    expect(mapStatusToDisplay('disqualified')).toBe('DQ');
    expect(mapStatusToDisplay('wrong_number')).toBe('Wrong Number');
  });

  it('returns original value for unknown status', () => {
    expect(mapStatusToDisplay('unknown_status')).toBe('unknown_status');
  });
});

describe('mapCallResultToDisplay', () => {
  it('maps known call results correctly', () => {
    expect(mapCallResultToDisplay('no_answer')).toBe('No Answer');
    expect(mapCallResultToDisplay('callback')).toBe('Callback');
    expect(mapCallResultToDisplay('contacted')).toBe('Contacted');
    expect(mapCallResultToDisplay('interested')).toBe('Interested');
    expect(mapCallResultToDisplay('not_interested')).toBe('Not Interested');
    expect(mapCallResultToDisplay('disqualified')).toBe('Disqualified');
    expect(mapCallResultToDisplay('wrong_number')).toBe('Wrong Number');
    expect(mapCallResultToDisplay('booked')).toBe('Booked');
    expect(mapCallResultToDisplay('revisit')).toBe('Revisit');
  });

  it('returns original value for unknown result', () => {
    expect(mapCallResultToDisplay('custom_result')).toBe('custom_result');
  });
});

describe('formatDateForOffice', () => {
  it('formats date for Perth timezone', () => {
    const date = new Date('2026-09-15T10:30:00Z');
    const result = formatDateForOffice(date, 'Australia/Perth');
    expect(result).toContain('15');
    expect(result).toContain('09');
    expect(result).toContain('2026');
  });

  it('formats date for Brisbane timezone', () => {
    const date = new Date('2026-09-15T10:30:00Z');
    const result = formatDateForOffice(date, 'Australia/Brisbane');
    expect(result).toContain('15');
    expect(result).toContain('09');
    expect(result).toContain('2026');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatDateForOffice(null, 'Australia/Perth')).toBe('');
    expect(formatDateForOffice(undefined, 'Australia/Perth')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateForOffice('invalid', 'Australia/Perth')).toBe('');
  });

  it('handles ISO string input', () => {
    const result = formatDateForOffice('2026-09-15T10:30:00Z', 'Australia/Perth');
    expect(result).toContain('15');
    expect(result).toContain('09');
    expect(result).toContain('2026');
  });
});

describe('leadToSheetRow', () => {
  const mockLead: Lead = {
    id: 'lead-123',
    leadId: 'lead-123',
    name: 'John Doe',
    mobile: '0412345678',
    address: '123 Main St',
    suburb: 'Perth',
    office: 'Perth',
    assignedRep: 'rep-1',
    source: 'CSV Import',
    status: 'New',
    notes: 'Test notes',
    createdAt: '2026-09-15T10:30:00Z',
    updatedAt: '2026-09-15T10:30:00Z',
    lastContactAt: '2026-09-15T11:00:00Z',
  };

  it('maps lead to sheet row correctly', () => {
    const row = leadToSheetRow(mockLead, 'Rep Name', 'contacted', 'renter', '50k_100k', 'Australia/Perth');
    expect(row.leadName).toBe('John Doe');
    expect(row.address).toBe('123 Main St');
    expect(row.contactNumber).toBe('0412345678');
    expect(row.notes).toBe('Test notes');
    expect(row.repName).toBe('Rep Name');
    expect(row.leadStatus).toBe('New');
    expect(row.callResult).toBe('Contacted');
    expect(row.renterOwner).toBe('renter');
    expect(row.superannuation).toBe('50k_100k');
    expect(row.leadId).toBe('lead-123');
  });

  it('handles empty optional values', () => {
    const row = leadToSheetRow(mockLead, '', undefined, undefined, undefined, 'Australia/Perth');
    expect(row.repName).toBe('');
    expect(row.callResult).toBe('');
    expect(row.renterOwner).toBe('');
    expect(row.superannuation).toBe('');
  });

  it('formats dates in office timezone', () => {
    const row = leadToSheetRow(mockLead, 'Rep', undefined, undefined, undefined, 'Australia/Perth');
    expect(row.date).toContain('15');
    expect(row.callTimestamp).toContain('15');
  });
});

describe('sheetRowToValues', () => {
  it('converts row to array in correct order', () => {
    const row = {
      date: '15/09/2026',
      leadName: 'John',
      address: '123 Main St',
      contactNumber: '0412345678',
      notes: 'Notes',
      updateLead: '',
      renterOwner: 'renter',
      superannuation: '50k_100k',
      repName: 'Rep',
      leadStatus: 'New',
      callTimestamp: '15/09/2026',
      callResult: 'Contacted',
      leadId: 'lead-123',
    };
    const values = sheetRowToValues(row);
    expect(values).toHaveLength(13);
    expect(values[0]).toBe('15/09/2026');
    expect(values[1]).toBe('John');
    expect(values[12]).toBe('lead-123');
  });
});

describe('valuesToSheetRow', () => {
  it('converts array to row correctly', () => {
    const values = [
      '15/09/2026', 'John', '123 Main St', '0412345678', 'Notes',
      '', 'renter', '50k_100k', 'Rep', 'New', '15/09/2026', 'Contacted', 'lead-123'
    ];
    const row = valuesToSheetRow(values);
    expect(row).not.toBeNull();
    expect(row?.leadId).toBe('lead-123');
    expect(row?.leadName).toBe('John');
  });

  it('returns null for insufficient values', () => {
    expect(valuesToSheetRow([])).toBeNull();
    expect(valuesToSheetRow(['a', 'b', 'c'])).toBeNull();
  });
});

describe('extractLeadIdFromRow', () => {
  it('extracts LeadID from column M', () => {
    const values = ['', '', '', '', '', '', '', '', '', '', '', '', 'lead-123'];
    expect(extractLeadIdFromRow(values)).toBe('lead-123');
  });

  it('returns null for empty LeadID', () => {
    const values = ['', '', '', '', '', '', '', '', '', '', '', '', ''];
    expect(extractLeadIdFromRow(values)).toBeNull();
  });

  it('returns null for insufficient columns', () => {
    expect(extractLeadIdFromRow(['a', 'b'])).toBeNull();
  });
});
