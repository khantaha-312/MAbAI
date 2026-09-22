import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider } from './market-data-provider.interface';
import { fetchWithBackoff } from './fetch-with-backoff.util';

/**
 * Six-category breakdown of Finnhub fundamentals.
 * Every field is nullable — Finnhub does not guarantee complete data for
 * every symbol (e.g. raw.epsGrowth5Y and raw.netMarginGrowth5Y were null
 * for DIS).  The UI must render "N/A" for null values, never crash.
 */
export interface EquityFundamentalCategories {
  valuation: {
    peRatio: number | null;
    forwardPE: number | null;
    peg: number | null;
    ps: number | null;
    evEbitda: number | null;
    priceToBook: number | null;
    dividendYield: number | null;
  };
  growth: {
    revenueGrowthTTM: number | null;
    revenueGrowth3Y: number | null;
    revenueGrowth5Y: number | null;
    epsGrowthTTM: number | null;
    epsGrowth3Y: number | null;
  };
  profitability: {
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    roe: number | null;
    roa: number | null;
    roi: number | null;
  };
  financialHealth: {
    debtToEquity: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
  };
  cashFlow: {
    cashFlowPerShare: number | null;
    pfcfShare: number | null;
    evFreeCashFlow: number | null;
  };
  shareholderReturns: {
    dividendPerShare: number | null;
    payoutRatio: number | null;
    dividendGrowth5Y: number | null;
  };
}

export interface FinnhubFundamentals {
  /** Lineage tag — bump when the mapping logic changes. */
  calculationVersion: 'equity-fa-v2';
  /** Full unmodified Finnhub metric response — returned so field names can be verified against reality. */
  raw: Record<string, unknown>;

  // ── Backward-compatible flat fields (kept for existing consumers) ──
  peRatio: number | null;
  eps: number | null;
  marketCapitalization: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;

  // ── Structured six-category breakdown ──
  categories: EquityFundamentalCategories;
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
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Finnhub price fetch for ${symbol}`,
        },
      );
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
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Finnhub fundamentals fetch for ${symbol}`,
        },
      );
      const data = (await response.json()) as { metric?: Record<string, unknown> };

      if (!data.metric || Object.keys(data.metric).length === 0) {
        this.logger.warn(`Finnhub metric endpoint returned no fundamentals for ${symbol}`);
        return null;
      }

      // LOGGED DELIBERATELY: field names below are mapped from Finnhub's
      // /stock/metric?metric=all response.  Check this log against the
      // mapped fields below and correct any mismatch before trusting.
      this.logger.debug(`Raw Finnhub metric response for ${symbol}: ${JSON.stringify(data.metric)}`);

      const m = data.metric;
      const toNumberOrNull = (val: unknown): number | null =>
        typeof val === 'number' && !Number.isNaN(val) ? val : null;

      // ── Backward-compatible flat fields ──
      const peRatio = toNumberOrNull(m['peBasicExclExtraTTM']);
      const eps = toNumberOrNull(m['epsBasicExclExtraItemsTTM']);
      const marketCapitalization = toNumberOrNull(m['marketCapitalization']);
      const profitMargin = toNumberOrNull(m['netProfitMarginTTM']);
      const revenueGrowth = toNumberOrNull(m['revenueGrowthTTMYoy']);

      // ── Six-category structured breakdown ──
      // Field names mirror Finnhub's /stock/metric?metric=all keys.
      // Any field that Finnhub returns as null (e.g. epsGrowth5Y, netMarginGrowth5Y
      // for DIS) will propagate as null here — the UI renders "N/A", not a crash.
            // ── Six-category structured breakdown ──
      // Field names mirror Finnhub's /stock/metric?metric=all keys.
      // Any field that Finnhub returns as null (e.g. epsGrowth5Y, netMarginGrowth5Y
      // for DIS) will propagate as null here — the UI renders "N/A", not a crash.
      const categories: EquityFundamentalCategories = {
        valuation: {
          peRatio,
          forwardPE: toNumberOrNull(m['forwardPE']),
          peg: toNumberOrNull(m['pegTTM']),
          ps: toNumberOrNull(m['psTTM']),
          evEbitda: toNumberOrNull(m['evEbitdaTTM']),
          // Fix: Use Quarterly (current-value convention), fallback to Annual if Quarterly is missing
          priceToBook: toNumberOrNull(m['pbQuarterly']) ?? toNumberOrNull(m['pbAnnual']),
          // Fix: Corrected key mapping
          dividendYield: toNumberOrNull(m['currentDividendYieldTTM']),
        },
        growth: {
          revenueGrowthTTM: revenueGrowth,
          revenueGrowth3Y: toNumberOrNull(m['revenueGrowth3Y']),
          revenueGrowth5Y: toNumberOrNull(m['revenueGrowth5Y']),
          // Finnhub's TTM growth keys carry a "Yoy" suffix (like revenueGrowthTTMYoy
          // above) — reading plain 'epsGrowthTTM' yields null.
          epsGrowthTTM: toNumberOrNull(m['epsGrowthTTMYoy']),
          epsGrowth3Y: toNumberOrNull(m['epsGrowth3Y']),
        },
        profitability: {
          grossMargin: toNumberOrNull(m['grossMarginTTM']),
          operatingMargin: toNumberOrNull(m['operatingMarginTTM']),
          netMargin: profitMargin, // same source as flat field
          roe: toNumberOrNull(m['roeTTM']),
          roa: toNumberOrNull(m['roaTTM']),
          roi: toNumberOrNull(m['roiTTM']),
        },
        financialHealth: {
          // Finnhub has no TTM variants for these ratios — only Quarterly and
          // Annual series.  Prefer Quarterly (most current), fall back to Annual.
          debtToEquity:
            toNumberOrNull(m['longTermDebt/equityQuarterly']) ??
            toNumberOrNull(m['longTermDebt/equityAnnual']),
          currentRatio:
            toNumberOrNull(m['currentRatioQuarterly']) ??
            toNumberOrNull(m['currentRatioAnnual']),
          quickRatio:
            toNumberOrNull(m['quickRatioQuarterly']) ??
            toNumberOrNull(m['quickRatioAnnual']),
        },
        cashFlow: {
          cashFlowPerShare: toNumberOrNull(m['cashFlowPerShareTTM']),
          pfcfShare: toNumberOrNull(m['pfcfShareTTM']),
          // Fix: Corrected key mapping (includes slash)
          evFreeCashFlow: toNumberOrNull(m['currentEv/freeCashFlowTTM']),
        },
        shareholderReturns: {
          dividendPerShare: toNumberOrNull(m['dividendPerShareTTM']),
          payoutRatio: toNumberOrNull(m['payoutRatioTTM']),
          // Fix: Corrected key mapping; negative values (-11.07) pass through toNumberOrNull correctly
          dividendGrowth5Y: toNumberOrNull(m['dividendGrowthRate5Y']),
        },
      };

      return {
        calculationVersion: 'equity-fa-v2' as const,
        raw: m,
        peRatio,
        eps,
        marketCapitalization,
        profitMargin,
        revenueGrowth,
        categories,
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
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Finnhub company-news fetch for ${symbol}`,
        },
      );
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
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Finnhub search for "${query}"`,
        },
      );
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
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Finnhub symbol list fetch`,
        },
      );
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