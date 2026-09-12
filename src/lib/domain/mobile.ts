// ============================================
// ASG Leads — Australian Mobile Normalization
// ============================================

/**
 * Normalizes Australian mobile numbers to E.164 format.
 *
 * Examples:
 *   "0412 345 678"      → "+61412345678"
 *   "0412345678"         → "+61412345678"
 *   "+61 412 345 678"    → "+61412345678"
 *   "61412345678"        → "+61412345678"
 *   "+61 412 345 678"    → "+61412345678"
 *
 * Returns null if the number cannot be normalized into a valid Australian mobile.
 */
export function normalizeAustralianMobile(input: string): string | null {
  if (!input) return null;

  // Strip all non-digit characters except leading +
  let cleaned = input.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');

  // Remove leading 0 (Australian trunk prefix) or 61 (country code)
  if (hasPlus) {
    // Already has country code
    if (cleaned.startsWith('61')) {
      cleaned = cleaned.slice(2); // Remove 61
    }
  } else {
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1); // Remove leading 0
    } else if (cleaned.startsWith('61')) {
      cleaned = cleaned.slice(2); // Remove 61
    }
  }

  // Australian mobiles are 9 digits starting with 4
  if (cleaned.length !== 9) return null;
  if (!cleaned.startsWith('4')) return null;

  return `+61${cleaned}`;
}

/**
 * Validates if a string looks like a plausible Australian mobile.
 * Does not guarantee normalization will succeed — use for UI hints only.
 */
export function isPlausibleAustralianMobile(input: string): boolean {
  if (!input) return false;
  const digits = input.replace(/\D/g, '');
  // Accept 10 digits (0XXX...) or 9 digits (after country code) or 11/12 with 61 prefix
  if (digits.length === 10 && digits.startsWith('0') && digits[1] === '4') return true;
  if (digits.length === 9 && digits.startsWith('4')) return true;
  if (digits.length === 11 && digits.startsWith('614')) return true;
  if (digits.length === 12 && digits.startsWith('61') && digits[2] === '4') return true;
  return false;
}

/**
 * Formats an E.164 mobile for display.
 * "+61412345678" → "+61 412 345 678"
 */
export function formatMobileForDisplay(e164: string): string {
  if (!e164 || !e164.startsWith('+61') || e164.length !== 12) return e164;
  const national = e164.slice(3); // Remove +61
  return `+61 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
