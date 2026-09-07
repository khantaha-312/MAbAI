import { determineTrend } from './trend.calculator';

describe('determineTrend', () => {
  it('returns insufficient_evidence when fewer than minEvidenceRequired indicators are available', () => {
    const result = determineTrend({ sma20: null, sma50: null, macdHistogram: 1, rsi: null, price: 100 });
    expect(result.direction).toBe('insufficient_evidence');
    expect(result.strength).toBeNull();
    expect(result.evidenceCount).toBe(1);
  });

  it('returns unanimous bullish with full strength when all 4 indicators agree', () => {
    const result = determineTrend({ sma20: 110, sma50: 100, macdHistogram: 2, rsi: 65, price: 115 });
    expect(result.direction).toBe('bullish');
    expect(result.strength).toBe(1);
    expect(result.evidenceCount).toBe(4);
  });

  it('returns unanimous bearish with full strength when all 4 indicators agree', () => {
    const result = determineTrend({ sma20: 90, sma50: 100, macdHistogram: -2, rsi: 35, price: 85 });
    expect(result.direction).toBe('bearish');
    expect(result.strength).toBe(1);
  });

  it('gives a LOWER strength to a 2-signal unanimous read than a 4-signal unanimous read', () => {
    const twoSignal = determineTrend({ sma20: 110, sma50: null, macdHistogram: 1, rsi: null, price: 115 });
    const fourSignal = determineTrend({ sma20: 110, sma50: 100, macdHistogram: 2, rsi: 65, price: 115 });

    expect(twoSignal.direction).toBe('bullish');
    expect(fourSignal.direction).toBe('bullish');

    const twoStrength = twoSignal.strength as number;
    const fourStrength = fourSignal.strength as number;
    expect(twoStrength).toBeLessThan(fourStrength);
  });

  it('reports mixed when signals disagree without a 70 percent majority either way', () => {
    const result = determineTrend({ sma20: 110, sma50: 100, macdHistogram: -2, rsi: 50, price: 95 });
    expect(result.direction).toBe('mixed');
  });

  it('RSI in the neutral 40-60 zone contributes no signal', () => {
    const withNeutralRsi = determineTrend({ sma20: 110, sma50: 100, macdHistogram: 2, rsi: 50, price: 115 });
    expect(withNeutralRsi.evidenceCount).toBe(3);
    expect(withNeutralRsi.signals).not.toContain('rsi_bullish_zone');
    expect(withNeutralRsi.signals).not.toContain('rsi_bearish_zone');
  });
});