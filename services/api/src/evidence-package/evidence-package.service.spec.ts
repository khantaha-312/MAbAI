import { Test, TestingModule } from '@nestjs/testing';
import { EvidencePackageService } from './evidence-package.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';

describe('EvidencePackageService', () => {
  let service: EvidencePackageService;
  let prisma: any;
  let marketData: any;
  let technicalAnalysis: any;

  beforeEach(async () => {
    prisma = { instrument: { findUnique: jest.fn() } };
    marketData = { getEquityPriceUsd: jest.fn(), getCryptoPriceUsd: jest.fn() };
    technicalAnalysis = { getAggregate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencePackageService,
        { provide: PrismaService, useValue: prisma },
        { provide: MarketDataService, useValue: marketData },
        { provide: TechnicalAnalysisService, useValue: technicalAnalysis },
      ],
    }).compile();

    service = module.get<EvidencePackageService>(EvidencePackageService);
  });

  it('marks market unavailable (not fabricated) when price is null', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(null);

    const result = await service.buildEvidencePackage('ZZZ', 'equity');

    expect(result.market).toEqual({
      available: false,
      reason: expect.any(String),
      source: null,
    });
  });

  it('marks technical unavailable when no Instrument exists (no PriceBar history)', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.technical.available).toBe(false);
    expect(result.instrumentId).toBeNull();
  });

  it('marks technical available with real aggregate data when instrument exists', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    technicalAnalysis.getAggregate.mockResolvedValue({ barsUsed: 60, rsi: { rsi: 43.5 } });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.technical.available).toBe(true);
    if (result.technical.available) {
      expect(result.technical.data).toEqual({ barsUsed: 60, rsi: { rsi: 43.5 } });
    }
  });

  it('marks all 6 not-yet-built engines explicitly unavailable, never as empty objects', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(null);

    const result = await service.buildEvidencePackage('ZZZ', 'equity');

    for (const section of [
      result.fundamental,
      result.macro,
      result.news,
      result.sentiment,
      result.portfolio,
      result.behavioral,
    ]) {
      expect(section.available).toBe(false);
      expect((section as any).reason).toEqual(expect.any(String));
      expect((section as any).source).toBeNull();
    }
  });

  it('never includes a real value alongside available: false (no contradictory shape)', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(null);

    const result = await service.buildEvidencePackage('ZZZ', 'equity');

    expect(result.market).not.toHaveProperty('data');
    expect(result.technical).not.toHaveProperty('data');
  });
});