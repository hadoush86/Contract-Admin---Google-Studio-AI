import { describe, it, expect } from 'vitest';
import {
  calculateNetCertified,
  calculateRetentionDeduction,
  calculateIPCDueDate,
  calculateIPCSummary,
} from '../utils/ipcCalculations';
import { IPCEntry } from '../types';

// ─── calculateNetCertified ────────────────────────────────────────────────────

describe('calculateNetCertified', () => {
  it('returns certifiedAmount when all deductions are zero', () => {
    expect(
      calculateNetCertified({
        certifiedAmount: 100000,
        retentionDeduction: 0,
        advancePaymentRecovery: 0,
        delayDamages: 0,
        otherDeductions: 0,
      })
    ).toBe(100000);
  });

  it('deducts retention from certified amount', () => {
    expect(
      calculateNetCertified({
        certifiedAmount: 100000,
        retentionDeduction: 5000,
        advancePaymentRecovery: 0,
        delayDamages: 0,
        otherDeductions: 0,
      })
    ).toBe(95000);
  });

  it('deducts all four deduction types simultaneously', () => {
    expect(
      calculateNetCertified({
        certifiedAmount: 200000,
        retentionDeduction: 10000,
        advancePaymentRecovery: 20000,
        delayDamages: 5000,
        otherDeductions: 3000,
      })
    ).toBe(162000);
  });

  it('can produce a negative net when deductions exceed certified amount', () => {
    expect(
      calculateNetCertified({
        certifiedAmount: 10000,
        retentionDeduction: 5000,
        advancePaymentRecovery: 5000,
        delayDamages: 2000,
        otherDeductions: 0,
      })
    ).toBe(-2000);
  });

  it('returns zero when certified amount and all deductions are zero', () => {
    expect(
      calculateNetCertified({
        certifiedAmount: 0,
        retentionDeduction: 0,
        advancePaymentRecovery: 0,
        delayDamages: 0,
        otherDeductions: 0,
      })
    ).toBe(0);
  });
});

// ─── calculateRetentionDeduction ─────────────────────────────────────────────

describe('calculateRetentionDeduction', () => {
  it('calculates 5% retention correctly', () => {
    expect(calculateRetentionDeduction(100000, 5)).toBe(5000);
  });

  it('calculates 10% retention correctly', () => {
    expect(calculateRetentionDeduction(250000, 10)).toBe(25000);
  });

  it('returns zero for zero certified amount', () => {
    expect(calculateRetentionDeduction(0, 5)).toBe(0);
  });

  it('returns zero for zero retention percentage', () => {
    expect(calculateRetentionDeduction(100000, 0)).toBe(0);
  });

  it('handles fractional retention percentages', () => {
    expect(calculateRetentionDeduction(100000, 2.5)).toBe(2500);
  });
});

// ─── calculateIPCDueDate ──────────────────────────────────────────────────────

describe('calculateIPCDueDate', () => {
  it('adds exactly 56 days to the issued date (FIDIC Sub-Clause 14.7)', () => {
    expect(calculateIPCDueDate('2025-01-01')).toBe('2025-02-26');
  });

  it('crosses month boundaries correctly', () => {
    expect(calculateIPCDueDate('2025-11-01')).toBe('2025-12-27');
  });

  it('crosses year boundaries correctly', () => {
    expect(calculateIPCDueDate('2024-11-15')).toBe('2025-01-10');
  });

  it('handles leap year February correctly', () => {
    // 2024 is a leap year; 56 days after 2024-01-05 = 2024-03-01
    expect(calculateIPCDueDate('2024-01-05')).toBe('2024-03-01');
  });
});

// ─── calculateIPCSummary ──────────────────────────────────────────────────────

const makeIPC = (partial: Partial<IPCEntry>): IPCEntry => ({
  id: Math.random().toString(36),
  ipcNo: 1,
  periodEnding: '',
  statementDate: '',
  claimedAmount: 0,
  certifiedAmount: 0,
  retentionDeduction: 0,
  advancePaymentRecovery: 0,
  delayDamages: 0,
  otherDeductions: 0,
  otherDeductionsDesc: '',
  netCertified: 0,
  issuedDate: '',
  dueDate: '',
  actualPaymentDate: '',
  status: 'Draft',
  ...partial,
});

describe('calculateIPCSummary', () => {
  const setup = { originalContractSum: 1_000_000, advancePaymentAmount: 100_000 };

  it('only counts Certified and Paid IPCs toward totalCertified', () => {
    const ipcs = [
      makeIPC({ certifiedAmount: 200_000, status: 'Certified' }),
      makeIPC({ certifiedAmount: 150_000, status: 'Paid' }),
      makeIPC({ certifiedAmount: 50_000, status: 'Draft' }),       // excluded
      makeIPC({ certifiedAmount: 75_000, status: 'Disputed' }),    // excluded
    ];
    const summary = calculateIPCSummary(ipcs, setup);
    expect(summary.totalCertified).toBe(350_000);
  });

  it('calculates remaining as originalSum minus totalCertified', () => {
    const ipcs = [makeIPC({ certifiedAmount: 300_000, status: 'Certified' })];
    const summary = calculateIPCSummary(ipcs, setup);
    expect(summary.remaining).toBe(700_000);
  });

  it('accumulates retention across all IPCs regardless of status', () => {
    const ipcs = [
      makeIPC({ retentionDeduction: 10_000, status: 'Paid' }),
      makeIPC({ retentionDeduction: 7_500, status: 'Draft' }),
    ];
    const summary = calculateIPCSummary(ipcs, setup);
    expect(summary.totalRetention).toBe(17_500);
  });

  it('calculates advance balance as advancePaymentAmount minus total recovered', () => {
    const ipcs = [
      makeIPC({ advancePaymentRecovery: 20_000 }),
      makeIPC({ advancePaymentRecovery: 30_000 }),
    ];
    const summary = calculateIPCSummary(ipcs, setup);
    // 100_000 - 50_000 = 50_000
    expect(summary.advanceBalance).toBe(50_000);
  });

  it('returns originalSum correctly', () => {
    const summary = calculateIPCSummary([], setup);
    expect(summary.originalSum).toBe(1_000_000);
  });

  it('handles an empty IPC register without errors', () => {
    const summary = calculateIPCSummary([], setup);
    expect(summary.totalCertified).toBe(0);
    expect(summary.remaining).toBe(1_000_000);
    expect(summary.totalRetention).toBe(0);
    expect(summary.advanceBalance).toBe(100_000);
  });
});
