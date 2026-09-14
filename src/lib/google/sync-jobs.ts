// ============================================
// ASG Leads — Sheet Sync Job Model & Outbox
// ============================================

import { getAdminFirestore } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export type SheetSyncOperation = 'upsert_lead' | 'archive_lead' | 'reconcile_lead';
export type SheetSyncStatus = 'pending' | 'processing' | 'completed' | 'retrying' | 'failed';

export interface SheetSyncJob {
  jobId: string;
  leadId: string;
  officeId: string;
  operation: SheetSyncOperation;
  status: SheetSyncStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  completedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  targetSpreadsheet: string;
  targetWorksheet: string;
  idempotencyKey: string;
}

export { RETRY_POLICY, calculateNextAttemptTime, isTransientError } from './retry-policy';
import { RETRY_POLICY, calculateNextAttemptTime, isTransientError } from './retry-policy';

export class SheetSyncJobRepository {
  private db = getAdminFirestore();

  /**
   * Create a sync job after Firestore mutation (outbox pattern)
   */
  async createSyncJob(params: {
    leadId: string;
    officeId: string;
    operation: SheetSyncOperation;
    idempotencyKey: string;
  }): Promise<SheetSyncJob> {
    const { leadId, officeId, operation, idempotencyKey } = params;
    const now = new Date().toISOString();

    const jobId = `${leadId}_${operation}_${Date.now()}`;
    const job: SheetSyncJob = {
      jobId,
      leadId,
      officeId,
      operation,
      status: 'pending',
      attempts: 0,
      maxAttempts: RETRY_POLICY.maxAttempts,
      createdAt: now,
      updatedAt: now,
      nextAttemptAt: now,
      targetSpreadsheet: '', // Resolved at processing time
      targetWorksheet: 'LEADS',
      idempotencyKey,
    };

    await this.db.collection(COLLECTIONS.SHEET_SYNC_JOBS).doc(jobId).set(job);
    return job;
  }

  /**
   * Get pending jobs that are ready to process
   */
  async getPendingJobs(limit: number = 50): Promise<SheetSyncJob[]> {
    const now = new Date().toISOString();
    const snapshot = await this.db
      .collection(COLLECTIONS.SHEET_SYNC_JOBS)
      .where('status', 'in', ['pending', 'retrying'])
      .where('nextAttemptAt', '<=', now)
      .orderBy('nextAttemptAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as SheetSyncJob);
  }

  /**
   * Get failed jobs for admin monitoring
   */
  async getFailedJobs(officeId?: string, limit: number = 100): Promise<SheetSyncJob[]> {
    let query = this.db
      .collection(COLLECTIONS.SHEET_SYNC_JOBS)
      .where('status', '==', 'failed')
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (officeId) {
      query = query.where('officeId', '==', officeId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as SheetSyncJob);
  }

  /**
   * Mark job as processing
   */
  async markProcessing(jobId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.SHEET_SYNC_JOBS).doc(jobId).update({
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark job as completed
   */
  async markCompleted(jobId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.SHEET_SYNC_JOBS).doc(jobId).update({
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark job as failed with retry
   */
  async markFailed(jobId: string, errorCode: string, errorMessage: string): Promise<void> {
    const jobDoc = await this.db.collection(COLLECTIONS.SHEET_SYNC_JOBS).doc(jobId).get();
    const job = jobDoc.data() as SheetSyncJob;

    const attempts = job.attempts + 1;
    const isFinalAttempt = attempts >= job.maxAttempts;

    await jobDoc.ref.update({
      status: isFinalAttempt ? 'failed' : 'retrying',
      attempts,
      nextAttemptAt: isFinalAttempt ? job.nextAttemptAt : calculateNextAttemptTime(attempts),
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Requeue a failed job for manual retry
   */
  async requeueJob(jobId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.SHEET_SYNC_JOBS).doc(jobId).update({
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

// Singleton
let syncJobRepo: SheetSyncJobRepository | null = null;

export function getSheetSyncJobRepository(): SheetSyncJobRepository {
  if (!syncJobRepo) {
    syncJobRepo = new SheetSyncJobRepository();
  }
  return syncJobRepo;
}
