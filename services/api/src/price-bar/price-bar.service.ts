import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';

@Injectable()
export class PriceBarService {
  private readonly logger = new Logger(PriceBarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async backfillEquityHistory(symbol: string, days: number) {
    const bars = await this.marketDataService.getEquityHistoricalPricesUsd(symbol, days);
    return this.writeBarsForInstrument(symbol, 'equity', bars);
  }

  /**
   * symbol here MUST be a CoinGecko coin ID (e.g. "bitcoin"), not a ticker
   * (e.g. "BTC") — same mapping gap flagged elsewhere in this project.
   * SymbolMapping table exists for this but isn't wired in yet.
   */
  async backfillCryptoHistory(coinId: string, days: number) {
    const bars = await this.marketDataService.getCryptoHistoricalPricesUsd(coinId, days);
    return this.writeBarsForInstrument(coinId, 'crypto', bars);
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
          instrumentId_timestamp: {
            instrumentId: instrument.id,
            timestamp: new Date(bar.date),
          },
        },
        update: {
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume ?? 0,
        },
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