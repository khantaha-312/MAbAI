import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';
import { fetchWithBackoff } from './fetch-with-backoff.util';
import { ApiBudgetTrackerService } from './api-budget-tracker.service';

export interface AlphaVantageSentimentItem {
  title: string;
  url: string;
  time_published: string;
  summary: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: { ticker: string; relevance_score: string; ticker_sentiment_score: string }[];
}

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

  constructor(private readonly budgetTracker: ApiBudgetTrackerService) {}

  private async fetchDaily(symbol: string): Promise<AlphaVantageDailyResponse | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      this.logger.error('ALPHA_VANTAGE_API_KEY is not set');
      return null;
    }

    // Check budget before making the call
    const budgetCheck = this.budgetTracker.checkBudget('ALPHA_VANTAGE');
    if (!budgetCheck.allowed) {
      this.logger.warn(
        `Alpha Vantage budget exhausted, returning cached/unavailable for ${symbol}`,
      );
      // Try to return cached value if available
      const cached = this.budgetTracker.getCachedValue('ALPHA_VANTAGE', `daily:${symbol}`);
      if (cached) return cached;
      return null;
    }

    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Alpha Vantage daily data fetch for ${symbol}`,
        },
      );
      const data = (await response.json()) as AlphaVantageDailyResponse;
      
      // Record successful call and cache the result
      this.budgetTracker.recordCall('ALPHA_VANTAGE');
      this.budgetTracker.setCachedValue('ALPHA_VANTAGE', `daily:${symbol}`, data);
      
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

  async getNewsSentiment(symbol: string): Promise<AlphaVantageSentimentItem[] | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      this.logger.error('ALPHA_VANTAGE_API_KEY is not set');
      return null;
    }

    // Check budget before making the call
    const budgetCheck = this.budgetTracker.checkBudget('ALPHA_VANTAGE');
    if (!budgetCheck.allowed) {
      this.logger.warn(
        `Alpha Vantage budget exhausted, returning cached/unavailable for ${symbol} sentiment`,
      );
      // Try to return cached value if available
      const cached = this.budgetTracker.getCachedValue('ALPHA_VANTAGE', `sentiment:${symbol}`);
      if (cached) return cached;
      return null;
    }

    const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}`;
    try {
      const response = await fetchWithBackoff(
        url,
        {},
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 30000,
          logger: this.logger,
          context: `Alpha Vantage NEWS_SENTIMENT fetch for ${symbol}`,
        },
      );
      const data = (await response.json()) as { feed?: AlphaVantageSentimentItem[]; Note?: string; Information?: string };
      
      // Record successful call and cache the result
      this.budgetTracker.recordCall('ALPHA_VANTAGE');
      this.budgetTracker.setCachedValue('ALPHA_VANTAGE', `sentiment:${symbol}`, data.feed);
      
      if (data.Note || data.Information) {
        this.logger.warn(`Alpha Vantage rate limit or info message: ${data.Note ?? data.Information}`);
        return null;
      }
      if (!data.feed) {
        this.logger.warn(`Alpha Vantage NEWS_SENTIMENT returned no feed for ${symbol}`);
        return null;
      }
      this.logger.debug(`Raw Alpha Vantage sentiment response for ${symbol} (first item): ${JSON.stringify(data.feed[0])}`);
      return data.feed;
    } catch (error) {
      this.logger.error(`Failed to fetch Alpha Vantage sentiment for ${symbol}`, error);
      return null;
    }
  }
}