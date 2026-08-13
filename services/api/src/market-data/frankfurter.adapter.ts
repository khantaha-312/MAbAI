import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

interface FrankfurterLatestResponse {
  rates: { [currency: string]: number };
}

interface FrankfurterTimeSeriesResponse {
  rates: { [date: string]: { [currency: string]: number } };
}

@Injectable()
export class FrankfurterAdapter implements MarketDataProvider {
  private readonly logger = new Logger(FrankfurterAdapter.name);
  private readonly baseUrl = 'https://api.frankfurter.app';

  // identifier format expected: "EUR" meaning USD->EUR rate
  async getPriceUsd(identifier: string): Promise<number | null> {
    const url = `${this.baseUrl}/latest?from=USD&to=${identifier}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Frankfurter returned ${response.status} for ${identifier}`);
        return null;
      }
      const data = (await response.json()) as FrankfurterLatestResponse;
      return data.rates?.[identifier] ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch Frankfurter rate for ${identifier}`, error);
      return null;
    }
  }

  async getHistoricalPricesUsd(identifier: string, days: number): Promise<PriceBarData[] | null> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const url = `${this.baseUrl}/${fmt(start)}..${fmt(end)}?from=USD&to=${identifier}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Frankfurter history returned ${response.status} for ${identifier}`);
        return null;
      }
      const data = (await response.json()) as FrankfurterTimeSeriesResponse;
      if (!data.rates) return null;
      // Frankfurter gives one rate per day, not full OHLC — same honest limitation as EIA above.
      return Object.entries(data.rates).map(([date, rateObj]) => ({
        date,
        open: rateObj[identifier],
        high: rateObj[identifier],
        low: rateObj[identifier],
        close: rateObj[identifier],
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Frankfurter history for ${identifier}`, error);
      return null;
    }
  }
}