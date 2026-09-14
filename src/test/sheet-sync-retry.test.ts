// ============================================
// ASG Leads — Sheet Sync Retry Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  RETRY_POLICY,
  calculateNextAttemptTime,
  isTransientError,
} from '@/lib/google/retry-policy';
import { shouldRetryJob } from '@/lib/google/retry';

describe('RETRY_POLICY', () => {
  it('has correct configuration', () => {
    expect(RETRY_POLICY.maxAttempts).toBe(5);
    expect(RETRY_POLICY.backoffMultiplier).toBe(3);
    expect(RETRY_POLICY.initialDelayMs).toBe(60 * 1000); // 1 minute
    expect(RETRY_POLICY.maxDelayMs).toBe(60 * 60 * 1000); // 1 hour
  });
});

describe('calculateNextAttemptTime', () => {
  it('calculates exponential backoff with multiplier 3', () => {
    const t1 = calculateNextAttemptTime(1);
    const t2 = calculateNextAttemptTime(2);
    const t3 = calculateNextAttemptTime(3);

    const d1 = new Date(t1).getTime() - Date.now();
    const d2 = new Date(t2).getTime() - Date.now();
    const d3 = new Date(t3).getTime() - Date.now();

    // Allow 5 second tolerance
    // attempt 1: 1 min, attempt 2: 3 min, attempt 3: 9 min
    expect(d1).toBeGreaterThanOrEqual(60 * 1000 - 5000);
    expect(d1).toBeLessThanOrEqual(60 * 1000 + 5000);
    expect(d2).toBeGreaterThanOrEqual(3 * 60 * 1000 - 5000);
    expect(d2).toBeLessThanOrEqual(3 * 60 * 1000 + 5000);
    expect(d3).toBeGreaterThanOrEqual(9 * 60 * 1000 - 5000);
    expect(d3).toBeLessThanOrEqual(9 * 60 * 1000 + 5000);
  });

  it('caps at max delay', () => {
    const t10 = calculateNextAttemptTime(10);
    const delay = new Date(t10).getTime() - Date.now();
    expect(delay).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
  });
});

describe('isTransientError', () => {
  it('identifies transient errors', () => {
    expect(isTransientError(429)).toBe(true);
    expect(isTransientError(500)).toBe(true);
    expect(isTransientError(502)).toBe(true);
    expect(isTransientError(503)).toBe(true);
    expect(isTransientError(504)).toBe(true);
  });

  it('does not identify permanent errors as transient', () => {
    expect(isTransientError(400)).toBe(false);
    expect(isTransientError(401)).toBe(false);
    expect(isTransientError(403)).toBe(false);
    expect(isTransientError(404)).toBe(false);
    expect(isTransientError(409)).toBe(false);
    expect(isTransientError(422)).toBe(false);
  });
});

describe('shouldRetryJob', () => {
  it('retries transient errors', () => {
    const result = shouldRetryJob(1, 429);
    expect(result.shouldRetry).toBe(true);
    expect(result.nextAttemptAt).toBeDefined();
  });

  it('retries 500 errors', () => {
    const result = shouldRetryJob(1, 500);
    expect(result.shouldRetry).toBe(true);
  });

  it('retries 502 errors', () => {
    const result = shouldRetryJob(1, 502);
    expect(result.shouldRetry).toBe(true);
  });

  it('retries 503 errors', () => {
    const result = shouldRetryJob(1, 503);
    expect(result.shouldRetry).toBe(true);
  });

  it('retries 504 errors', () => {
    const result = shouldRetryJob(1, 504);
    expect(result.shouldRetry).toBe(true);
  });

  it('does not retry 400 errors', () => {
    const result = shouldRetryJob(1, 400);
    expect(result.shouldRetry).toBe(false);
  });

  it('does not retry 401 errors', () => {
    const result = shouldRetryJob(1, 401);
    expect(result.shouldRetry).toBe(false);
  });

  it('does not retry 403 errors', () => {
    const result = shouldRetryJob(1, 403);
    expect(result.shouldRetry).toBe(false);
  });

  it('does not retry 404 errors', () => {
    const result = shouldRetryJob(1, 404);
    expect(result.shouldRetry).toBe(false);
  });

  it('does not retry after max attempts', () => {
    const result = shouldRetryJob(5, 429);
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toContain('Max attempts');
  });

  it('retries unknown errors conservatively', () => {
    const result = shouldRetryJob(2, 999);
    expect(result.shouldRetry).toBe(true);
  });

  it('does not retry unknown errors after 3 attempts', () => {
    const result = shouldRetryJob(3, 999);
    expect(result.shouldRetry).toBe(false);
  });
});
