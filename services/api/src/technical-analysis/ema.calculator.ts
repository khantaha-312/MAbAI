/**
 * Exponential Moving Average.
 * closes must be in ascending chronological order.
 * Standard convention: seed the first EMA value with a plain SMA over the
 * first `period` closes, then apply the smoothing multiplier for every
 * close after that (same textbook approach used by most charting platforms).
 * Returns null if there isn't enough data (need at least `period` closes).
 */
export function calculateEma(closes: number[], period = 20): number | null {
  if (closes.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  // Seed with SMA of the first `period` closes.
  const seedWindow = closes.slice(0, period);
  let ema = seedWindow.reduce((acc, val) => acc + val, 0) / period;

  // Apply smoothing for every close after the seed window.
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
  }

  return ema;
}