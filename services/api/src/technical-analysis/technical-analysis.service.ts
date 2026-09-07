import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateRsi } from './rsi.calculator';
import { calculateSma } from './sma.calculator';
import { calculateEma } from './ema.calculator';
import { calculateMacd } from './macd.calculator';
import { calculateBollinger } from './bollinger.calculator';
import { calculateAtr } from './atr.calculator';
import { analyzeVolume } from './volume.calculator';
import { determineTrend } from './trend.calculator';



@Injectable()
export class TechnicalAnalysisService {
  private readonly logger = new Logger(TechnicalAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRsi(
    symbol: string,
    assetType: string,
    period = 14,
  ): Promise<{ rsi: number | null; barsUsed: number; instrumentId: string | null }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return { rsi: null, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));
    const rsi = calculateRsi(closes, period);

    return { rsi, barsUsed: closes.length, instrumentId: instrument.id };
  }
  async getSmaSet(
    symbol: string,
    assetType: string,
    periods: number[] = [20, 50, 100, 200],
  ): Promise<{
    sma: Record<number, number | null>;
    barsUsed: number;
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      const empty: Record<number, number | null> = {};
      periods.forEach((p) => (empty[p] = null));
      return { sma: empty, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));

    const sma: Record<number, number | null> = {};
    for (const period of periods) {
      sma[period] = calculateSma(closes, period);
    }

    return { sma, barsUsed: closes.length, instrumentId: instrument.id };
  }
  async getEmaSet(
    symbol: string,
    assetType: string,
    periods: number[] = [12, 26, 50, 200],
  ): Promise<{
    ema: Record<number, number | null>;
    barsUsed: number;
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      const empty: Record<number, number | null> = {};
      periods.forEach((p) => (empty[p] = null));
      return { ema: empty, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));

    const ema: Record<number, number | null> = {};
    for (const period of periods) {
      ema[period] = calculateEma(closes, period);
    }

    return { ema, barsUsed: closes.length, instrumentId: instrument.id };
  }
  async getMacd(
    symbol: string,
    assetType: string,
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): Promise<{
    macd: { macd: number; signal: number; histogram: number } | null;
    barsUsed: number;
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return { macd: null, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));
    const macd = calculateMacd(closes, fastPeriod, slowPeriod, signalPeriod);

    return { macd, barsUsed: closes.length, instrumentId: instrument.id };
  }
  async getBollinger(
    symbol: string,
    assetType: string,
    period = 20,
    stdDevMultiplier = 2,
  ): Promise<{
    bollinger: { middle: number; upper: number; lower: number; percentB: number | null; bandWidth: number } | null;
    barsUsed: number;
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return { bollinger: null, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));
    const bollinger = calculateBollinger(closes, period, stdDevMultiplier);

    return { bollinger, barsUsed: closes.length, instrumentId: instrument.id };
  }
  async getAtr(
    symbol: string,
    assetType: string,
    period = 14,
  ): Promise<{ atr: number | null; barsUsed: number; instrumentId: string | null }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return { atr: null, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    // ATR needs high/low/close, unlike RSI/SMA/EMA/MACD/Bollinger which only use close.
    const atrInput = bars.map((b) => ({
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
    }));
    const atr = calculateAtr(atrInput, period);

    return { atr, barsUsed: bars.length, instrumentId: instrument.id };
  }
  async getVolumeAnalysis(
    symbol: string,
    assetType: string,
    period = 20,
  ): Promise<{
    volume: {
      currentVolume: number;
      avgVolume: number;
      relativeVolume: number | null;
      interpretation: string;
    } | null;
    barsUsed: number;
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return { volume: null, barsUsed: 0, instrumentId: null };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const volumeInput = bars.map((b) => ({ volume: Number(b.volume) }));
    const volume = analyzeVolume(volumeInput, period);

    return { volume, barsUsed: bars.length, instrumentId: instrument.id };
  }
  async getTrend(
    symbol: string,
    assetType: string,
  ): Promise<{
    trend: {
      direction: string;
      strength: number | null;
      signals: string[];
      evidenceCount: number;
      reason?: string;
    };
    instrumentId: string | null;
  }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (!instrument) {
      this.logger.warn(`No instrument found for ${symbol} (${assetType}) — backfill it first`);
      return {
        trend: { direction: 'insufficient_evidence', strength: null, signals: [], evidenceCount: 0, reason: 'Instrument not found' },
        instrumentId: null,
      };
    }

    const bars = await this.prisma.priceBar.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { timestamp: 'asc' },
    });

    const closes = bars.map((b) => Number(b.close));
    const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;

    if (currentPrice === null) {
      return {
        trend: { direction: 'insufficient_evidence', strength: null, signals: [], evidenceCount: 0, reason: 'No price data available' },
        instrumentId: instrument.id,
      };
    }

    // Reuse the same calculators already built — no duplicated logic.
    const smaSet = await this.getSmaSet(symbol, assetType, [20, 50]);
    const macdResult = await this.getMacd(symbol, assetType);
    const rsiResult = await this.getRsi(symbol, assetType);

    const trend = determineTrend({
      sma20: smaSet.sma[20],
      sma50: smaSet.sma[50],
      macdHistogram: macdResult.macd?.histogram ?? null,
      rsi: rsiResult.rsi,
      price: currentPrice,
    });

    return { trend, instrumentId: instrument.id };
  }
  async getAggregate(
    symbol: string,
    assetType: string,
  ): Promise<{
    symbol: string;
    assetType: string;
    instrumentId: string | null;
    barsUsed: number;
    rsi: Awaited<ReturnType<TechnicalAnalysisService['getRsi']>>;
    sma: Awaited<ReturnType<TechnicalAnalysisService['getSmaSet']>>;
    ema: Awaited<ReturnType<TechnicalAnalysisService['getEmaSet']>>;
    macd: Awaited<ReturnType<TechnicalAnalysisService['getMacd']>>;
    bollinger: Awaited<ReturnType<TechnicalAnalysisService['getBollinger']>>;
    atr: Awaited<ReturnType<TechnicalAnalysisService['getAtr']>>;
    volume: Awaited<ReturnType<TechnicalAnalysisService['getVolumeAnalysis']>>;
    trend: Awaited<ReturnType<TechnicalAnalysisService['getTrend']>>;
  }> {
    // Run all 8 in parallel — each one already does its own instrument/bar
    // lookup independently, so this is N separate DB round-trips rather than
    // one shared fetch. Flagged as a real optimization opportunity (§15,
    // caching/precompute) for later, not fixed now — correctness first,
    // performance pass comes after the engine is feature-complete.
    const [rsi, sma, ema, macd, bollinger, atr, volume, trend] = await Promise.all([
      this.getRsi(symbol, assetType),
      this.getSmaSet(symbol, assetType),
      this.getEmaSet(symbol, assetType),
      this.getMacd(symbol, assetType),
      this.getBollinger(symbol, assetType),
      this.getAtr(symbol, assetType),
      this.getVolumeAnalysis(symbol, assetType),
      this.getTrend(symbol, assetType),
    ]);

    return {
      symbol,
      assetType,
      instrumentId: rsi.instrumentId,
      barsUsed: rsi.barsUsed,
      rsi,
      sma,
      ema,
      macd,
      bollinger,
      atr,
      volume,
      trend,
    };
  }

}
