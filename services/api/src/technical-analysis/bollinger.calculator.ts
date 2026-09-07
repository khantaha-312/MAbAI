/**
 * Bollinger Bands: a moving average (middle band) plus upper/lower bands
 * at `stdDevMultiplier` standard deviations away, using the same `period`
 * window for both the average and the standard deviation.
 * closes must be in ascending chronological order.
 * Returns null if there isn't enough data (need at least `period` closes).
 */
export interface BollingerResult {
  middle: number;
  upper: number;
  lower: number;
  // %B: where the latest close sits within the bands (0 = at lower band,
  // 1 = at upper band, can go outside [0,1] if price pierces a band).
  // null only in the degenerate case where upper === lower (zero volatility
  // window) — a real value, not a missing one, would be a division by zero.
  percentB: number | null;
  bandWidth: number;
}

export function calculateBollinger(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerResult | null {
  if (closes.length < period) {
    return null;
  }

  const window = closes.slice(closes.length - period);
  const middle = window.reduce((acc, val) => acc + val, 0) / period;

  const variance = window.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandWidth = upper - lower;

  const lastClose = closes[closes.length - 1];
  const percentB = bandWidth === 0 ? null : (lastClose - lower) / bandWidth;

  return { middle, upper, lower, percentB, bandWidth };
}