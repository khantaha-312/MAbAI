import { Test, TestingModule } from '@nestjs/testing';
import { PredictionLedgerResolutionJob } from './prediction-ledger-resolution.job';
import { PredictionLedgerService } from './prediction-ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerEntry } from '@prisma/client';

describe('PredictionLedgerResolutionJob - Single Symbol 7-Day Resolution', () => {
  let job: PredictionLedgerResolutionJob;
  let ledgerService: PredictionLedgerService;
  let prisma: PrismaService;
  let marketData: MarketDataService;

  const mockLedgerService = {
    findPendingOlderThan: jest.fn(),
    findPendingReportPredictionsOlderThan: jest.fn(),
    resolve: jest.fn(),
  };

  const mockPrisma = {
    instrument: {
      findUnique: jest.fn(),
    },
    priceBar: {
      findFirst: jest.fn(),
    },
  };

  const mockMarketData = {
    getEquityPriceUsd: jest.fn(),
    getCryptoPriceUsd: jest.fn(),
    getForexRate: jest.fn(),
    getMetalPriceUsd: jest.fn(),
    getOilPriceUsd: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionLedgerResolutionJob,
        {
          provide: PredictionLedgerService,
          useValue: mockLedgerService,
        },
        {
          provide: MarketDataService,
          useValue: mockMarketData,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    job = module.get<PredictionLedgerResolutionJob>(PredictionLedgerResolutionJob);
    ledgerService = module.get<PredictionLedgerService>(PredictionLedgerService);
    prisma = module.get<PrismaService>(PrismaService);
    marketData = module.get<MarketDataService>(MarketDataService);

    jest.clearAllMocks();
  });

  describe('Single Symbol Resolution Lifecycle', () => {
    const mockUserId = 'user-1';
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    it('resolves bullish prediction correctly when price increased after 7 days', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);
      const cutoff = new Date(Date.now() - sevenDaysMs);

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bullish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };
      const mockPriceBar = {
        id: 'bar-1',
        instrumentId: 'instr-1',
        timestamp: targetDate,
        open: 155.0,
        high: 157.0,
        low: 154.0,
        close: 155.5,
        volume: 1000000,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(mockPriceBar);
      mockLedgerService.resolve.mockResolvedValue(mockEntry);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(true);
      expect(result.outcome).toBe('correct');
      expect(result.actualData?.pctChange).toBeCloseTo(3.67, 2); // (155.5 - 150) / 150 * 100 = 3.67%

      expect(mockLedgerService.resolve).toHaveBeenCalledWith(
        mockEntry.id,
        mockUserId,
        expect.objectContaining({
          outcome: 'correct',
          actualData: expect.objectContaining({
            predictionType: 'single-symbol',
            symbol: 'AAPL',
            trendDirection: 'bullish',
            referencePrice: 150.0,
            targetPrice: 155.5,
            pctChange: expect.any(Number),
          }),
        }),
      );
    });

    it('resolves bullish prediction incorrectly when price decreased after 7 days', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bullish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };
      const mockPriceBar = {
        id: 'bar-1',
        instrumentId: 'instr-1',
        timestamp: targetDate,
        open: 145.0,
        high: 146.0,
        low: 144.0,
        close: 145.5,
        volume: 1000000,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(mockPriceBar);
      mockLedgerService.resolve.mockResolvedValue(mockEntry);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(true);
      expect(result.outcome).toBe('incorrect');
      expect(result.actualData?.pctChange).toBeCloseTo(-3.0, 2); // (145.5 - 150) / 150 * 100 = -3.0%

      expect(mockLedgerService.resolve).toHaveBeenCalledWith(
        mockEntry.id,
        mockUserId,
        expect.objectContaining({
          outcome: 'incorrect',
        }),
      );
    });

    it('resolves bearish prediction correctly when price decreased after 7 days', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bearish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };
      const mockPriceBar = {
        id: 'bar-1',
        instrumentId: 'instr-1',
        timestamp: targetDate,
        open: 145.0,
        high: 146.0,
        low: 144.0,
        close: 145.5,
        volume: 1000000,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(mockPriceBar);
      mockLedgerService.resolve.mockResolvedValue(mockEntry);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(true);
      expect(result.outcome).toBe('correct');
      expect(result.actualData?.pctChange).toBeCloseTo(-3.0, 2);

      expect(mockLedgerService.resolve).toHaveBeenCalledWith(
        mockEntry.id,
        mockUserId,
        expect.objectContaining({
          outcome: 'correct',
        }),
      );
    });

    it('resolves bearish prediction incorrectly when price increased after 7 days', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bearish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };
      const mockPriceBar = {
        id: 'bar-1',
        instrumentId: 'instr-1',
        timestamp: targetDate,
        open: 155.0,
        high: 157.0,
        low: 154.0,
        close: 155.5,
        volume: 1000000,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(mockPriceBar);
      mockLedgerService.resolve.mockResolvedValue(mockEntry);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(true);
      expect(result.outcome).toBe('incorrect');
      expect(result.actualData?.pctChange).toBeCloseTo(3.67, 2);

      expect(mockLedgerService.resolve).toHaveBeenCalledWith(
        mockEntry.id,
        mockUserId,
        expect.objectContaining({
          outcome: 'incorrect',
        }),
      );
    });

    it('returns unresolved when target-date price bar is not found', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bullish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(null);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(false);
      expect(mockLedgerService.resolve).not.toHaveBeenCalled();
    });

    it('returns unresolved when instrument is not found', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bullish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(null);

      const result = await job.resolveSingleSymbol(mockEntry);

      expect(result.resolved).toBe(false);
      expect(mockLedgerService.resolve).not.toHaveBeenCalled();
    });

    it('uses 1-day tolerance when finding target-date price bar', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date(createdAt.getTime() + sevenDaysMs);
      const toleranceMs = 24 * 60 * 60 * 1000;

      const mockEntry: LedgerEntry = {
        id: 'ledger-1',
        userId: mockUserId,
        inputSnapshot: {
          reportHistoryId: 'report-1',
          symbol: 'AAPL',
          assetType: 'equity',
          trendDirection: 'bullish',
          referencePrice: 150.0,
          createdAt: createdAt.toISOString(),
          barsUsed: 100,
        } as any,
        generatedOutput: {} as any,
        modelProvider: 'technical-analysis',
        modelName: 'trend-indicator-100bars',
        status: 'pending',
        outcome: null,
        actualData: null,
        resolvedAt: null,
        createdAt: createdAt,
      };

      const mockInstrument = { id: 'instr-1', symbol: 'AAPL', assetType: 'equity' };
      const mockPriceBar = {
        id: 'bar-1',
        instrumentId: 'instr-1',
        timestamp: new Date(targetDate.getTime() + 12 * 60 * 60 * 1000), // 12 hours after target
        close: 155.5,
      };

      mockLedgerService.findPendingReportPredictionsOlderThan.mockResolvedValue([mockEntry]);
      mockPrisma.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrisma.priceBar.findFirst.mockResolvedValue(mockPriceBar);
      mockLedgerService.resolve.mockResolvedValue(mockEntry);

      await job.resolveSingleSymbol(mockEntry);

      expect(mockPrisma.priceBar.findFirst).toHaveBeenCalledWith({
        where: {
          instrumentId: 'instr-1',
          timestamp: {
            gte: new Date(targetDate.getTime() - toleranceMs),
            lte: new Date(targetDate.getTime() + toleranceMs),
          },
        },
        orderBy: { timestamp: 'asc' },
      });
    });
  });
});
