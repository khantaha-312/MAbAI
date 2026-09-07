import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

type BinanceKline = [
  number, // open time (ms)
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // close time (ms)
  string, // quote asset volume
  number, // number of trades
  string, // taker buy base volume
  string, // taker buy quote volume
  string, // ignore
];

// Ticker -> Binance trading pair override, for cases where the naive
// `${TICKER}USDT` guess isn't correct. Empty for now — BTC/ETH/SOL and
// other majors all trade directly against USDT on Binance.
const PAIR_OVERRIDES: Record<string, string> = {};

function toBinancePair(ticker: string): string {
  const upper = ticker.toUpperCase();
  return PAIR_OVERRIDES[upper] ?? `${upper}USDT`;
}

@Injectable()
export class BinanceAdapter implements MarketDataProvider {
  private readonly logger = new Logger(BinanceAdapter.name);
  private readonly baseUrl = 'https://api.binance.com/api/v3';

  async getPriceUsd(ticker: string): Promise<number | null> {
    const pair = toBinancePair(ticker);
    const url = `${this.baseUrl}/ticker/price?symbol=${pair}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Binance returned ${response.status} for ${ticker} (${pair})`);
        return null;
      }
      const data = (await response.json()) as { price?: string };
      const price = data.price ? Number(data.price) : null;
      return price !== null && Number.isFinite(price) ? price : null;
    } catch (error) {
      this.logger.error(`Failed to fetch Binance price for ${ticker} (${pair})`, error);
      return null;
    }
  }

  async getHistoricalPricesUsd(ticker: string, days: number): Promise<PriceBarData[] | null> {
    const pair = toBinancePair(ticker);
    const limit = Math.min(Math.max(days, 1), 1000);
    const url = `${this.baseUrl}/klines?symbol=${pair}&interval=1d&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Binance klines returned ${response.status} for ${ticker} (${pair})`);
        return null;
      }
      const data = (await response.json()) as BinanceKline[];

      if (!Array.isArray(data) || data.length === 0) {
        this.logger.warn(`Binance klines returned no candles for ${ticker} (${pair})`);
        return null;
      }

      return data.map((k) => ({
        date: new Date(k[0]).toISOString(),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Binance klines for ${ticker} (${pair})`, error);
      return null;
    }
  }
}