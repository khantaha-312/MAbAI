import { Injectable, Logger } from '@nestjs/common';

interface CoinGeckoPriceResponse {
  [coinId: string]: { usd: number };
}

interface FinnhubQuoteResponse {
  c: number;
  pc: number;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly coinGeckoBaseUrl = 'https://api.coingecko.com/api/v3';
  private readonly finnhubBaseUrl = 'https://finnhub.io/api/v1';

  async getCryptoPriceUsd(coinId: string): Promise<number | null> {
    const url = `${this.coinGeckoBaseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;

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

  async getEquityPriceUsd(symbol: string): Promise<number | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }

    const url = `${this.finnhubBaseUrl}/quote?symbol=${symbol}&token=${apiKey}`;

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