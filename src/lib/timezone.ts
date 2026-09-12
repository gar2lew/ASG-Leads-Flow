// ============================================
// ASG Leads — Timezone Utilities
// ============================================

/**
 * Formats a date in the specified IANA timezone to a string.
 * @param date - Date object
 * @param timeZone - IANA timezone string (e.g., "Australia/Perth")
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted string
 */
export function formatZonedTime(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone, ...options }).format(date);
}

/**
 * Gets the start of the day (00:00:00) in the specified timezone for a given UTC timestamp.
 * @param utcString - ISO 8601 string in UTC
 * @param timeZone - IANA timezone string
 * @returns Date object representing the start of the day in the timezone
 */
export function startOfDayInTimeZone(utcString: string, timeZone: string): Date {
  const date = new Date(utcString);
  // Format the date as YYYY-MM-DD in the target timezone, then create a Date at midnight
  const year = parseInt(formatZonedTime(date, timeZone, { year: 'numeric' }), 10);
  const month = parseInt(formatZonedTime(date, timeZone, { month: '2-digit' }), 10) - 1; // 0-indexed
  const day = parseInt(formatZonedTime(date, timeZone, { day: '2-digit' }), 10);
  
  // Create a UTC date at midnight of the target timezone's local date
  // This ensures consistent comparison regardless of the runtime's timezone
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Gets the IANA timezone string from an office ID.
 * @param officeId - The office ID ("perth" or "brisbane")
 * @returns IANA timezone string
 */
export function officeToTimeZone(officeId: string): string {
  switch (officeId) {
    case 'perth':
      return 'Australia/Perth';
    case 'brisbane':
      return 'Australia/Brisbane';
    default:
      return 'UTC';
  }
}

/**
 * Classifies a follow-up's scheduled time relative to now in the given timezone.
 * @param scheduledAt - ISO string of the scheduled time
 * @param now - Current time as a Date
 * @param timeZone - IANA timezone string
 * @returns Classification: "overdue" | "today" | "tomorrow" | "upcoming"
 */
export function classifyFollowUpTime(scheduledAt: string, now: Date, timeZone: string): "overdue" | "today" | "tomorrow" | "upcoming" {
  const scheduled = new Date(scheduledAt);
  const todayStart = startOfDayInTimeZone(now.toISOString(), timeZone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrowStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  if (scheduled < todayStart) {
    return "overdue";
  } else if (scheduled >= todayStart && scheduled < tomorrowStart) {
    return "today";
  } else if (scheduled >= tomorrowStart && scheduled < dayAfterTomorrowStart) {
    return "tomorrow";
  } else {
    return "upcoming";
  }
}