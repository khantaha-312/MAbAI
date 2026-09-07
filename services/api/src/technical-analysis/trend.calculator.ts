/**
 * Trend determination: synthesizes a directional read from already-computed
 * indicators (SMA20/50, MACD histogram, RSI zone) rather than reading raw
 * PriceBar data itself.
 *
 * Two safeguards against overconfident/fabricated output (master brief §8, §20):
 * 1. Requires at least `minEvidenceRequired` available indicators before
 *    declaring any direction — returns 'insufficient_evidence' otherwise,
 *    rather than guessing off a single signal.
 * 2. `strength` scales down when fewer indicators are available, even if
 *    the ones present fully agree — a 2-signal unanimous read is NOT
 *    reported with the same confidence as a 4-signal unanimous read.
 */
export interface TrendInput {
  sma20: number | null;
  sma50: number | null;
  macdHistogram: number | null;
  rsi: number | null;
  price: number;
}

export interface TrendResult {
  direction: 'bullish' | 'bearish' | 'mixed' | 'insufficient_evidence';
  // strength: 0 (weak/mixed) to 1 (strong, well-supported). null only when
  // direction is 'insufficient_evidence'.
  strength: number | null;
  signals: string[];
  evidenceCount: number;
  reason?: string;
}

const FULL_INDICATOR_SET = 4; // sma20-vs-price, sma20-vs-sma50, macd, rsi

export function determineTrend(input: TrendInput, minEvidenceRequired = 2): TrendResult {
  const { sma20, sma50, macdHistogram, rsi, price } = input;

  const signals: string[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;
  let totalPoints = 0;

  if (sma20 !== null) {
    totalPoints++;
    if (price > sma20) {
      bullishPoints++;
      signals.push('price_above_sma20');
    } else {
      bearishPoints++;
      signals.push('price_below_sma20');
    }
  }

  if (sma20 !== null && sma50 !== null) {
    totalPoints++;
    if (sma20 > sma50) {
      bullishPoints++;
      signals.push('sma20_above_sma50');
    } else {
      bearishPoints++;
      signals.push('sma20_below_sma50');
    }
  }

  if (macdHistogram !== null) {
    totalPoints++;
    if (macdHistogram > 0) {
      bullishPoints++;
      signals.push('macd_histogram_positive');
    } else {
      bearishPoints++;
      signals.push('macd_histogram_negative');
    }
  }

  if (rsi !== null) {
    // Only counts if clearly directional — 40-60 is neutral and contributes no signal either way.
    if (rsi > 60) {
      totalPoints++;
      bullishPoints++;
      signals.push('rsi_bullish_zone');
    } else if (rsi < 40) {
      totalPoints++;
      bearishPoints++;
      signals.push('rsi_bearish_zone');
    }
  }

  if (totalPoints < minEvidenceRequired) {
    return {
      direction: 'insufficient_evidence',
      strength: null,
      signals,
      evidenceCount: totalPoints,
      reason: `Only ${totalPoints} indicator(s) available, need at least ${minEvidenceRequired} for a trend read`,
    };
  }

  const bullishRatio = bullishPoints / totalPoints;
  let direction: TrendResult['direction'];
  if (bullishRatio >= 0.7) direction = 'bullish';
  else if (bullishRatio <= 0.3) direction = 'bearish';
  else direction = 'mixed';
  

  const agreementStrength = Math.abs(bullishRatio - 0.5) * 2; // 0 = split, 1 = unanimous
  const evidenceConfidence = Math.min(totalPoints / FULL_INDICATOR_SET, 1);
  const strength = agreementStrength * evidenceConfidence;

  return { direction, strength, signals, evidenceCount: totalPoints };
}