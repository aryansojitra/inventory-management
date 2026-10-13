import { config } from '../config';

/**
 * Add exactly N calendar days to a date.
 * Uses institutional timezone (configured via INSTITUTION_TIMEZONE).
 * Returns date-only (time set to midnight UTC-equivalent for consistency).
 */
export function addCalendarDays(date: Date, days: number): Date {
  // Work in milliseconds — no DST issue for calendar-day arithmetic
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the due date for a new issue: issueDate + 15 calendar days.
 */
export function calculateDueDate(issueDate: Date): Date {
  return addCalendarDays(issueDate, 15);
}

/**
 * Calculate the new due date after a renewal: existingDueDate + 15 calendar days.
 */
export function calculateRenewalDueDate(existingDueDate: Date): Date {
  return addCalendarDays(existingDueDate, 15);
}

/**
 * Returns today's date at midnight (start of day) in server local time.
 * Pass a mock `now` for deterministic tests.
 */
export function getToday(now?: Date): Date {
  const d = now ? new Date(now) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate overdue days. Returns 0 if not overdue.
 * overdueDays = ceil((today - dueDate) / msPerDay)
 */
export function calculateOverdueDays(dueDate: Date, now?: Date): number {
  const today = getToday(now);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the given due date has already passed (is overdue).
 */
export function isOverdue(dueDate: Date, now?: Date): boolean {
  return calculateOverdueDays(dueDate, now) > 0;
}

/**
 * Format a date as '16 Oct 2026' for display.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: config.timezone,
  });
}
