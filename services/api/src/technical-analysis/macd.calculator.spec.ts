import { calculateMacd } from './macd.calculator';

describe('calculateMacd', () => {
  it('returns null when there is not enough data (needs slowPeriod + signalPeriod)', () => {
    expect(calculateMacd([1, 2, 3, 4, 5])).toBeNull();
  });

  it('returns null right below the minimum threshold (34 closes, needs 35)', () => {
    const closes = Array.from({ length: 34 }, (_, i) => 100 + i);
    expect(calculateMacd(closes)).toBeNull();
  });

  it('computes a real macd/signal/histogram once enough data exists (35 closes)', () => {
    const closes = Array.from({ length: 35 }, (_, i) => 100 + Math.sin(i / 3) * 10 + i * 0.5);
    const result = calculateMacd(closes);

    expect(result).not.toBeNull();
    expect(typeof result!.macd).toBe('number');
    expect(typeof result!.signal).toBe('number');
    // histogram must always equal macd - signal exactly
    expect(result!.histogram).toBeCloseTo(result!.macd - result!.signal, 10);
  });

  it('matches a hand-verified reference value for a fixed dataset', () => {
    const closes: number[] = [];
    for (let i = 0; i < 40; i++) closes.push(100 + Math.sin(i / 3) * 10 + i * 0.5);
    const result = calculateMacd(closes);

    expect(result).not.toBeNull();
    expect(result!.macd).toBeCloseTo(2.8196, 3);
    expect(result!.signal).toBeCloseTo(2.5287, 3);
    expect(result!.histogram).toBeCloseTo(0.2909, 3);
  });

  it('supports custom periods', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 50 + i);
    // fast=3, slow=6, signal=3 -> needs 9 closes minimum, 20 is plenty
    const result = calculateMacd(closes, 3, 6, 3);
    expect(result).not.toBeNull();
  });
});