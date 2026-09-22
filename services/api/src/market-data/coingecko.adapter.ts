import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';
import { fetchWithBackoff } from './fetch-with-backoff.util';

interface CoinGeckoPriceResponse {
  [coinId: string]: { usd: number };
}

export interface CoinGeckoSearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

interface CoinGeckoSearchResponse {
  coins: CoinGeckoSearchCoin[];
}

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinGeckoTokenomicsData {
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  circulatingToMaxRatio: number | null;
  marketCapToFdvRatio: number | null;
}

// CoinGecko's free/demo /ohlc endpoint only accepts these exact day values.
const ALLOWED_DAYS = [1, 7, 14, 30, 90, 180];

function snapToAllowedDays(requested: number): number {
  return ALLOWED_DAYS.find((d) => d >= requested) ?? 180;
}

// /coins/{id}/ohlc candle granularity is automatic and NOT overridable on
// free tier (interval=daily/hourly is paid-only). Per CoinGecko's docs:
//   1-2 days   -> 30-minute candles
//   3-30 days  -> 4-hour candles
//   31+ days   -> 4-day candles
// Past 30 days requested, /ohlc silently returns far fewer bars than
// expected (e.g. a 90-day request yields ~23 four-day candles), which
// starves indicators needing more history (SMA-50, EMA-26, MACD). Beyond
// this threshold we switch to /market_chart instead (see below).
const OHLC_GRANULARITY_CUTOFF_DAYS = 30;

// Known-major ticker -> CoinGecko id map. Covers the app's seeded crypto
// majors instantly with zero extra API calls. Anything not listed here
// falls back to a live /search lookup, resolved and cached at runtime.
const MAJOR_TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  USDC: 'usd-coin',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
};

@Injectable()
export class CoinGeckoAdapter implements MarketDataProvider {
  private readonly logger = new Logger(CoinGeckoAdapter.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  // In-memory resolution cache for tickers not in the static majors map.
  // Not persisted — acceptable since /search is cheap and this only
  // affects less-common coins the majors map doesn't already cover.
  private readonly resolvedIdCache = new Map<string, string>();

  private async resolveTickerToId(ticker: string): Promise<string | null> {
    const upper = ticker.toUpperCase();

    if (MAJOR_TICKER_TO_ID[upper]) {
      return MAJOR_TICKER_TO_ID[upper];
    }
    if (this.resolvedIdCache.has(upper)) {
      return this.resolvedIdCache.get(upper)!;
    }

    const result = await this.searchCoins(ticker);
    if (!result || result.length === 0) {
      return null;
    }

    // Prefer an exact ticker match with the best (lowest, non-null) market cap rank —
    // avoids resolving "BTC" to some obscure unrelated coin that happens to match.
    const exactMatches = result.filter((c) => c.symbol.toUpperCase() === upper);
    const best = (exactMatches.length > 0 ? exactMatches : result).sort(
      (a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity),
    )[0];

    if (!best) {
      return null;
    }

    this.resolvedIdCache.set(upper, best.id);
    return best.id;
  }

  async getPriceUsd(ticker: string): Promise<number | null> {
    const coinId = await this.resolveTickerToId(ticker);
    if (!coinId) {
      this.logger.warn(`Could not resolve CoinGecko id for ticker ${ticker}`);
      return null;
    }

    const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `CoinGecko price fetch for ${ticker} (${coinId})`,
        },
      );
      const data = (await response.json()) as CoinGeckoPriceResponse;
      return data[coinId]?.usd ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch CoinGecko price for ${ticker} (${coinId})`, error);
      return null;
    }
  }

  async getTokenomics(ticker: string): Promise<CoinGeckoTokenomicsData | null> {
    const coinId = await this.resolveTickerToId(ticker);
    if (!coinId) {
      this.logger.warn(`Could not resolve CoinGecko id for ticker ${ticker}`);
      return null;
    }

    const url = `${this.baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `CoinGecko tokenomics fetch for ${ticker} (${coinId})`,
        },
      );
      const data = await response.json();
      const marketData = data?.market_data;
      if (!marketData) {
        this.logger.warn(`CoinGecko returned no market_data for ${ticker} (${coinId})`);
        return null;
      }

      const marketCap = typeof marketData.market_cap?.usd === 'number' ? marketData.market_cap.usd : null;
      const fdv = typeof marketData.fully_diluted_valuation?.usd === 'number' ? marketData.fully_diluted_valuation.usd : null;
      const circulatingSupply = typeof marketData.circulating_supply === 'number' ? marketData.circulating_supply : null;
      const totalSupply = typeof marketData.total_supply === 'number' ? marketData.total_supply : null;
      const maxSupply = typeof marketData.max_supply === 'number' ? marketData.max_supply : null;

      return {
        marketCap,
        fullyDilutedValuation: fdv,
        circulatingSupply,
        totalSupply,
        maxSupply,
        circulatingToMaxRatio:
          circulatingSupply !== null && maxSupply !== null && maxSupply !== 0
            ? circulatingSupply / maxSupply
            : null,
        marketCapToFdvRatio: marketCap !== null && fdv !== null && fdv !== 0 ? marketCap / fdv : null,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch CoinGecko tokenomics for ${ticker} (${coinId})`, error);
      return null;
    }
  }

  /**
   * Historical OHLC(V) bars. Uses a hybrid strategy depending on the
   * requested window:
   *
   * - days <= 30: /coins/{id}/ohlc. True open/high/low/close at 4-hour
   *   (or finer) granularity — the accurate source when it's available.
   *   Still no volume (CoinGecko's free /ohlc response omits it).
   *
   * - days > 30: /coins/{id}/market_chart. /ohlc would silently coarsen
   *   to 4-day candles here (free tier, non-overridable — see
   *   OHLC_GRANULARITY_CUTOFF_DAYS above), undercounting bars for
   *   longer backfills. /market_chart's auto-granularity returns one
   *   point per calendar day for windows beyond 90 days even on free
   *   tier, which is what daily-bar indicators (SMA-50, EMA-26, MACD)
   *   actually need. Trade-off: market_chart gives a single price per
   *   timestamp, not a true O/H/L split, so open/high/low/close are all
   *   set equal to that price for this path. Accepted here because every
   *   indicator this app computes (RSI, MACD, SMA, EMA) is close-price
   *   based, not range-based (no ATR/true-range usage). Bonus: this path
   *   also yields real volume via total_volumes, which /ohlc can't
   *   provide at all.
   */
  async getHistoricalPricesUsd(ticker: string, days: number): Promise<PriceBarData[] | null> {
    const coinId = await this.resolveTickerToId(ticker);
    if (!coinId) {
      this.logger.warn(`Could not resolve CoinGecko id for ticker ${ticker}`);
      return null;
    }

    if (days <= OHLC_GRANULARITY_CUTOFF_DAYS) {
      return this.fetchOhlc(ticker, coinId, days);
    }

    return this.fetchMarketChartDaily(ticker, coinId, days);
  }

  private async fetchOhlc(
    ticker: string,
    coinId: string,
    days: number,
  ): Promise<PriceBarData[] | null> {
    const snappedDays = snapToAllowedDays(days);
    const url = `${this.baseUrl}/coins/${coinId}/ohlc?vs_currency=usd&days=${snappedDays}`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `CoinGecko OHLC fetch for ${ticker} (${coinId})`,
        },
      );
      const data = (await response.json()) as number[][];

      return data.map(([timestampMs, open, high, low, close]) => ({
        // Retain full ISO timestamp (e.g. 2026-08-11T16:00:00.000Z).
        // Free tier auto-selects finer granularity for smaller day ranges
        // (e.g. 4-hour bars for a 7-day range) — preserving the full ISO
        // string prevents multiple intraday bars from overwriting each
        // other on upsert.
        date: new Date(timestampMs).toISOString(),
        open,
        high,
        low,
        close,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch CoinGecko OHLC for ${ticker} (${coinId})`, error);
      return null;
    }
  }

  private async fetchMarketChartDaily(
    ticker: string,
    coinId: string,
    days: number,
  ): Promise<PriceBarData[] | null> {
    // Requesting one extra day reliably pushes the window past CoinGecko's
    // free-tier ">90 days -> daily granularity" boundary even when the
    // caller asked for exactly 90.
    const requestDays = Math.max(days, OHLC_GRANULARITY_CUTOFF_DAYS + 1) + 1;
    const url = `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${requestDays}`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `CoinGecko market_chart fetch for ${ticker} (${coinId})`,
        },
      );
      const data = (await response.json()) as CoinGeckoMarketChartResponse;

      if (!Array.isArray(data.prices) || data.prices.length === 0) {
        this.logger.warn(`CoinGecko market_chart returned no price points for ${ticker} (${coinId})`);
        return null;
      }

      // prices and total_volumes are parallel arrays (same length, same
      // timestamps, per CoinGecko's documented response shape).
      const volumeByTimestamp = new Map<number, number>(
        Array.isArray(data.total_volumes) ? data.total_volumes : [],
      );

      return data.prices.map(([timestampMs, price]) => ({
        date: new Date(timestampMs).toISOString(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volumeByTimestamp.get(timestampMs) ?? 0,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch CoinGecko market_chart for ${ticker} (${coinId})`,
        error,
      );
      return null;
    }
  }

  async searchCoins(query: string): Promise<CoinGeckoSearchCoin[] | null> {
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `CoinGecko search for "${query}"`,
        },
      );
      const data = (await response.json()) as CoinGeckoSearchResponse;
      return Array.isArray(data.coins) ? data.coins : [];
    } catch (error) {
      this.logger.error(`Failed to search CoinGecko for "${query}"`, error);
      return null;
    }
  }
}