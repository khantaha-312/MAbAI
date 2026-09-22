import { Test, TestingModule } from '@nestjs/testing';
import { NewsSentimentService } from './news-sentiment.service';
import { MarketDataService } from '../market-data/market-data.service';

describe('NewsSentimentService', () => {
  let service: NewsSentimentService;
  let marketData: any;

  beforeEach(async () => {
    marketData = { getCompanyNews: jest.fn(), getNewsSentiment: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsSentimentService, { provide: MarketDataService, useValue: marketData }],
    }).compile();
    service = module.get<NewsSentimentService>(NewsSentimentService);
  });

  it('returns available:false when no news exists', async () => {
    marketData.getCompanyNews.mockResolvedValue([]);
    const result = await service.getNewsAndSentiment('ZZZ');
    expect(result.available).toBe(false);
    expect(result.sentiment.available).toBe(false);
  });

  it('returns news without sentiment when includeSentiment is false (default)', async () => {
    marketData.getCompanyNews.mockResolvedValue([
      { headline: 'AAPL rises', source: 'Reuters', datetime: 1700000000, url: 'http://x.com', summary: 's', category: 'company' },
    ]);
    const result = await service.getNewsAndSentiment('AAPL', false);
    expect(result.available).toBe(true);
    expect(result.sentiment.available).toBe(false);
    expect(marketData.getNewsSentiment).not.toHaveBeenCalled();
  });

  it('computes real sentiment percentages when requested and data exists', async () => {
    marketData.getCompanyNews.mockResolvedValue([
      { headline: 'x', source: 'y', datetime: 1700000000, url: 'u', summary: 's', category: 'c' },
    ]);
    marketData.getNewsSentiment.mockResolvedValue([
      { title: 't', url: 'u', time_published: 'p', summary: 's', overall_sentiment_score: 0.5, overall_sentiment_label: 'Bullish', ticker_sentiment: [] },
      { title: 't', url: 'u', time_published: 'p', summary: 's', overall_sentiment_score: -0.5, overall_sentiment_label: 'Bearish', ticker_sentiment: [] },
      { title: 't', url: 'u', time_published: 'p', summary: 's', overall_sentiment_score: 0, overall_sentiment_label: 'Neutral', ticker_sentiment: [] },
    ]);
    const result = await service.getNewsAndSentiment('AAPL', true);
    expect(result.sentiment.available).toBe(true);
    expect(result.sentiment.positivePercent).toBe(33);
    expect(result.sentiment.negativePercent).toBe(33);
    expect(result.sentiment.modelDerived).toBe(true);
  });

  it('handles Alpha Vantage returning nothing gracefully when sentiment is requested', async () => {
    marketData.getCompanyNews.mockResolvedValue([
      { headline: 'x', source: 'y', datetime: 1700000000, url: 'u', summary: 's', category: 'c' },
    ]);
    marketData.getNewsSentiment.mockResolvedValue(null);
    const result = await service.getNewsAndSentiment('AAPL', true);
    expect(result.available).toBe(true); // news itself still available
    expect(result.sentiment.available).toBe(false); // sentiment specifically isn't
  });

  it('returns sentiment with null percentages when Alpha Vantage returns data but all labels are neutral', async () => {
    marketData.getCompanyNews.mockResolvedValue([
      { headline: 'x', source: 'y', datetime: 1700000000, url: 'u', summary: 's', category: 'c' },
    ]);
    marketData.getNewsSentiment.mockResolvedValue([
      { title: 't', url: 'u', time_published: 'p', summary: 's', overall_sentiment_score: 0, overall_sentiment_label: 'Neutral', ticker_sentiment: [] },
    ]);
    const result = await service.getNewsAndSentiment('AAPL', true);
    expect(result.sentiment.available).toBe(true);
    expect(result.sentiment.positivePercent).toBe(0);
    expect(result.sentiment.neutralPercent).toBe(100);
    expect(result.sentiment.negativePercent).toBe(0);
  });
});