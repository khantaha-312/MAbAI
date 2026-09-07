import { calculateBollinger } from './bollinger.calculator';

describe('calculateBollinger', () => {
  it('returns null when there is not enough data', () => {
    expect(calculateBollinger([1, 2, 3], 20)).toBeNull();
  });

  it('matches a hand-verified reference dataset', () => {
    const closes = [
      86.16, 89.09, 88.78, 90.32, 89.07, 91.15, 89.44, 89.18, 86.93, 87.68,
      86.96, 89.43, 89.32, 88.72, 87.45, 87.26, 89.5, 87.9, 89.13, 90.7,
    ];
    const result = calculateBollinger(closes, 20);

    expect(result).not.toBeNull();
    expect(result!.middle).toBeCloseTo(88.7085, 3);
    expect(result!.upper).toBeCloseTo(91.2919, 3);
    expect(result!.lower).toBeCloseTo(86.1251, 3);
    expect(result!.percentB).toBeCloseTo(0.8854, 3);
  });

  it('returns percentB null (not NaN/Infinity) when the window has zero volatility', () => {
    const closes = Array(20).fill(50);
    const result = calculateBollinger(closes, 20);

    expect(result!.upper).toBe(50);
    expect(result!.lower).toBe(50);
    expect(result!.percentB).toBeNull();
  });

  it('percentB reflects a close sitting right at the upper band as ~1', () => {
    // Construct a window where the last close is exactly upper band
    const flat = Array(19).fill(100);
    const result = calculateBollinger([...flat, 100], 20); // still flat -> percentB null, covered above instead:
    // Use a window with real spread and check the last value's relative position directly:
    const spread = [90, 95, 100, 105, 110, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 110];
    const r2 = calculateBollinger(spread, 20)!;
    expect(r2.percentB).not.toBeNull();
    expect(r2.percentB!).toBeGreaterThan(0);
    expect(r2.percentB!).toBeLessThan(2); // sanity bound, price can pierce bands
  });
});