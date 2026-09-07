/**
 * MACD (Moving Average Convergence Divergence).
 * closes must be in ascending chronological order.
 * MACD line = EMA(fastPeriod) − EMA(slowPeriod)
 * Signal line = EMA(signalPeriod) applied to the MACD line's own history
 * Histogram = MACD line − Signal line
 *
 * Needs at least slowPeriod + signalPeriod closes (default 26 + 9 = 35)
 * to produce a real signal line — returns null if there isn't enough data.
 */
export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

// Internal helper: returns the full EMA series (one value per input starting
// at index `period - 1`), not just the final value — needed because the
// signal line is an EMA of the MACD line's own history, not a single point.
function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const series: number[] = [];

  let ema = values.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  series.push(ema);

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    series.push(ema);
  }

  return series;
}

export function calculateMacd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult | null {
  if (closes.length < slowPeriod + signalPeriod) {
    return null;
  }

  const fastSeries = emaSeries(closes, fastPeriod);
  const slowSeries = emaSeries(closes, slowPeriod);

  // fastSeries[0] corresponds to closes[fastPeriod - 1];
  // slowSeries[0] corresponds to closes[slowPeriod - 1].
  // Align them on the same underlying close index before subtracting.
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < slowSeries.length; i++) {
    macdLine.push(fastSeries[i + offset] - slowSeries[i]);
  }

  if (macdLine.length < signalPeriod) {
    return null;
  }

  const signalSeries = emaSeries(macdLine, signalPeriod);

  const macd = macdLine[macdLine.length - 1];
  const signal = signalSeries[signalSeries.length - 1];
  const histogram = macd - signal;

  return { macd, signal, histogram };
}