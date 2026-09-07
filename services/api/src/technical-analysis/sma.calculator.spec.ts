import { calculateSma } from './sma.calculator';

describe('calculateSma', () => {
  it('returns null when there is not enough data', () => {
    expect(calculateSma([1, 2, 3], 20)).toBeNull();
  });

  it('computes a simple average correctly for a known dataset', () => {
    const closes = [10, 20, 30, 40, 50];
    // period 5 -> average of all 5 = 30
    expect(calculateSma(closes, 5)).toBe(30);
  });

  it('uses only the most recent `period` closes, not the whole array', () => {
    const closes = [1000, 1000, 10, 20, 30]; // first two are decoys
    // period 3 -> average of last 3 = (10+20+30)/3 = 20
    expect(calculateSma(closes, 3)).toBe(20);
  });

  it('defaults to a 20-period average when no period is passed', () => {
    const closes = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25
    // last 20 values: 6..25, average = 15.5
    expect(calculateSma(closes)).toBe(15.5);
  });

  it('handles the exact-boundary case (closes.length === period)', () => {
    expect(calculateSma([5, 10, 15], 3)).toBe(10);
  });
});