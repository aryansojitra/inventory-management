import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDueDate,
  calculateRenewalDueDate,
  calculateOverdueDays,
  isOverdue,
  getToday,
} from '../../src/utils/dateUtils';

describe('Date Utilities — Business Rules', () => {
  // Rule 1: Due date = issueDate + 15 calendar days
  describe('calculateDueDate', () => {
    it('should calculate due date as issueDate + 15 days (1 Oct → 16 Oct)', () => {
      const issueDate = new Date('2026-10-01T00:00:00.000Z');
      const dueDate = calculateDueDate(issueDate);
      expect(dueDate.getUTCDate()).toBe(16);
      expect(dueDate.getUTCMonth()).toBe(9); // October (0-indexed)
      expect(dueDate.getUTCFullYear()).toBe(2026);
    });

    it('should handle month boundary correctly (20 Oct → 4 Nov)', () => {
      const issueDate = new Date('2026-10-20T00:00:00.000Z');
      const dueDate = calculateDueDate(issueDate);
      expect(dueDate.getUTCMonth()).toBe(10); // November
      expect(dueDate.getUTCDate()).toBe(4);
    });

    it('should handle year boundary (25 Dec → 9 Jan)', () => {
      const issueDate = new Date('2026-12-25T00:00:00.000Z');
      const dueDate = calculateDueDate(issueDate);
      expect(dueDate.getUTCFullYear()).toBe(2027);
      expect(dueDate.getUTCMonth()).toBe(0); // January
      expect(dueDate.getUTCDate()).toBe(9);
    });
  });

  // Rule 2: Renewal due date = existingDueDate + 15 calendar days
  describe('calculateRenewalDueDate', () => {
    it('should calculate renewal due date: 16 Oct + 15 = 31 Oct', () => {
      const existingDue = new Date('2026-10-16T00:00:00.000Z');
      const newDue = calculateRenewalDueDate(existingDue);
      expect(newDue.getUTCDate()).toBe(31);
      expect(newDue.getUTCMonth()).toBe(9); // October
      expect(newDue.getUTCFullYear()).toBe(2026);
    });

    it('should handle month overflow: 25 Oct + 15 = 9 Nov', () => {
      const existingDue = new Date('2026-10-25T00:00:00.000Z');
      const newDue = calculateRenewalDueDate(existingDue);
      expect(newDue.getUTCMonth()).toBe(10); // November
      expect(newDue.getUTCDate()).toBe(9);
    });
  });

  // Rule 8: Overdue days
  describe('calculateOverdueDays', () => {
    it('should return 0 when not overdue (due date in future)', () => {
      const dueDate = new Date('2026-10-20T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(calculateOverdueDays(dueDate, now)).toBe(0);
    });

    it('should return 0 when due today', () => {
      const dueDate = new Date('2026-10-13T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(calculateOverdueDays(dueDate, now)).toBe(0);
    });

    it('should return 3 when 3 days overdue (due 16 Oct, today 19 Oct)', () => {
      const dueDate = new Date('2026-10-16T00:00:00.000Z');
      const now = new Date('2026-10-19T00:00:00.000Z');
      expect(calculateOverdueDays(dueDate, now)).toBe(3);
    });

    it('should return 1 when 1 day overdue', () => {
      const dueDate = new Date('2026-10-12T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(calculateOverdueDays(dueDate, now)).toBe(1);
    });
  });

  describe('isOverdue', () => {
    it('should return false for future due date', () => {
      const dueDate = new Date('2026-10-20T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(isOverdue(dueDate, now)).toBe(false);
    });

    it('should return false for due today', () => {
      const dueDate = new Date('2026-10-13T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(isOverdue(dueDate, now)).toBe(false);
    });

    it('should return true for yesterday due date', () => {
      const dueDate = new Date('2026-10-12T00:00:00.000Z');
      const now = new Date('2026-10-13T00:00:00.000Z');
      expect(isOverdue(dueDate, now)).toBe(true);
    });
  });
});
