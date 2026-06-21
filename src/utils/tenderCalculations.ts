import { Bidder, BoQItem, ArithmeticCheckResult, RateComparisonResult } from '../types';

/**
 * Verifies arithmetic consistency of each bidder's submission.
 *
 * When a BoQItem carries `statedAmounts` (populated on spreadsheet import), this function
 * compares each bidder's stated total against rate × quantity and counts discrepancies.
 * Without statedAmounts there is no second source of truth, so all items pass clean.
 */
export function calculateArithmeticCheck(
  bidders: Bidder[],
  items: BoQItem[]
): ArithmeticCheckResult[] {
  return bidders.map(bidder => {
    let statedSum = 0;
    let calculatedSum = 0;
    let errors = 0;

    items.forEach(item => {
      const rate = item.rates[bidder.id] ?? 0;
      const calculatedAmount = rate * item.quantity;
      calculatedSum += calculatedAmount;

      if (item.statedAmounts) {
        const statedAmount = item.statedAmounts[bidder.id] ?? calculatedAmount;
        statedSum += statedAmount;
        if (Math.abs(statedAmount - calculatedAmount) > 0.01) {
          errors++;
        }
      } else {
        statedSum += calculatedAmount;
      }
    });

    return {
      bidderId: bidder.id,
      bidderName: bidder.name,
      statedSum,
      calculatedSum,
      variance: statedSum - calculatedSum,
      errors,
    };
  });
}

/**
 * Computes per-item rate deviations from the mean across all bidders.
 * AMBER = deviation > 15 %, RED = deviation > 30 % (absolute value).
 */
export function calculateRateComparison(
  bidders: Bidder[],
  items: BoQItem[]
): RateComparisonResult[] {
  return items.map(item => {
    const ratesArray = bidders.map(b => item.rates[b.id] ?? 0);
    const averageRate = ratesArray.reduce((a, b) => a + b, 0) / ratesArray.length;

    const bidderRates: RateComparisonResult['bidderRates'] = {};
    bidders.forEach(bidder => {
      const rate = item.rates[bidder.id] ?? 0;
      const deviation = averageRate === 0 ? 0 : ((rate - averageRate) / averageRate) * 100;

      let status: 'NORMAL' | 'AMBER' | 'RED' = 'NORMAL';
      if (Math.abs(deviation) > 30) status = 'RED';
      else if (Math.abs(deviation) > 15) status = 'AMBER';

      bidderRates[bidder.id] = { rate, deviation, status };
    });

    return {
      itemId: item.id,
      itemRef: item.ref,
      description: item.description,
      averageRate,
      bidderRates,
    };
  });
}
