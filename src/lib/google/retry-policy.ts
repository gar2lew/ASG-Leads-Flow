// ============================================
// ASG Leads — Sheet Sync Retry Policy (No Server Dependencies)
// ============================================

export const RETRY_POLICY = {
  maxAttempts: 5,
  backoffMultiplier: 3,
  initialDelayMs: 60 * 1000, // 1 minute
  maxDelayMs: 60 * 60 * 1000, // 1 hour
} as const;

export function calculateNextAttemptTime(attempts: number): string {
  const delay = Math.min(
    RETRY_POLICY.initialDelayMs * Math.pow(RETRY_POLICY.backoffMultiplier, attempts - 1),
    RETRY_POLICY.maxDelayMs
  );
  return new Date(Date.now() + delay).toISOString();
}

export function isTransientError(httpCode: number): boolean {
  return [429, 500, 502, 503, 504].includes(httpCode);
}
