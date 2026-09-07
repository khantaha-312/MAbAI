import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider } from './market-data-provider.interface';

export interface FinnhubFundamentals {
  raw: Record<string, unknown>; // full unmodified response — logged/returned so field names can be verified against reality
  peRatio: number | null;
  eps: number | null;
  marketCapitalization: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
}

export interface FinnhubSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface FinnhubSymbolListItem {
  currency: string;
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
  mic: string;
}

export interface FinnhubNewsItem {
  headline: string;
  source: string;
  datetime: number; // unix seconds
  url: string;
  summary: string;
  category: string;
}

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

  async getFundamentals(symbol: string): Promise<FinnhubFundamentals | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Finnhub metric endpoint returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as { metric?: Record<string, unknown> };

      if (!data.metric || Object.keys(data.metric).length === 0) {
        this.logger.warn(`Finnhub metric endpoint returned no fundamentals for ${symbol}`);
        return null;
      }

      // LOGGED DELIBERATELY: field names below are my best knowledge of
      // Finnhub's real schema, not independently verified against a live
      // call from this codebase. Check this log against the mapped fields
      // below and correct any mismatch before trusting this data.
      this.logger.debug(`Raw Finnhub metric response for ${symbol}: ${JSON.stringify(data.metric)}`);

      const m = data.metric;
      const toNumberOrNull = (val: unknown): number | null =>
        typeof val === 'number' && !Number.isNaN(val) ? val : null;

      return {
        raw: m,
        peRatio: toNumberOrNull(m['peBasicExclExtraTTM']),
        eps: toNumberOrNull(m['epsBasicExclExtraItemsTTM']),
        marketCapitalization: toNumberOrNull(m['marketCapitalization']),
        profitMargin: toNumberOrNull(m['netProfitMarginTTM']),
        revenueGrowth: toNumberOrNull(m['revenueGrowthTTMYoy']),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Finnhub fundamentals for ${symbol}`, error);
      return null;
    }
  }

  async getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<FinnhubNewsItem[] | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Finnhub company-news returned ${response.status} for ${symbol}`);
        return null;
      }
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) {
        this.logger.warn(`Finnhub company-news returned unexpected shape for ${symbol}`);
        return null;
      }
      this.logger.debug(`Raw Finnhub news response for ${symbol} (first item): ${JSON.stringify(data[0])}`);
      return data as FinnhubNewsItem[];
    } catch (error) {
      this.logger.error(`Failed to fetch Finnhub news for ${symbol}`, error);
      return null;
    }
  }
    async searchSymbols(query: string): Promise<FinnhubSearchResult[] | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Finnhub search returned ${response.status} for "${query}"`);
        return null;
      }
      const data = (await response.json()) as { count: number; result: FinnhubSearchResult[] };
      return Array.isArray(data.result) ? data.result : [];
    } catch (error) {
      this.logger.error(`Failed to search Finnhub for "${query}"`, error);
      return null;
    }
  }

  async listUsSymbols(): Promise<FinnhubSymbolListItem[] | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY is not set');
      return null;
    }
    const url = `${this.baseUrl}/stock/symbol?exchange=US&token=${apiKey}`;
    try {
      const response = await fetch(url); // fetch() follows redirects by default, unlike your curl.exe run
      if (!response.ok) {
        this.logger.warn(`Finnhub symbol list returned ${response.status}`);
        return null;
      }
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) {
        this.logger.warn('Finnhub symbol list returned unexpected shape');
        return null;
      }
      return data as FinnhubSymbolListItem[];
    } catch (error) {
      this.logger.error('Failed to fetch Finnhub US symbol list', error);
      return null;
    }
  }
}