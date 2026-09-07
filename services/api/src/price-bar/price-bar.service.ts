import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';

type BackfillableAssetType = 'equity' | 'crypto';

@Injectable()
export class PriceBarService {
  private readonly logger = new Logger(PriceBarService.name);

  // Minimum bars needed for SMA(50)/EMA(26)/MACD to be meaningful.
  // ~90 calendar days of daily bars comfortably clears this; an existing
  // Instrument with fewer bars than this is treated as "needs backfill",
  // not just "missing".
  private static readonly MIN_BARS_FOR_TECHNICAL_ANALYSIS = 55;

  // Dedupes concurrent live-backfill requests for the same symbol within
  // this process, so two users hitting a never-before-seen symbol at the
  // same moment share one fetch instead of racing two. Doesn't help across
  // multiple instances, but the Instrument/PriceBar upserts are already
  // safe if that ever happens — just wasteful, not broken.
  private readonly inFlightBackfills = new Map<
    string,
    Promise<{ instrumentId: string; barsWritten: number }>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async backfillEquityHistory(symbol: string, days: number) {
    const bars = await this.marketDataService.getEquityHistoricalPricesUsd(symbol, days);
    return this.writeBarsForInstrument(symbol, 'equity', bars);
  }

  /**
   * `ticker` must be a Binance-recognized ticker (e.g. "BTC"), NOT a
   * CoinGecko coinId (e.g. "bitcoin"). getCryptoHistoricalPricesUsd is
   * Binance-backed and takes tickers directly — there's no coinId
   * translation step, unlike the old CoinGecko-based path this method
   * was originally written against.
   */
  async backfillCryptoHistory(ticker: string, days: number) {
    const bars = await this.marketDataService.getCryptoHistoricalPricesUsd(ticker, days);
    return this.writeBarsForInstrument(ticker, 'crypto', bars);
  }

  /**
   * Ensures an Instrument for (symbol, assetType) has enough PriceBar
   * history for technical analysis, live-fetching and writing it if not.
   * This is what EvidencePackageService should call before running
   * technical analysis on equity/crypto symbols, instead of just checking
   * `!instrument` and giving up.
   */
  async ensureHistory(
    symbol: string,
    assetType: BackfillableAssetType,
    days = 90,
  ): Promise<{ instrumentId: string; barsWritten: number; freshlyBackfilled: boolean }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    if (instrument) {
      const existingBarCount = await this.prisma.priceBar.count({
        where: { instrumentId: instrument.id },
      });
      if (existingBarCount >= PriceBarService.MIN_BARS_FOR_TECHNICAL_ANALYSIS) {
        return { instrumentId: instrument.id, barsWritten: existingBarCount, freshlyBackfilled: false };
      }
      this.logger.log(
        `${symbol} (${assetType}) has only ${existingBarCount} bars — below the ` +
        `${PriceBarService.MIN_BARS_FOR_TECHNICAL_ANALYSIS} needed for reliable SMA/EMA/MACD, backfilling live`,
      );
    } else {
      this.logger.log(`No Instrument on file for ${symbol} (${assetType}) — backfilling live`);
    }

    const key = `${assetType}:${symbol}`;
    let pending = this.inFlightBackfills.get(key);
    if (!pending) {
      pending = (
        assetType === 'equity'
          ? this.backfillEquityHistory(symbol, days)
          : this.backfillCryptoHistory(symbol, days)
      ).finally(() => this.inFlightBackfills.delete(key));
      this.inFlightBackfills.set(key, pending);
    }

    const result = await pending;
    return { ...result, freshlyBackfilled: true };
  }

  private async writeBarsForInstrument(
    symbol: string,
    assetType: string,
    bars: Awaited<ReturnType<MarketDataService['getEquityHistoricalPricesUsd']>>,
  ): Promise<{ instrumentId: string; barsWritten: number }> {
    const instrument = await this.prisma.instrument.upsert({
      where: { symbol_assetType: { symbol, assetType } },
      update: {},
      create: { symbol, assetType, name: symbol },
    });

    if (!bars || bars.length === 0) {
      this.logger.warn(`No historical bars returned for ${symbol} (${assetType}) — nothing written`);
      return { instrumentId: instrument.id, barsWritten: 0 };
    }

    let written = 0;
    for (const bar of bars) {
      await this.prisma.priceBar.upsert({
        where: {
          instrumentId_timestamp: { instrumentId: instrument.id, timestamp: new Date(bar.date) },
        },
        update: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume ?? 0 },
        create: {
          instrumentId: instrument.id,
          timestamp: new Date(bar.date),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume ?? 0,
        },
      });
      written++;
    }

    this.logger.log(`Backfilled ${written} bars for ${symbol} (${assetType})`);
    return { instrumentId: instrument.id, barsWritten: written };
  }
}