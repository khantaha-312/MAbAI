import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

interface GoldApiPriceResponse {
  price: number;
}

interface GoldApiOhlcResponse {
  open: number;
  high: number;
  low: number;
  close: number;
  startTimestamp: number;
  endTimestamp: number;
}

@Injectable()
export class GoldApiAdapter implements MarketDataProvider {
  private readonly logger = new Logger(GoldApiAdapter.name);
  private readonly baseUrl = 'https://api.gold-api.com';

  async getPriceUsd(symbol: string): Promise<number | null> {
    const url = `${this.baseUrl}/price/${symbol}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Gold-API returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as GoldApiPriceResponse;
      return data.price ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch Gold-API price for ${symbol}`, error);
      return null;
    }
  }

  async getHistoricalPricesUsd(symbol: string, days: number): Promise<PriceBarData[] | null> {
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) {
      this.logger.error('GOLD_API_KEY is not set');
      return null;
    }
    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - days * 86400;
    const url = `${this.baseUrl}/ohlc/${symbol}?startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`;
    try {
      const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
      if (!response.ok) {
        this.logger.warn(`Gold-API OHLC returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as GoldApiOhlcResponse;
      // Note: this endpoint returns ONE aggregated bar for the whole range, not daily bars.
      // Fine for a single "range summary," not a day-by-day chart — flag before wiring into a chart UI.
      return [
        {
          date: new Date(data.endTimestamp * 1000).toISOString().split('T')[0],
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to fetch Gold-API OHLC for ${symbol}`, error);
      return null;
    }
  }
}