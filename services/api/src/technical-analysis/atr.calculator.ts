/**
 * Average True Range (ATR) — Wilder's original smoothing, same technique
 * used for RSI in this codebase.
 * True Range for a bar = max of:
 *   (high - low), |high - prevClose|, |low - prevClose|
 * This correctly captures gaps (e.g. a large overnight jump), not just the
 * intraday high-low spread.
 * bars must be in ascending chronological order.
 * Returns null if there isn't enough data (need at least period + 1 bars,
 * since the first true-range value needs a previous close to compare against).
 */
export interface AtrBarInput {
  high: number;
  low: number;
  close: number;
}

export function calculateAtr(bars: AtrBarInput[], period = 14): number | null {
  if (bars.length < period + 1) {
    return null;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const { high, low } = bars[i];
    const prevClose = bars[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  // Wilder smoothing — identical style to calculateRsi's averaging.
  let atr = trueRanges.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}