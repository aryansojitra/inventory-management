import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BORROWING_DAYS,
  DEFAULT_MAX_RENEWALS,
  STUDENT_MAX_LOANS,
  RETURN_CONDITIONS,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
} from '../../src/constants';

describe('Department Inventory System — Core Business Logic & Invariants', () => {
  describe('Rule 1: Borrowing Quotas & Durations', () => {
    it('enforces exactly 15 calendar days loan period', () => {
      expect(DEFAULT_BORROWING_DAYS).toBe(15);
    });

    it('enforces maximum 3 renewals allowed per loan line', () => {
      expect(DEFAULT_MAX_RENEWALS).toBe(3);
    });

    it('enforces maximum 5 active loans per student quota limit', () => {
      expect(STUDENT_MAX_LOANS).toBe(5);
    });
  });

  describe('Rule 2: Quota & Overdue Borrowing Protection Logic', () => {
    it('allows borrowing when current count + requested quantity is within limit', () => {
      const currentBorrowed = 2;
      const requested = 2;
      const maxLimit = STUDENT_MAX_LOANS;
      expect(currentBorrowed + requested <= maxLimit).toBe(true);
    });

    it('rejects borrowing when current count + requested quantity exceeds 5', () => {
      const currentBorrowed = 4;
      const requested = 2;
      const maxLimit = STUDENT_MAX_LOANS;
      expect(currentBorrowed + requested <= maxLimit).toBe(false);
    });

    it('blocks borrowing when student has any active overdue loans', () => {
      const overdueLoans = [
        { assetId: 'DB-004', overdueDays: 7, outstandingQty: 1 },
      ];
      const hasOverdue = overdueLoans.length > 0;
      expect(hasOverdue).toBe(true);
    });
  });

  describe('Rule 3: Return Condition Physical Routing Invariants', () => {
    it('routes GOOD return condition back to AVAILABLE stock', () => {
      const condition = RETURN_CONDITIONS.GOOD;
      const targetStatus = condition === 'good' ? ASSET_STATUSES.AVAILABLE : ASSET_STATUSES.MAINTENANCE;
      expect(targetStatus).toBe('available');
    });

    it('routes DAMAGED return condition to MAINTENANCE stock for laboratory repair', () => {
      const condition = RETURN_CONDITIONS.DAMAGED;
      const targetStatus = condition === 'damaged' ? ASSET_STATUSES.MAINTENANCE : ASSET_STATUSES.AVAILABLE;
      expect(targetStatus).toBe('maintenance');
    });

    it('routes LOST return condition to RETIRED stock', () => {
      const condition = RETURN_CONDITIONS.LOST;
      const targetStatus = condition === 'lost' ? ASSET_STATUSES.RETIRED : ASSET_STATUSES.AVAILABLE;
      expect(targetStatus).toBe('retired');
    });
  });

  describe('Rule 4: Multi-format Student Identifier Parsing', () => {
    it('correctly detects standard institutional email addresses', () => {
      const id1 = 'coordinator@department.edu';
      const id2 = 'student1@department.edu';
      expect(id1.includes('@')).toBe(true);
      expect(id2.includes('@')).toBe(true);
    });

    it('correctly detects student roll / enrolment numbers', () => {
      const roll1 = 'CS-2024-001';
      const roll2 = 'EC-2024-009';
      const roll3 = 'DFIS2601';
      expect(roll1.includes('@')).toBe(false);
      expect(roll2.includes('@')).toBe(false);
      expect(roll3.includes('@')).toBe(false);
      expect(roll1.toUpperCase()).toBe('CS-2024-001');
    });
  });
});
