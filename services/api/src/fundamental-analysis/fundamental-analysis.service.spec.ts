import { Test, TestingModule } from '@nestjs/testing';
import { FundamentalAnalysisService } from './fundamental-analysis.service';
import { MarketDataService } from '../market-data/market-data.service';

describe('FundamentalAnalysisService', () => {
  let service: FundamentalAnalysisService;
  let marketData: any;

  beforeEach(async () => {
    marketData = { getEquityFundamentals: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundamentalAnalysisService,
        { provide: MarketDataService, useValue: marketData },
      ],
    }).compile();

    service = module.get<FundamentalAnalysisService>(FundamentalAnalysisService);
  });

  it('returns available: false when Finnhub returns null', async () => {
    marketData.getEquityFundamentals.mockResolvedValue(null);

    const result = await service.getFundamentals('ZZZ');

    expect(result.available).toBe(false);
    expect(result.assessment).toBe('insufficient_data');
    expect(result.source).toBeNull();
  });

  it('returns insufficient_data when fewer than 2 real metrics are present', async () => {
    marketData.getEquityFundamentals.mockResolvedValue({
      raw: {},
      peRatio: 25,
      eps: null,
      marketCapitalization: null,
      profitMargin: null,
      revenueGrowth: null,
    });

    const result = await service.getFundamentals('AAPL');

    expect(result.available).toBe(true);
    expect(result.metricsAvailable).toBe(1);
    expect(result.assessment).toBe('insufficient_data');
  });

  it('returns positive assessment when profit margin, revenue growth, and eps are all favorable', async () => {
    marketData.getEquityFundamentals.mockResolvedValue({
      raw: {},
      peRatio: 27,
      eps: 6.5,
      marketCapitalization: 3000000,
      profitMargin: 23,
      revenueGrowth: 12,
    });

    const result = await service.getFundamentals('AAPL');

    expect(result.assessment).toBe('positive');
    expect(result.metricsAvailable).toBe(5);
  });

  it('returns negative assessment when profit margin, revenue growth, and eps are all unfavorable', async () => {
    marketData.getEquityFundamentals.mockResolvedValue({
      raw: {},
      peRatio: 12,
      eps: -1.2,
      marketCapitalization: 500000,
      profitMargin: 2,
      revenueGrowth: -8,
    });

    const result = await service.getFundamentals('BADCO');

    expect(result.assessment).toBe('negative');
  });

  it('never returns a positive/negative assessment when metricsAvailable is 0', async () => {
    marketData.getEquityFundamentals.mockResolvedValue({
      raw: {},
      peRatio: null,
      eps: null,
      marketCapitalization: null,
      profitMargin: null,
      revenueGrowth: null,
    });

    const result = await service.getFundamentals('ZZZ');

    expect(result.metricsAvailable).toBe(0);
    expect(result.assessment).toBe('insufficient_data');
  });
});