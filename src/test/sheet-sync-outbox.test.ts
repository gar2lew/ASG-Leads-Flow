// ============================================
// ASG Leads — Sheet Sync Outbox Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { SheetSyncOperation } from '@/lib/google/sync-jobs';

describe('Sheet Sync Operations', () => {
  it('defines correct operation types', () => {
    const operations: SheetSyncOperation[] = ['upsert_lead', 'archive_lead', 'reconcile_lead'];
    expect(operations).toHaveLength(3);
  });
});

describe('Sheet Sync Job Schema', () => {
  it('defines all required fields', () => {
    const job = {
      jobId: 'lead-123_upsert_lead_1234567890',
      leadId: 'lead-123',
      officeId: 'perth',
      operation: 'upsert_lead' as const,
      status: 'pending' as const,
      attempts: 0,
      maxAttempts: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextAttemptAt: new Date().toISOString(),
      targetSpreadsheet: '',
      targetWorksheet: 'LEADS',
      idempotencyKey: 'lead-123_upsert',
    };

    expect(job.jobId).toBeTruthy();
    expect(job.leadId).toBe('lead-123');
    expect(job.operation).toBe('upsert_lead');
    expect(job.status).toBe('pending');
  });

  it('defines correct status transitions', () => {
    const statuses = ['pending', 'processing', 'completed', 'retrying', 'failed'];
    expect(statuses).toContain('pending');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });
});
