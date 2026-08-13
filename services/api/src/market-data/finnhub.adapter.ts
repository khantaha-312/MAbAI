import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider } from './market-data-provider.interface';

interface FinnhubQuoteResponse {
  c: number;
  pc: number;
}

@Injectable()
export class FinnhubAdapter implements MarketDataProvider {
  private readonly logger = new Logger(FinnhubAdapter.name);
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  async getPriceUsd(symbol: string): Promise<number | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}/quote?symbol=${symbol}&token=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Finnhub returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as FinnhubQuoteResponse;
      return data.c > 0 ? data.c : null;
    } catch (error) {
      this.logger.error(`Failed to fetch Finnhub price for ${symbol}`, error);
      return null;
    }
  }
}