import { Test, TestingModule } from '@nestjs/testing';
import { PredictionLedgerResolutionJob } from './prediction-ledger-resolution.job';
import { PredictionLedgerService } from './prediction-ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import type { LedgerEntry } from '@prisma/client';

describe('PredictionLedgerResolutionJob', () => {
  let job: PredictionLedgerResolutionJob;
  let ledgerService: { resolve: jest.Mock };
  let marketData: { getCryptoPriceUsd: jest.Mock };

  beforeEach(async () => {
    ledgerService = { resolve: jest.fn().mockResolvedValue({}) };
    marketData = { getCryptoPriceUsd: jest.fn().mockResolvedValue(110) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionLedgerResolutionJob,
        { provide: PredictionLedgerService, useValue: ledgerService },
        { provide: MarketDataService, useValue: marketData },
      ],
    }).compile();

    job = module.get(PredictionLedgerResolutionJob);
    jest.clearAllMocks();
  });

  it('still resolves pending entries through PredictionLedgerService.resolve', async () => {
    const entry = {
      id: 'entry-1',
      userId: 'user-1',
      status: 'pending',
      inputSnapshot: {
        positions: [
          {
            symbol: 'BTC',
            assetType: 'crypto',
            currentPriceUsd: 100,
            technical: {
              available: true,
              data: { trend: { trend: { direction: 'bullish', strength: 0.8, evidenceCount: 3 } } },
            },
          },
        ],
      },
    } as unknown as LedgerEntry;

    const result = await job.resolveOne(entry);

    expect(result.resolved).toBe(true);
    expect(ledgerService.resolve).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({
        outcome: 'correct',
        actualData: expect.objectContaining({ resolvedBy: 'prediction-ledger-resolution.job' }),
      }),
    );
  });
});
