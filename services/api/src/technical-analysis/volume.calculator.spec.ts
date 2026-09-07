import { analyzeVolume, VolumeBarInput } from './volume.calculator';

describe('analyzeVolume', () => {
  it('returns null when there is not enough data', () => {
    const bars: VolumeBarInput[] = Array.from({ length: 10 }, () => ({ volume: 1000000 }));
    expect(analyzeVolume(bars, 20)).toBeNull();
  });

  it('flags a real volume spike as well_above_average', () => {
    const bars: VolumeBarInput[] = Array.from({ length: 21 }, () => ({ volume: 1000000 }));
    bars[20].volume = 2200000; // 2.2x the prior 20-bar average
    const result = analyzeVolume(bars, 20)!;

    expect(result.relativeVolume).toBeCloseTo(2.2, 5);
    expect(result.interpretation).toBe('well_above_average');
  });

  it('reads exactly average when volume matches the recent baseline', () => {
    const bars: VolumeBarInput[] = Array.from({ length: 21 }, () => ({ volume: 1000000 }));
    const result = analyzeVolume(bars, 20)!;

    expect(result.relativeVolume).toBe(1);
    expect(result.interpretation).toBe('average');
  });

  it('flags a real volume drop as below_average', () => {
    const bars: VolumeBarInput[] = Array.from({ length: 21 }, () => ({ volume: 1000000 }));
    bars[20].volume = 300000; // 0.3x the prior average
    const result = analyzeVolume(bars, 20)!;

    expect(result.relativeVolume).toBeCloseTo(0.3, 5);
    expect(result.interpretation).toBe('well_below_average');
  });

  it('excludes the current bar from its own baseline average', () => {
    // If the current bar were included in its own average, a huge spike
    // would partly average itself away. Confirm it doesn't.
    const bars: VolumeBarInput[] = Array.from({ length: 21 }, () => ({ volume: 100 }));
    bars[20].volume = 10000;
    const result = analyzeVolume(bars, 20)!;

    expect(result.avgVolume).toBe(100); // NOT inflated by including the spike bar itself
  });
});