import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

interface AlphaVantageDailyResponse {
  'Time Series (Daily)'?: {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
  'Error Message'?: string;
  Note?: string;
}

@Injectable()
export class AlphaVantageAdapter implements MarketDataProvider {
  private readonly logger = new Logger(AlphaVantageAdapter.name);
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  private async fetchDaily(symbol: string): Promise<AlphaVantageDailyResponse | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      this.logger.error('ALPHA_VANTAGE_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Alpha Vantage returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as AlphaVantageDailyResponse;
      if (data.Note) {
        this.logger.warn(`Alpha Vantage rate limit hit: ${data.Note}`);
        return null;
      }
      if (data['Error Message'] || !data['Time Series (Daily)']) {
        this.logger.warn(`Alpha Vantage returned no data for ${symbol}`);
        return null;
      }
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch Alpha Vantage data for ${symbol}`, error);
      return null;
    }
  }

  async getPriceUsd(symbol: string): Promise<number | null> {
    const data = await this.fetchDaily(symbol);
    const series = data?.['Time Series (Daily)'];
    if (!series) return null;
    const latestDate = Object.keys(series).sort().reverse()[0];
    const latestClose = series[latestDate]?.['4. close'];
    return latestClose ? parseFloat(latestClose) : null;
  }

  async getHistoricalPricesUsd(symbol: string, days: number): Promise<PriceBarData[] | null> {
    const data = await this.fetchDaily(symbol);
    const series = data?.['Time Series (Daily)'];
    if (!series) return null;
    return Object.entries(series)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, days)
      .map(([date, bar]) => ({
        date,
        open: parseFloat(bar['1. open']),
        high: parseFloat(bar['2. high']),
        low: parseFloat(bar['3. low']),
        close: parseFloat(bar['4. close']),
        volume: parseFloat(bar['5. volume']),
      }));
  }
}