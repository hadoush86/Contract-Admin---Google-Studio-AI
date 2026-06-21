import { IPCEntry, CAProjectSetup } from '../types';

export function calculateNetCertified(ipc: Pick<IPCEntry,
  'certifiedAmount' | 'retentionDeduction' | 'advancePaymentRecovery' | 'delayDamages' | 'otherDeductions'
>): number {
  return (
    ipc.certifiedAmount -
    ipc.retentionDeduction -
    ipc.advancePaymentRecovery -
    ipc.delayDamages -
    ipc.otherDeductions
  );
}

export function calculateRetentionDeduction(certifiedAmount: number, retentionPercentage: number): number {
  return (certifiedAmount * retentionPercentage) / 100;
}

/** Returns the FIDIC Sub-Clause 14.7 due date: 56 days after the IPC issued date. */
export function calculateIPCDueDate(issuedDate: string): string {
  const date = new Date(issuedDate);
  date.setDate(date.getDate() + 56);
  return date.toISOString().split('T')[0];
}

export interface IPCSummary {
  originalSum: number;
  totalCertified: number;
  remaining: number;
  totalRetention: number;
  advanceBalance: number;
}

export function calculateIPCSummary(
  ipcs: IPCEntry[],
  setup: Pick<CAProjectSetup, 'originalContractSum' | 'advancePaymentAmount'>
): IPCSummary {
  const totalCertified = ipcs.reduce(
    (sum, ipc) =>
      sum + (ipc.status === 'Certified' || ipc.status === 'Paid' ? ipc.certifiedAmount : 0),
    0
  );
  const totalRetention = ipcs.reduce((sum, ipc) => sum + ipc.retentionDeduction, 0);
  const totalAdvanceRecovered = ipcs.reduce((sum, ipc) => sum + ipc.advancePaymentRecovery, 0);

  return {
    originalSum: setup.originalContractSum,
    totalCertified,
    remaining: setup.originalContractSum - totalCertified,
    totalRetention,
    advanceBalance: setup.advancePaymentAmount - totalAdvanceRecovered,
  };
}
