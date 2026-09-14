// ============================================
// ASG Leads — Sheet Sync Processor (Server-only)
// ============================================

import { getAdminFirestore } from '@/lib/firebase/admin';
import { SheetsService } from '@/lib/google/sheets';
import { SheetSyncJobRepository } from '@/lib/google/sync-jobs';
import { leadToSheetRow } from '@/lib/google/mappings';
import { getOfficeSheetConfig } from '@/lib/google/config';

/**
 * Process a single sheet sync job
 */
export async function processSheetSyncJob(jobId: string): Promise<void> {
  const syncRepo = new SheetSyncJobRepository();
  const db = getAdminFirestore();

  const jobDoc = await db.collection('sheetSyncJobs').doc(jobId).get();

  if (!jobDoc.exists) {
    throw new Error(`Sync job not found: ${jobId}`);
  }

  await syncRepo.markProcessing(jobId);

  try {
    const job = jobDoc.data() as any;

    // Get lead document
    const leadDoc = await db.collection('leads').doc(job.leadId).get();

    if (!leadDoc.exists) {
      await syncRepo.markFailed(jobId, 'LEAD_NOT_FOUND', 'Lead no longer exists');
      return;
    }

    const lead = leadDoc.data() as any;

    const config = getOfficeSheetConfig(job.officeId);
    const sheetsService = new SheetsService();

    // Map lead to sheet row
    const row = leadToSheetRow(
      lead,
      '',
      undefined,
      undefined,
      undefined,
      config.timezone
    );

    await sheetsService.upsertRow(job.officeId, row);
    await syncRepo.markCompleted(jobId);
  } catch (error: any) {
    const httpCode = error.code || error.response?.status || 500;
    const isRetryable = [429, 500, 502, 503, 504].includes(httpCode);

    if (isRetryable) {
      await syncRepo.markFailed(jobId, String(httpCode), error.message || 'Unknown error');
    } else {
      await syncRepo.markFailed(jobId, String(httpCode), error.message || 'Permanent failure');
    }
  }
}

/**
 * Process pending jobs in batch
 */
export async function processPendingSheetSyncJobs(batchSize: number = 50): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const syncRepo = new SheetSyncJobRepository();
  const jobs = await syncRepo.getPendingJobs(batchSize);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processSheetSyncJob(job.jobId);
      succeeded++;
    } catch {
      failed++;
    }
    processed++;
  }

  return { processed, succeeded, failed };
}
