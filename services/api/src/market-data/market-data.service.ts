import { Inject, Injectable } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';
import { FinnhubAdapter, type FinnhubFundamentals, type FinnhubNewsItem } from './finnhub.adapter';
import { CoinGeckoAdapter, type CoinGeckoTokenomicsData } from './coingecko.adapter'; // <--- FIXED HERE
import { AlphaVantageAdapter, type AlphaVantageSentimentItem } from './alphavantage.adapter';
import { MarketDataCacheService } from './market-data-cache.service';
import {
  COINGECKO_PROVIDER,
  BINANCE_PROVIDER,
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
    @Inject(BINANCE_PROVIDER) private readonly cryptoHistoricalProvider: MarketDataProvider,
    @Inject(FINNHUB_PROVIDER) private readonly equityProvider: MarketDataProvider,
    @Inject(ALPHA_VANTAGE_PROVIDER) private readonly equityHistoricalProvider: MarketDataProvider,
    @Inject(EIA_PROVIDER) private readonly oilProvider: MarketDataProvider,
    @Inject(GOLD_API_PROVIDER) private readonly metalsProvider: MarketDataProvider,
    @Inject(FRANKFURTER_PROVIDER) private readonly forexProvider: MarketDataProvider,
    private readonly finnhubAdapter: FinnhubAdapter,
    private readonly alphaVantageAdapter: AlphaVantageAdapter,
    private readonly coinGeckoAdapter: CoinGeckoAdapter,
    private readonly cacheService: MarketDataCacheService,
  ) {}

  async getCryptoPriceUsd(coinId: string): Promise<number | null> {
    return this.cacheService.get(
      `crypto:price:${coinId}`,
      () => this.cryptoProvider.getPriceUsd(coinId),
      30000, // 30 seconds TTL for crypto prices
    );
  }

  async getEquityPriceUsd(symbol: string): Promise<number | null> {
    return this.cacheService.get(
      `equity:price:${symbol}`,
      () => this.equityProvider.getPriceUsd(symbol),
      30000, // 30 seconds TTL for equity prices
    );
  }

  async getEquityFundamentals(symbol: string): Promise<FinnhubFundamentals | null> {
    return this.finnhubAdapter.getFundamentals(symbol);
  }

  async getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<FinnhubNewsItem[] | null> {
    return this.finnhubAdapter.getCompanyNews(symbol, fromDate, toDate);
  }

  async getNewsSentiment(symbol: string): Promise<AlphaVantageSentimentItem[] | null> {
    return this.cacheService.get(
      `sentiment:${symbol}`,
      () => this.alphaVantageAdapter.getNewsSentiment(symbol),
      21600000, // 6 hours TTL (21,600,000 ms) to protect Alpha Vantage quota while keeping data reasonably fresh
    );
  }

  async getEquityHistoricalPricesUsd(symbol: string, days: number): Promise<PriceBarData[] | null> {
    return this.equityHistoricalProvider.getHistoricalPricesUsd?.(symbol, days) ?? null;
  }

  async getOilPriceUsd(identifier: 'WTI' | 'BRENT'): Promise<number | null> {
    return this.cacheService.get(
      `oil:price:${identifier}`,
      () => this.oilProvider.getPriceUsd(identifier),
      60000, // 1 minute TTL for oil prices
    );
  }

  async getMetalPriceUsd(symbol: string): Promise<number | null> {
    return this.cacheService.get(
      `metal:price:${symbol}`,
      () => this.metalsProvider.getPriceUsd(symbol),
      60000, // 1 minute TTL for metal prices
    );
  }

  async getForexRate(currencyCode: string): Promise<number | null> {
    return this.cacheService.get(
      `forex:rate:${currencyCode}`,
      () => this.forexProvider.getPriceUsd(currencyCode),
      30000, // 30 seconds TTL for forex rates
    );
  }

  async getCryptoHistoricalPricesUsd(ticker: string, days: number): Promise<PriceBarData[] | null> {
    return this.cryptoHistoricalProvider.getHistoricalPricesUsd?.(ticker, days) ?? null;
  }

  async searchEquitySymbols(query: string) {
    return this.finnhubAdapter.searchSymbols(query);
  }

  async listUsEquitySymbols() {
    return this.finnhubAdapter.listUsSymbols();
  }

  async searchCryptoSymbols(query: string) {
    return this.coinGeckoAdapter.searchCoins(query);
  }
   async getCryptoTokenomics(symbol: string): Promise<CoinGeckoTokenomicsData | null> {
    return this.cacheService.get(
      `crypto:tokenomics:${symbol}`,
      () => this.coinGeckoAdapter.getTokenomics(symbol),
      3600000, // 1 hour TTL (3,600,000 ms) to protect API budget
    );
  }
}