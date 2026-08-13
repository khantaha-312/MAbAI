import { Inject, Injectable } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';
import {
  COINGECKO_PROVIDER,
  FINNHUB_PROVIDER,
  ALPHA_VANTAGE_PROVIDER,
  EIA_PROVIDER,
  GOLD_API_PROVIDER,
  FRANKFURTER_PROVIDER,
} from './market-data-provider.interface';

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(COINGECKO_PROVIDER) private readonly cryptoProvider: MarketDataProvider,
    @Inject(FINNHUB_PROVIDER) private readonly equityProvider: MarketDataProvider,
    @Inject(ALPHA_VANTAGE_PROVIDER) private readonly equityHistoricalProvider: MarketDataProvider,
    @Inject(EIA_PROVIDER) private readonly oilProvider: MarketDataProvider,
    @Inject(GOLD_API_PROVIDER) private readonly metalsProvider: MarketDataProvider,
    @Inject(FRANKFURTER_PROVIDER) private readonly forexProvider: MarketDataProvider,
  ) {}

  async getCryptoPriceUsd(coinId: string): Promise<number | null> {
    return this.cryptoProvider.getPriceUsd(coinId);
  }

  async getEquityPriceUsd(symbol: string): Promise<number | null> {
    return this.equityProvider.getPriceUsd(symbol);
  }

  async getEquityHistoricalPricesUsd(symbol: string, days: number): Promise<PriceBarData[] | null> {
    return this.equityHistoricalProvider.getHistoricalPricesUsd?.(symbol, days) ?? null;
  }

  async getOilPriceUsd(identifier: 'WTI' | 'BRENT'): Promise<number | null> {
    return this.oilProvider.getPriceUsd(identifier);
  }

  async getMetalPriceUsd(symbol: string): Promise<number | null> {
    return this.metalsProvider.getPriceUsd(symbol);
  }

  async getForexRate(currencyCode: string): Promise<number | null> {
    return this.forexProvider.getPriceUsd(currencyCode);
  }
    async getCryptoHistoricalPricesUsd(coinId: string, days: number): Promise<PriceBarData[] | null> {
    return this.cryptoProvider.getHistoricalPricesUsd?.(coinId, days) ?? null;
  }
}