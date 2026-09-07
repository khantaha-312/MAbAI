import { deriveExpertiseTier, ExpertiseTierInput } from './expertise-tier.calculator';

function baseInput(overrides: Partial<ExpertiseTierInput> = {}): ExpertiseTierInput {
  return {
    tradingType: 'SPOT',
    tradingStyle: 'LONG_TERM_INVESTMENT',
    assetClasses: ['STOCKS'],
    investmentPlan: 'YEARLY',
    maxLeverageTolerance: null,
    typicalPositionSizePct: null,
    ...overrides,
  };
}

describe('deriveExpertiseTier', () => {
  it('returns insufficient_evidence when fewer than minEvidenceRequired signals are present', () => {
    const input = baseInput({ assetClasses: [] });
    const result = deriveExpertiseTier(input, 6);

    expect(result.tier).toBe('insufficient_evidence');
    expect(result.confidence).toBeNull();
    expect(result.evidenceCount).toBeLessThan(6);
    expect(result.reason).toMatch(/need at least 6/);
  });

  it('classifies a clearly beginner profile as BEGINNER with meaningful confidence', () => {
    const input = baseInput({
      tradingType: 'SPOT',
      tradingStyle: 'LONG_TERM_INVESTMENT',
      assetClasses: ['STOCKS'],
      investmentPlan: 'YEARLY',
      maxLeverageTolerance: 1,
      typicalPositionSizePct: 5,
    });
    const result = deriveExpertiseTier(input);

    expect(result.tier).toBe('BEGINNER');
    expect(result.confidence).not.toBeNull();
    expect(result.confidence!).toBeGreaterThan(0);
    expect(result.evidenceCount).toBe(5);
    expect(result.signals).toContain('trading_type_spot');
    expect(result.signals).toContain('conservative_leverage_and_position_size');
  });

  it('classifies a clearly advanced profile as PRO with meaningful confidence', () => {
    const input = baseInput({
      tradingType: 'FUTURES',
      tradingStyle: 'SCALPING',
      assetClasses: ['CRYPTO', 'FOREX', 'COMMODITIES'],
      investmentPlan: 'WEEKLY',
      maxLeverageTolerance: 10,
      typicalPositionSizePct: 30,
    });
    const result = deriveExpertiseTier(input);

    expect(result.tier).toBe('PRO');
    expect(result.confidence).not.toBeNull();
    expect(result.confidence!).toBeGreaterThan(0.5);
    expect(result.signals).toContain('trading_type_futures');
    expect(result.signals).toContain('high_leverage_or_position_size');
  });

    it('classifies a genuinely mixed profile as INTERMEDIATE, not forced to an extreme', () => {
    const input = baseInput({
      tradingType: 'FUTURES',              // advanced
      tradingStyle: 'SWING',                // neutral
      assetClasses: ['CRYPTO', 'FOREX'],    // advanced (2 classes, includes CRYPTO)
      investmentPlan: 'MONTHLY',            // neutral
      maxLeverageTolerance: null,
      typicalPositionSizePct: null,         // no signal (both null)
    });
    const result = deriveExpertiseTier(input);

    expect(result.tier).toBe('INTERMEDIATE');
    expect(result.confidence).not.toBeNull();
    expect(result.confidence!).toBeGreaterThan(0);
    expect(result.confidence!).toBeLessThan(1);
    expect(result.evidenceCount).toBe(4);
  });

  it('gives lower confidence to a 2-signal read than an equivalent 5-signal read pointing the same direction', () => {
    const minimal = deriveExpertiseTier(
      baseInput({
        tradingType: 'FUTURES',
        tradingStyle: 'SCALPING',
        assetClasses: [],
        investmentPlan: 'MONTHLY',
      }),
    );

    const full = deriveExpertiseTier(
      baseInput({
        tradingType: 'FUTURES',
        tradingStyle: 'SCALPING',
        assetClasses: ['CRYPTO', 'FOREX', 'COMMODITIES'],
        investmentPlan: 'WEEKLY',
        maxLeverageTolerance: 10,
        typicalPositionSizePct: 30,
      }),
    );

    expect(minimal.evidenceCount).toBeLessThan(full.evidenceCount);
    expect(minimal.confidence!).toBeLessThan(full.confidence!);
  });

  it('does not count assetClasses as a signal when the array is empty', () => {
    const input = baseInput({ assetClasses: [] });
    const result = deriveExpertiseTier(input);

    expect(result.signals.some((s) => s.startsWith('asset_classes'))).toBe(false);
  });

  it('does not count leverage/position signal when both are null', () => {
    const input = baseInput({ maxLeverageTolerance: null, typicalPositionSizePct: null });
    const result = deriveExpertiseTier(input);

    expect(
      result.signals.some((s) => s === 'high_leverage_or_position_size' || s === 'conservative_leverage_and_position_size'),
    ).toBe(false);
  });

  it('is deterministic — same input always produces the same output', () => {
    const input = baseInput({
      tradingType: 'FUTURES',
      tradingStyle: 'SWING',
      assetClasses: ['CRYPTO'],
      investmentPlan: 'QUARTERLY',
      maxLeverageTolerance: 4,
      typicalPositionSizePct: 15,
    });

    const first = deriveExpertiseTier(input);
    const second = deriveExpertiseTier(input);

    expect(first).toEqual(second);
  });
});