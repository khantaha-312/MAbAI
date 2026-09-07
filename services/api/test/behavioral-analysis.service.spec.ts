import { Test, TestingModule } from '@nestjs/testing';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BehavioralAnalysisService', () => {
  let service: BehavioralAnalysisService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      userProfile: { findUnique: jest.fn() },
      riskFlag: { findMany: jest.fn() },
      ledgerEntry: { findMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BehavioralAnalysisService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<BehavioralAnalysisService>(BehavioralAnalysisService);
  });

  it('returns available:false when no history exists at all', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.riskFlag.findMany.mockResolvedValue([]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    const result = await service.getBehavioralAnalysis('user-1');
    expect(result.available).toBe(false);
  });

  it('only reports repeated exposure for instruments with 2+ flags, not single occurrences', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.riskFlag.findMany.mockResolvedValue([
      { flagType: 'CONCENTRATION_RISK', instrument: { symbol: 'AAPL' }, createdAt: new Date() },
      { flagType: 'LARGE_UNREALIZED_LOSS', instrument: { symbol: 'AAPL' }, createdAt: new Date() },
      { flagType: 'CONCENTRATION_RISK', instrument: { symbol: 'TSLA' }, createdAt: new Date() },
    ]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    const result = await service.getBehavioralAnalysis('user-1');
    const aaplEntry = result.repeatedRiskExposure.find((r) => r.instrumentSymbol === 'AAPL');
    const tslaEntry = result.repeatedRiskExposure.find((r) => r.instrumentSymbol === 'TSLA');

    expect(aaplEntry).toBeDefined();
    expect(aaplEntry!.flagCount).toBe(2);
    expect(tslaEntry).toBeUndefined(); // only 1 flag, doesn't qualify as "repeated"
  });

  it('flags a mismatch observation for long-horizon style with concentration flags, without diagnosing motive', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ tradingStyle: 'LONG_TERM_INVESTMENT' });
    prisma.riskFlag.findMany.mockResolvedValue([
      { flagType: 'CONCENTRATION_RISK', instrument: { symbol: 'AAPL' }, createdAt: new Date() },
    ]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    const result = await service.getBehavioralAnalysis('user-1');
    expect(result.concentrationPatternVsProfile.available).toBe(true);
    expect(result.concentrationPatternVsProfile.observation).toContain('long term investment');
    // Ensure it never uses diagnostic/emotional language
    expect(result.concentrationPatternVsProfile.observation).not.toMatch(/anxious|fear|impulsive|addicted/i);
  });

  it('reports real ledger engagement counts and date range', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.riskFlag.findMany.mockResolvedValue([]);
    const d1 = new Date('2026-01-01');
    const d2 = new Date('2026-02-01');
    prisma.ledgerEntry.findMany.mockResolvedValue([{ createdAt: d1 }, { createdAt: d2 }]);

    const result = await service.getBehavioralAnalysis('user-1');
    expect(result.ledgerEngagement.totalAnalysesRequested).toBe(2);
    expect(result.ledgerEngagement.firstRequestAt).toBe(d1.toISOString());
    expect(result.ledgerEngagement.lastRequestAt).toBe(d2.toISOString());
  });
});