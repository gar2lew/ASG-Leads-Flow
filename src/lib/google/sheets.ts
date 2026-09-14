// ============================================
// ASG Leads — Google Sheets Transport Layer
// ============================================

import { google, type sheets_v4 } from 'googleapis';
import { getGoogleAuth } from '@/lib/google/auth';
import { getOfficeSheetConfig } from '@/lib/google/config';
import type { SheetRow } from '@/lib/google/mappings';
import { sheetRowToValues, extractLeadIdFromRow } from '@/lib/google/mappings';

export class SheetsService {
  private sheetsApi: sheets_v4.Sheets | null = null;

  private async getSheetsApi(): Promise<sheets_v4.Sheets> {
    if (this.sheetsApi) return this.sheetsApi;
    const auth = await getGoogleAuth();
    this.sheetsApi = google.sheets({ version: 'v4', auth });
    return this.sheetsApi;
  }

  /**
   * Read all rows from the LeadID column (column M)
   */
  async readLeadIdColumn(officeId: string): Promise<{ leadId: string; rowNumber: number }[]> {
    const config = getOfficeSheetConfig(officeId);
    const api = await this.getSheetsApi();

    const range = `${config.worksheetName}!M:M`;
    const result = await api.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range,
    });

    const values = result.data.values || [];
    const rows: { leadId: string; rowNumber: number }[] = [];

    for (let i = 1; i < values.length; i++) {
      const leadId = values[i]?.[0]?.trim();
      if (leadId) {
        rows.push({ leadId, rowNumber: i + 1 }); // 1-indexed
      }
    }

    return rows;
  }

  /**
   * Read a specific row by row number
   */
  async readRow(officeId: string, rowNumber: number): Promise<string[]> {
    const config = getOfficeSheetConfig(officeId);
    const api = await this.getSheetsApi();

    const range = `${config.worksheetName}!A${rowNumber}:M${rowNumber}`;
    const result = await api.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range,
    });

    return result.data.values?.[0] || [];
  }

  /**
   * Find row number by LeadID
   */
  async findRowByLeadId(officeId: string, leadId: string): Promise<number | null> {
    const rows = await this.readLeadIdColumn(officeId);
    const match = rows.find(r => r.leadId === leadId);
    return match?.rowNumber ?? null;
  }

  /**
   * Check for duplicate LeadIDs
   */
  async findDuplicateLeadIds(officeId: string): Promise<{ leadId: string; rowNumbers: number[] }[]> {
    const rows = await this.readLeadIdColumn(officeId);
    const leadIdMap = new Map<string, number[]>();

    for (const { leadId, rowNumber } of rows) {
      const existing = leadIdMap.get(leadId) || [];
      existing.push(rowNumber);
      leadIdMap.set(leadId, existing);
    }

    const duplicates: { leadId: string; rowNumbers: number[] }[] = [];
    for (const [leadId, rowNumbers] of leadIdMap) {
      if (rowNumbers.length > 1) {
        duplicates.push({ leadId, rowNumbers });
      }
    }

    return duplicates;
  }

  /**
   * Append a new row to the sheet
   */
  async appendRow(officeId: string, row: SheetRow): Promise<{ rowNumber: number }> {
    const config = getOfficeSheetConfig(officeId);
    const api = await this.getSheetsApi();
    const values = sheetRowToValues(row);

    const result = await api.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.worksheetName}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    const updatedRange = result.data.updates?.updatedRange || '';
    const rowNumber = this.extractRowNumberFromRange(updatedRange);
    return { rowNumber: rowNumber ?? 0 };
  }

  /**
   * Update an existing row by row number
   */
  async updateRow(officeId: string, rowNumber: number, row: SheetRow): Promise<void> {
    const config = getOfficeSheetConfig(officeId);
    const api = await this.getSheetsApi();
    const values = sheetRowToValues(row);

    await api.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.worksheetName}!A${rowNumber}:M${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
  }

  /**
   * Idempotent upsert: update if LeadID found, else append
   */
  async upsertRow(officeId: string, row: SheetRow): Promise<{ rowNumber: number; isNew: boolean }> {
    if (!row.leadId) {
      // No LeadID - append
      const result = await this.appendRow(officeId, row);
      return { rowNumber: result.rowNumber, isNew: true };
    }

    const existingRow = await this.findRowByLeadId(officeId, row.leadId);

    if (existingRow) {
      // Update existing
      await this.updateRow(officeId, existingRow, row);
      return { rowNumber: existingRow, isNew: false };
    } else {
      // Append new
      const result = await this.appendRow(officeId, row);
      return { rowNumber: result.rowNumber, isNew: true };
    }
  }

  /**
   * Batch read rows for reconciliation
   */
  async readAllRows(officeId: string): Promise<{ rowNumber: number; values: string[] }[]> {
    const config = getOfficeSheetConfig(officeId);
    const api = await this.getSheetsApi();

    const range = `${config.worksheetName}!A:M`;
    const result = await api.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range,
    });

    const values = result.data.values || [];
    const rows: { rowNumber: number; values: string[] }[] = [];

    for (let i = 1; i < values.length; i++) {
      rows.push({ rowNumber: i + 1, values: values[i] || [] });
    }

    return rows;
  }

  private extractRowNumberFromRange(range: string): number | null {
    const match = range.match(/(\d+):/);
    return match ? parseInt(match[1], 10) : null;
  }
}

// Singleton
let sheetsService: SheetsService | null = null;

export function getSheetsService(): SheetsService {
  if (!sheetsService) {
    sheetsService = new SheetsService();
  }
  return sheetsService;
}
