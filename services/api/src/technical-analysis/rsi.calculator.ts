/**
 * Wilder's RSI (the standard, original formula — 14-period default).
 * closes must be in ascending chronological order.
 * Returns null if there isn't enough data (need period+1 closes minimum).
 */
export function calculateRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) {
    return null;
  }

  let gainSum = 0;
  let lossSum = 0;

  // Initial average gain/loss — simple average over the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder smoothing for every subsequent close.
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100; // no losses at all in the window — max RSI
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}