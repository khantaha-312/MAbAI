import { calculateRsi } from './rsi.calculator';

describe('calculateRsi', () => {
  it('returns null when there is not enough data', () => {
    expect(calculateRsi([100, 101, 102], 14)).toBeNull();
  });

  it('returns 100 when there are no losses at all', () => {
    const risingCloses = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(calculateRsi(risingCloses, 14)).toBe(100);
  });

  it('returns a value between 0 and 100 for realistic mixed data', () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28,
    ];
    const rsi = calculateRsi(closes, 14);
    expect(rsi).not.toBeNull();
    expect(rsi as number).toBeGreaterThan(0);
    expect(rsi as number).toBeLessThan(100);
  });
});