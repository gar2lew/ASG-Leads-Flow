// ============================================
// ASG Leads — Sheet Sync Retry Decision Logic (Pure, No Server Deps)
// ============================================

import { RETRY_POLICY, calculateNextAttemptTime, isTransientError } from './retry-policy';

export { RETRY_POLICY, calculateNextAttemptTime, isTransientError };

export interface RetryDecision {
  shouldRetry: boolean;
  nextAttemptAt?: string;
  reason: string;
}

export function shouldRetryJob(attempts: number, httpCode: number): RetryDecision {
  // Permanent errors - don't retry
  if ([400, 401, 403, 404, 409, 422].includes(httpCode)) {
    return {
      shouldRetry: false,
      reason: `Permanent error: HTTP ${httpCode}`,
    };
  }

  // Transient errors - retry with backoff
  if (isTransientError(httpCode)) {
    if (attempts >= RETRY_POLICY.maxAttempts) {
      return {
        shouldRetry: false,
        reason: `Max attempts (${RETRY_POLICY.maxAttempts}) reached`,
      };
    }
    return {
      shouldRetry: true,
      nextAttemptAt: calculateNextAttemptTime(attempts),
      reason: `Transient error: HTTP ${httpCode}, will retry`,
    };
  }

  // Unknown errors - retry conservatively
  if (attempts < 3) {
    return {
      shouldRetry: true,
      nextAttemptAt: calculateNextAttemptTime(attempts),
      reason: `Unknown error: HTTP ${httpCode}, will retry`,
    };
  }

  return {
    shouldRetry: false,
    reason: `Unknown error: HTTP ${httpCode}, max retries exceeded`,
  };
}
