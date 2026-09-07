/**
 * Volume analysis: compares the most recent bar's volume against the
 * average volume of the `period` bars immediately preceding it (current
 * bar excluded from its own baseline, so "today vs. the recent normal").
 * bars must be in ascending chronological order.
 * Returns null if there isn't enough data (need at least period + 1 bars).
 */
export interface VolumeBarInput {
  volume: number;
}

export interface VolumeResult {
  currentVolume: number;
  avgVolume: number;
  // null only in the degenerate case where avgVolume is 0 (division by zero)
  relativeVolume: number | null;
  interpretation:
    | 'well_above_average'
    | 'above_average'
    | 'average'
    | 'below_average'
    | 'well_below_average'
    | 'unknown';
}

export function analyzeVolume(bars: VolumeBarInput[], period = 20): VolumeResult | null {
  if (bars.length < period + 1) {
    return null;
  }

  const currentVolume = bars[bars.length - 1].volume;
  const priorWindow = bars.slice(bars.length - 1 - period, bars.length - 1);
  const avgVolume = priorWindow.reduce((acc, b) => acc + b.volume, 0) / period;

  const relativeVolume = avgVolume === 0 ? null : currentVolume / avgVolume;

  let interpretation: VolumeResult['interpretation'];
  if (relativeVolume === null) interpretation = 'unknown';
  else if (relativeVolume >= 1.5) interpretation = 'well_above_average';
  else if (relativeVolume >= 1.1) interpretation = 'above_average';
  else if (relativeVolume >= 0.9) interpretation = 'average';
  else if (relativeVolume >= 0.5) interpretation = 'below_average';
  else interpretation = 'well_below_average';

  return { currentVolume, avgVolume, relativeVolume, interpretation };
}