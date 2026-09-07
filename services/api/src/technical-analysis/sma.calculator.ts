/**
 * Simple Moving Average — average of the last `period` closes.
 * closes must be in ascending chronological order.
 * Returns null if there isn't enough data (need at least `period` closes).
 */
export function calculateSma(closes: number[], period = 20): number | null {
  if (closes.length < period) {
    return null;
  }

  const window = closes.slice(closes.length - period);
  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / period;
}