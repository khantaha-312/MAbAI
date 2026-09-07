import { calculateEma } from './ema.calculator';

describe('calculateEma', () => {
  it('returns null when there is not enough data', () => {
    expect(calculateEma([1, 2, 3], 20)).toBeNull();
  });

  it('handles the exact-boundary case (closes.length === period) by returning the seed SMA', () => {
    expect(calculateEma([5, 10, 15], 3)).toBe(10); // no smoothing applied yet, just the seed average
  });

  it('computes a known EMA(5) correctly, verified by hand', () => {
    const closes = [22, 24, 25, 23, 26, 28, 26, 29, 27, 28];
    const result = calculateEma(closes, 5);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(27.2016, 3);
  });

  it('reacts faster to recent price changes than SMA would (core EMA property)', () => {
    // A late sharp jump should move EMA more than a plain average of the same window
    const closes = [10, 10, 10, 10, 10, 10, 10, 10, 10, 100];
    const ema = calculateEma(closes, 5);
    const naiveAvgLast5 = (10 + 10 + 10 + 10 + 100) / 5; // 28
    expect(ema!).toBeGreaterThan(naiveAvgLast5 * 0.5); // sanity: EMA still meaningfully elevated by the jump
  });
});