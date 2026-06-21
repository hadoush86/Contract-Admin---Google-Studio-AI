import { describe, it, expect } from 'vitest';
import { calculateArithmeticCheck, calculateRateComparison } from '../utils/tenderCalculations';
import { Bidder, BoQItem } from '../types';

const bidders: Bidder[] = [
  { id: '1', name: 'Bidder A' },
  { id: '2', name: 'Bidder B' },
  { id: '3', name: 'Bidder C' },
];

const items: BoQItem[] = [
  { id: 'i1', ref: '1.01', description: 'Mobilisation', unit: 'LS', quantity: 1, rates: { '1': 50000, '2': 55000, '3': 48000 } },
  { id: 'i2', ref: '2.01', description: 'Excavation', unit: 'm3', quantity: 5000, rates: { '1': 15, '2': 18, '3': 12 } },
];

// ─── calculateRateComparison ──────────────────────────────────────────────────

describe('calculateRateComparison', () => {
  it('computes the average rate correctly across all bidders', () => {
    const results = calculateRateComparison(bidders, items);
    // item i1: (50000 + 55000 + 48000) / 3 = 51000
    expect(results[0].averageRate).toBeCloseTo(51000, 2);
    // item i2: (15 + 18 + 12) / 3 = 15
    expect(results[1].averageRate).toBeCloseTo(15, 2);
  });

  it('assigns NORMAL when deviation is exactly 15%', () => {
    // averageRate = 100; rate = 115 → deviation = +15%
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 1, rates: { a: 115, b: 85 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    // avg = 100; A = +15%, B = -15%
    expect(results[0].bidderRates['a'].status).toBe('NORMAL');
    expect(results[0].bidderRates['b'].status).toBe('NORMAL');
  });

  it('assigns AMBER when deviation is just above 15%', () => {
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    // avg = 100; a = 115.1 → dev ≈ 15.1%
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 1, rates: { a: 115.1, b: 84.9 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    expect(results[0].bidderRates['a'].status).toBe('AMBER');
    expect(results[0].bidderRates['b'].status).toBe('AMBER');
  });

  it('assigns AMBER when deviation is exactly 30%', () => {
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    // avg = 100; a = 130 → dev = +30%
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 1, rates: { a: 130, b: 70 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    expect(results[0].bidderRates['a'].status).toBe('AMBER');
    expect(results[0].bidderRates['b'].status).toBe('AMBER');
  });

  it('assigns RED when deviation exceeds 30%', () => {
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    // avg = 100; a = 130.1 → dev ≈ +30.1%
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 1, rates: { a: 130.1, b: 69.9 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    expect(results[0].bidderRates['a'].status).toBe('RED');
    expect(results[0].bidderRates['b'].status).toBe('RED');
  });

  it('returns zero deviation and NORMAL status when all rates are zero', () => {
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 1, rates: { a: 0, b: 0 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    expect(results[0].bidderRates['a'].deviation).toBe(0);
    expect(results[0].bidderRates['a'].status).toBe('NORMAL');
  });

  it('carries item metadata through to results', () => {
    const results = calculateRateComparison(bidders, items);
    expect(results[0].itemId).toBe('i1');
    expect(results[0].itemRef).toBe('1.01');
    expect(results[0].description).toBe('Mobilisation');
  });

  it('treats missing rates as zero', () => {
    const localBidders: Bidder[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const localItems: BoQItem[] = [
      { id: 'x', ref: 'X', description: '', unit: 'nr', quantity: 100, rates: { a: 100 } },
    ];
    const results = calculateRateComparison(localBidders, localItems);
    expect(results[0].bidderRates['b'].rate).toBe(0);
    expect(results[0].averageRate).toBeCloseTo(50, 2);
  });
});

// ─── calculateArithmeticCheck ─────────────────────────────────────────────────

describe('calculateArithmeticCheck', () => {
  it('computes calculatedSum as rate × quantity for each item', () => {
    const results = calculateArithmeticCheck(bidders, items);
    // Bidder A: (50000×1) + (15×5000) = 50000 + 75000 = 125000
    expect(results[0].calculatedSum).toBe(125000);
    // Bidder B: (55000×1) + (18×5000) = 55000 + 90000 = 145000
    expect(results[1].calculatedSum).toBe(145000);
    // Bidder C: (48000×1) + (12×5000) = 48000 + 60000 = 108000
    expect(results[2].calculatedSum).toBe(108000);
  });

  it('returns zero errors and zero variance when no statedAmounts are provided', () => {
    const results = calculateArithmeticCheck(bidders, items);
    results.forEach(r => {
      expect(r.errors).toBe(0);
      expect(r.variance).toBe(0);
    });
  });

  it('reports errors and variance when statedAmounts differ from rate × quantity', () => {
    const itemsWithStated: BoQItem[] = [
      {
        ...items[0],
        statedAmounts: {
          '1': 50000,       // matches rate × qty → no error
          '2': 60000,       // stated 60000 but rate×qty = 55000 → error
          '3': 48000,       // matches
        },
      },
      {
        ...items[1],
        statedAmounts: {
          '1': 75000,       // 15 × 5000 = 75000 → no error
          '2': 90000,       // 18 × 5000 = 90000 → no error
          '3': 62000,       // stated 62000 but rate×qty = 60000 → error
        },
      },
    ];

    const results = calculateArithmeticCheck(bidders, itemsWithStated);

    // Bidder A: 0 errors
    expect(results[0].errors).toBe(0);
    expect(results[0].variance).toBe(0);

    // Bidder B: 1 error on item 0 (60000 vs 55000)
    expect(results[1].errors).toBe(1);
    expect(results[1].variance).toBeCloseTo(60000 - 55000, 2);

    // Bidder C: 1 error on item 1 (62000 vs 60000)
    expect(results[2].errors).toBe(1);
    expect(results[2].variance).toBeCloseTo(62000 - 60000, 2);
  });

  it('handles zero-quantity items correctly', () => {
    const zeroQtyItems: BoQItem[] = [
      { id: 'z', ref: 'Z', description: 'Zero qty', unit: 'nr', quantity: 0, rates: { '1': 100, '2': 200, '3': 150 } },
    ];
    const results = calculateArithmeticCheck(bidders, zeroQtyItems);
    results.forEach(r => {
      expect(r.calculatedSum).toBe(0);
      expect(r.errors).toBe(0);
    });
  });

  it('handles zero-rate items correctly', () => {
    const zeroRateItems: BoQItem[] = [
      { id: 'z', ref: 'Z', description: 'Zero rate', unit: 'nr', quantity: 1000, rates: { '1': 0, '2': 0, '3': 0 } },
    ];
    const results = calculateArithmeticCheck(bidders, zeroRateItems);
    results.forEach(r => {
      expect(r.calculatedSum).toBe(0);
    });
  });

  it('correctly accumulates across multiple items', () => {
    const multiItems: BoQItem[] = [
      { id: '1', ref: 'A', description: '', unit: 'nr', quantity: 10, rates: { '1': 5 } },
      { id: '2', ref: 'B', description: '', unit: 'nr', quantity: 20, rates: { '1': 3 } },
      { id: '3', ref: 'C', description: '', unit: 'nr', quantity: 5, rates: { '1': 8 } },
    ];
    const singleBidder: Bidder[] = [{ id: '1', name: 'X' }];
    const results = calculateArithmeticCheck(singleBidder, multiItems);
    // 10×5 + 20×3 + 5×8 = 50 + 60 + 40 = 150
    expect(results[0].calculatedSum).toBe(150);
  });

  it('carries bidder metadata through to results', () => {
    const results = calculateArithmeticCheck(bidders, items);
    expect(results[0].bidderId).toBe('1');
    expect(results[0].bidderName).toBe('Bidder A');
  });
});
