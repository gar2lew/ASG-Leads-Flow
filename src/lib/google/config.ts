// ============================================
// ASG Leads — Google Sheets Sync Configuration
// ============================================

export interface OfficeSheetConfig {
  officeId: string;
  spreadsheetId: string;
  worksheetName: string;
  timezone: string;
}

export const SHEET_COLUMNS = [
  'Date',
  'Lead Name',
  'Address',
  'Contact Number',
  'Notes',
  'Update Lead',
  'Renter/Owner',
  'Superannuation',
  'Rep Name',
  'Lead Status',
  'Call Timestamp',
  'Call Result',
  'LeadID',
] as const;

export const SHEET_COLUMN_COUNT = SHEET_COLUMNS.length;

// LeadID column (column M, 1-indexed = 13)
export const LEAD_ID_COLUMN = 'M';
export const LEAD_ID_COLUMN_INDEX = 12; // 0-indexed

// Data starts at row 1 (with header)
export const DATA_START_ROW = 2;

function getOfficeConfig(officeId: string): { spreadsheetId: string; timezone: string } {
  switch (officeId) {
    case 'perth':
      return {
        spreadsheetId: process.env.GOOGLE_SHEETS_PERTH_SPREADSHEET_ID || '',
        timezone: 'Australia/Perth',
      };
    case 'brisbane':
      return {
        spreadsheetId: process.env.GOOGLE_SHEETS_BRISBANE_SPREADSHEET_ID || '',
        timezone: 'Australia/Brisbane',
      };
    default:
      throw new Error(`Unknown office: ${officeId}`);
  }
}

export function getOfficeSheetConfig(officeId: string): OfficeSheetConfig {
  const { spreadsheetId, timezone } = getOfficeConfig(officeId);

  if (!spreadsheetId) {
    throw new Error(`Google Sheets spreadsheet ID not configured for office: ${officeId}`);
  }

  return {
    officeId,
    spreadsheetId,
    worksheetName: process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'LEADS',
    timezone,
  };
}

export function getSpreadsheetIdForOffice(officeId: string): string {
  return getOfficeConfig(officeId).spreadsheetId;
}

export function getTimezoneForOffice(officeId: string): string {
  return getOfficeConfig(officeId).timezone;
}

export function getWorksheetName(): string {
  return process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'LEADS';
}
