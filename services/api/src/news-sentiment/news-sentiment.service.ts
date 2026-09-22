import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';

export interface NewsArticle {
  headline: string;
  source: string;
  timestamp: string;
  url: string;
  summary: string;
}

export interface NewsSentimentResult {
  available: boolean;
  reason?: string;
  source?: string;
  articles: NewsArticle[];
  articleCount: number;
  sentiment: {
    available: boolean;
    reason?: string;
    positivePercent: number | null;
    neutralPercent: number | null;
    negativePercent: number | null;
    // Explicit per master brief §Engine 4: sentiment is model-derived,
    // never presented as objective truth.
    source: string | null;
    modelDerived: true;
  };
}

@Injectable()
export class NewsSentimentService {
  private readonly logger = new Logger(NewsSentimentService.name);

  constructor(private readonly marketData: MarketDataService) {}

  async getNewsAndSentiment(symbol: string, includeSentiment: boolean) {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const newsItems = await this.marketData.getCompanyNews(symbol, fmt(weekAgo), fmt(today));

    if (!newsItems || newsItems.length === 0) {
      return {
        available: false,
        reason: `No recent news found for ${symbol} from Finnhub`,
        articles: [],
        articleCount: 0,
        sentiment: {
          available: false,
          reason: 'No news available to derive sentiment from',
          positivePercent: null,
          neutralPercent: null,
          negativePercent: null,
          source: null,
          modelDerived: true,
        },
      };
    }

    const articles: NewsArticle[] = newsItems.slice(0, 10).map((item) => ({
      headline: item.headline,
      source: item.source,
      timestamp: new Date(item.datetime * 1000).toISOString(),
      url: item.url,
      summary: item.summary,
    }));

    // Sentiment is opt-in per call, not automatic — Alpha Vantage's 25/day
    // budget is shared with fundamentals/price-history calls elsewhere in
    // the app, so this must not fire on every news request by default.
    if (!includeSentiment) {
      return {
        available: true,
        articles,
        articleCount: articles.length,
        sentiment: {
          available: false,
          reason: 'Sentiment not requested for this call (conserves Alpha Vantage daily quota)',
          positivePercent: null,
          neutralPercent: null,
          negativePercent: null,
          source: null,
          modelDerived: true,
        },
      };
    }

    const sentimentItems = await this.marketData.getNewsSentiment(symbol);

    if (!sentimentItems || sentimentItems.length === 0) {
      return {
        available: true,
        articles,
        articleCount: articles.length,
        sentiment: {
          available: false,
          reason: 'Alpha Vantage returned no sentiment data (may be rate-limited)',
          positivePercent: null,
          neutralPercent: null,
          negativePercent: null,
          source: null,
          modelDerived: true,
        },
      };
    }

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const item of sentimentItems) {
      const label = item.overall_sentiment_label?.toLowerCase() ?? '';
      if (label.includes('bullish') || label.includes('positive')) positive++;
      else if (label.includes('bearish') || label.includes('negative')) negative++;
      else neutral++;
    }
    const total = positive + neutral + negative;

    return {
      available: true,
      articles,
      articleCount: articles.length,
      sentiment: {
        available: true,
        positivePercent: total > 0 ? Math.round((positive / total) * 100) : null,
        neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : null,
        negativePercent: total > 0 ? Math.round((negative / total) * 100) : null,
        source: 'Alpha Vantage (NEWS_SENTIMENT)',
        modelDerived: true,
      },
    };
  }
}