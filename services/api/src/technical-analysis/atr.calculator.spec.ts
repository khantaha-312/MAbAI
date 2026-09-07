import { calculateAtr, AtrBarInput } from './atr.calculator';

describe('calculateAtr', () => {
  it('returns null when there is not enough data (needs period + 1 bars)', () => {
    const bars: AtrBarInput[] = Array.from({ length: 10 }, (_, i) => ({
      high: 102 + i,
      low: 98 + i,
      close: 100 + i,
    }));
    expect(calculateAtr(bars, 14)).toBeNull();
  });

  it('computes a known constant-range dataset correctly (no gaps)', () => {
    const bars: AtrBarInput[] = Array.from({ length: 20 }, (_, i) => ({
      high: 100 + i + 2,
      low: 100 + i - 2,
      close: 100 + i,
    }));
    const result = calculateAtr(bars, 14);
    expect(result).toBeCloseTo(4, 5);
  });

  it('captures a gap correctly — true range exceeds the simple high-low spread', () => {
    const flatBars: AtrBarInput[] = Array.from({ length: 15 }, () => ({
      high: 102, low: 98, close: 100,
    }));
    const gapBar: AtrBarInput = { high: 130, low: 125, close: 128 };
    const bars = [...flatBars, gapBar];

    const result = calculateAtr(bars, 14)!;
    expect(result).toBeGreaterThan(4);
  });

  it('never returns a negative value', () => {
    const bars: AtrBarInput[] = Array.from({ length: 20 }, (_, i) => ({
      high: 100 - i + 1,
      low: 100 - i - 1,
      close: 100 - i,
    }));
    const result = calculateAtr(bars, 14)!;
    expect(result).toBeGreaterThanOrEqual(0);
  });
});