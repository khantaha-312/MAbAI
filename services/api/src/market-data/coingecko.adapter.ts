import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

interface CoinGeckoPriceResponse {
  [coinId: string]: { usd: number };
}

// CoinGecko's free/demo /ohlc endpoint only accepts these exact day values.
const ALLOWED_DAYS = [1, 7, 14, 30, 90, 180];

function snapToAllowedDays(requested: number): number {
  return ALLOWED_DAYS.find((d) => d >= requested) ?? 180;
}

@Injectable()
export class CoinGeckoAdapter implements MarketDataProvider {
  private readonly logger = new Logger(CoinGeckoAdapter.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  async getPriceUsd(coinId: string): Promise<number | null> {
    const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`CoinGecko returned ${response.status} for ${coinId}`);
        return null;
      }
      const data = (await response.json()) as CoinGeckoPriceResponse;
      return data[coinId]?.usd ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch CoinGecko price for ${coinId}`, error);
      return null;
    }
  }

  // No volume — CoinGecko's free /ohlc endpoint doesn't include it.
  async getHistoricalPricesUsd(coinId: string, days: number): Promise<PriceBarData[] | null> {
    const snappedDays = snapToAllowedDays(days);
    const url = `${this.baseUrl}/coins/${coinId}/ohlc?vs_currency=usd&days=${snappedDays}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`CoinGecko OHLC returned ${response.status} for ${coinId}`);
        return null;
      }
      const data = (await response.json()) as number[][];
      
      return data.map(([timestampMs, open, high, low, close]) => ({
        // Retain full ISO timestamp (e.g. 2026-08-11T16:00:00.000Z).
        // Note: Free tier auto-selects finer granularity for smaller day ranges (e.g., 4-hour bars for 7-day range).
        // Preserving full ISO string prevents multiple intraday bars from overwriting each other on upsert.
        date: new Date(timestampMs).toISOString(),
        open,
        high,
        low,
        close,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch CoinGecko OHLC for ${coinId}`, error);
      return null;
    }
  }
}