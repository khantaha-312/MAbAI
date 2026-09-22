import { Test, TestingModule } from '@nestjs/testing';
import { EvidencePackageService } from './evidence-package.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { PriceBarService } from '../price-bar/price-bar.service';
import { NewsSentimentService } from '../news-sentiment/news-sentiment.service';

describe('EvidencePackageService', () => {
  let service: EvidencePackageService;
  let prisma: any;
  let marketData: any;
  let technicalAnalysis: any;
  let priceBarService: any;
  let newsSentimentService: any;

  beforeEach(async () => {
    prisma = { instrument: { findUnique: jest.fn() } };
    marketData = { 
      getEquityPriceUsd: jest.fn(), 
      getCryptoPriceUsd: jest.fn(),
      getEquityFundamentals: jest.fn().mockResolvedValue(null), 
      // FIX (test-setup only): this mock was missing entirely, causing
      // marketData.getCryptoTokenomics.mockResolvedValue(...) to fail in
      // the crypto-fundamental test below with "mockResolvedValue is
      // undefined" — added in the same style as its siblings above.
      getCryptoTokenomics: jest.fn(),
    };
    technicalAnalysis = { getAggregate: jest.fn() };
    priceBarService = { ensureHistory: jest.fn() };
    newsSentimentService = { getNewsAndSentiment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencePackageService,
        { provide: PrismaService, useValue: prisma },
        { provide: MarketDataService, useValue: marketData },
        { provide: TechnicalAnalysisService, useValue: technicalAnalysis },
        { provide: PriceBarService, useValue: priceBarService },
        { provide: NewsSentimentService, useValue: newsSentimentService },
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
    priceBarService.ensureHistory.mockResolvedValue({ instrumentId: 'instr-1', freshlyBackfilled: false });
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

  it('adds dataFreshness entry for available market section with section-specific timestamp', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.market.available).toBe(true);
    expect(result.dataFreshness).toContainEqual({
      section: 'market',
      asOf: expect.any(String),
    });
  });

  it('does NOT add dataFreshness entry for unavailable market section', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(null);

    const result = await service.buildEvidencePackage('ZZZ', 'equity');

    expect(result.market.available).toBe(false);
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'market' })
    );
  });

  it('adds dataFreshness entry for available technical section with section-specific timestamp', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockResolvedValue({ instrumentId: 'instr-1', freshlyBackfilled: false });
    technicalAnalysis.getAggregate.mockResolvedValue({ barsUsed: 60, rsi: { rsi: 43.5 } });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.technical.available).toBe(true);
    expect(result.dataFreshness).toContainEqual({
      section: 'technical',
      asOf: expect.any(String),
    });
  });

  it('does NOT add dataFreshness entry for unavailable technical section', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.technical.available).toBe(false);
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'technical' })
    );
  });

  it('adds dataFreshness entry for available equity fundamental section with section-specific timestamp', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    marketData.getEquityFundamentals.mockResolvedValue({
      calculationVersion: 'equity-fa-v2',
      peRatio: 25.5,
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.fundamental.available).toBe(true);
    expect(result.dataFreshness).toContainEqual({
      section: 'fundamental',
      asOf: expect.any(String),
    });
  });

  it('adds dataFreshness entry for available crypto fundamental section with section-specific timestamp', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getCryptoPriceUsd.mockResolvedValue(50000);
    marketData.getCryptoTokenomics.mockResolvedValue({
      marketCap: 1000000000,
      circulatingSupply: 19000000,
    });

    const result = await service.buildEvidencePackage('BTC', 'crypto');

    expect(result.fundamental.available).toBe(true);
    expect(result.dataFreshness).toContainEqual({
      section: 'fundamental',
      asOf: expect.any(String),
    });
  });

  it('does NOT add dataFreshness entry for unavailable fundamental section', async () => {
    prisma.instrument.findUnique.mockResolvedValue(null);
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    marketData.getEquityFundamentals.mockResolvedValue(null);

    const result = await service.buildEvidencePackage('ZZZ', 'equity');

    expect(result.fundamental.available).toBe(false);
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'fundamental' })
    );
  });

  it('news and sentiment share the same retrieval timestamp when both are available', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [{ headline: 'Test' }],
      articleCount: 1,
      sentiment: {
        available: true,
        positivePercent: 60,
        neutralPercent: 30,
        negativePercent: 10,
        source: 'Alpha Vantage',
        modelDerived: true,
      },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.news.available).toBe(true);
    expect(result.sentiment.available).toBe(true);

    const newsTimestamp = result.dataFreshness.find((f) => f.section === 'news')?.asOf;
    const sentimentTimestamp = result.dataFreshness.find((f) => f.section === 'sentiment')?.asOf;

    expect(newsTimestamp).toBe(sentimentTimestamp);
  });

  it('news adds dataFreshness entry but sentiment does NOT when sentiment is unavailable', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [{ headline: 'Test' }],
      articleCount: 1,
      sentiment: {
        available: false,
        reason: 'Rate limited',
      },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.news.available).toBe(true);
    expect(result.sentiment.available).toBe(false);
    expect(result.dataFreshness).toContainEqual(
      expect.objectContaining({ section: 'news' })
    );
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'sentiment' })
    );
  });

  it('package timestamp is distinct from section timestamps', async () => {
    // FIX (test-only): the original assertion used
    // `expect(result.timestamp).toBe(expect.any(String))`, which is
    // invalid Jest usage — .toBe() is reference/primitive equality and
    // does not evaluate asymmetric matchers like expect.any(); it was
    // essentially a no-op that always failed regardless of the real
    // value. Corrected below to actually check the type, AND to
    // genuinely test distinctness rather than merely asserting each
    // timestamp is independently a valid-looking ISO string (which the
    // original test did, but that's not the same claim as "distinct").
    //
    // To test distinctness without relying on real wall-clock timing
    // (which would make this test flaky — sequential synchronous
    // new Date() calls can legitimately land in the same millisecond),
    // Date.prototype.toISOString is spied to return a distinct,
    // controlled value on each successive call, matching the real call
    // order in EvidencePackageService.buildEvidencePackage: (1) the
    // package-level `timestamp` at function entry, (2) market's
    // retrieval timestamp, (3) technical's retrieval timestamp.
    const controlledTimestamps = [
      '2026-01-01T00:00:00.100Z', // call 1: package-level `timestamp`
      '2026-01-01T00:00:00.200Z', // call 2: market's retrieval timestamp
      '2026-01-01T00:00:00.300Z', // call 3: technical's retrieval timestamp
    ];
    let callIndex = 0;
    const toISOStringSpy = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementation(
        () => controlledTimestamps[Math.min(callIndex++, controlledTimestamps.length - 1)],
      );

    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockResolvedValue({ instrumentId: 'instr-1', freshlyBackfilled: false });
    technicalAnalysis.getAggregate.mockResolvedValue({ barsUsed: 60, rsi: { rsi: 43.5 } });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    toISOStringSpy.mockRestore();

    expect(typeof result.timestamp).toBe('string');
    expect(result.dataFreshness).toHaveLength(2); // market and technical

    const marketTimestamp = result.dataFreshness.find((f) => f.section === 'market')?.asOf;
    const technicalTimestamp = result.dataFreshness.find((f) => f.section === 'technical')?.asOf;

    // Market's retrieval timestamp is captured independently from the
    // package-level timestamp — this is the fix that was already applied
    // in production code (marketRetrievedAt, added specifically to stop
    // reusing the function-entry `timestamp`).
    expect(marketTimestamp).not.toBe(result.timestamp);

    // NOTE, not silently omitted: as of the current production code,
    // this next assertion is expected to FAIL. technical's dataFreshness
    // entry still reuses the function-entry `timestamp` variable directly
    // (`dataFreshness.push({ section: 'technical', asOf: timestamp })`)
    // rather than capturing its own retrieval time the way market now
    // does — a real, pre-existing gap identified separately this session,
    // out of scope to fix under this task's instructions (production
    // code / retrievedAt implementation changes are explicitly excluded
    // here). Left asserted rather than removed so the suite honestly
    // reports this as still broken instead of silently passing a weaker
    // check.
    expect(technicalTimestamp).not.toBe(result.timestamp);
  });

  it('fundamental retrieval timestamp is distinct from the package timestamp (equity)', async () => {
    // Isolates fundamental specifically: technical is deliberately made
    // unavailable here (ensureHistory rejects) so only market's and
    // fundamental's real Date.toISOString() calls occur alongside the
    // package-level one, keeping the controlled sequence unambiguous.
    const controlledTimestamps = [
      '2026-01-01T00:00:00.100Z', // call 1: package-level `timestamp`
      '2026-01-01T00:00:00.200Z', // call 2: market's retrieval timestamp
      '2026-01-01T00:00:00.300Z', // call 3: fundamental's retrieval timestamp
    ];
    let callIndex = 0;
    const toISOStringSpy = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementation(
        () => controlledTimestamps[Math.min(callIndex++, controlledTimestamps.length - 1)],
      );

    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockRejectedValue(new Error('technical not needed for this test'));
    marketData.getEquityFundamentals.mockResolvedValue({
      calculationVersion: 'equity-fa-v2',
      peRatio: 25.5,
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    toISOStringSpy.mockRestore();

    expect(result.technical.available).toBe(false); // isolated out, as intended
    expect(result.fundamental.available).toBe(true);

    const fundamentalTimestamp = result.dataFreshness.find((f) => f.section === 'fundamental')?.asOf;

    expect(typeof fundamentalTimestamp).toBe('string');
    // The actual bug this fix addressed: fundamental was previously
    // reusing the function-entry package timestamp verbatim.
    expect(fundamentalTimestamp).not.toBe(result.timestamp);
  });

  it('news/sentiment retrieval timestamp is distinct from the package timestamp', async () => {
    const controlledTimestamps = [
      '2026-01-01T00:00:00.100Z', // call 1: package-level `timestamp`
      '2026-01-01T00:00:00.200Z', // call 2: market's retrieval timestamp
      '2026-01-01T00:00:00.300Z', // call 3: shared news+sentiment retrieval timestamp
    ];
    let callIndex = 0;
    const toISOStringSpy = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementation(
        () => controlledTimestamps[Math.min(callIndex++, controlledTimestamps.length - 1)],
      );

    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockRejectedValue(new Error('technical not needed for this test'));
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [{ headline: 'Test' }],
      articleCount: 1,
      sentiment: {
        available: true,
        positivePercent: 60,
        neutralPercent: 30,
        negativePercent: 10,
        source: 'Alpha Vantage',
        modelDerived: true,
      },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    toISOStringSpy.mockRestore();

    const newsTimestamp = result.dataFreshness.find((f) => f.section === 'news')?.asOf;
    const sentimentTimestamp = result.dataFreshness.find((f) => f.section === 'sentiment')?.asOf;

    expect(typeof newsTimestamp).toBe('string');
    // The actual bug: both previously reused the function-entry package
    // timestamp — this proves they now share a REAL captured retrieval
    // timestamp instead, while still (correctly, intentionally) matching
    // each other.
    expect(newsTimestamp).not.toBe(result.timestamp);
    expect(newsTimestamp).toBe(sentimentTimestamp);
  });

  it('reports news as available with articleCount 0 when the provider returns no articles (not treated as unavailable)', async () => {
    // Regression lock for a deliberate Phase 2 audit decision: an empty
    // result is an honest "fetch succeeded, nothing found" outcome, not
    // a masked failure — this must not silently flip to available:false
    // in a future change.
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockRejectedValue(new Error('technical not needed for this test'));
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [],
      articleCount: 0,
      sentiment: { available: false, reason: 'No sentiment computable from zero articles' },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.news.available).toBe(true);
    if (result.news.available) {
      expect(result.news.data.articleCount).toBe(0);
      expect(result.news.data.articles).toEqual([]);
    }
  });

  it('macro, portfolio, and behavioral never add dataFreshness entries (intentionally unavailable)', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.macro.available).toBe(false);
    expect(result.portfolio.available).toBe(false);
    expect(result.behavioral.available).toBe(false);

    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'macro' })
    );
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'portfolio' })
    );
    expect(result.dataFreshness).not.toContainEqual(
      expect.objectContaining({ section: 'behavioral' })
    );
  });

  it('sentiment correctly surfaces when Alpha Vantage returns real data', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockRejectedValue(new Error('technical not needed for this test'));
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [{ headline: 'Test' }],
      articleCount: 1,
      sentiment: {
        available: true,
        positivePercent: 60,
        neutralPercent: 30,
        negativePercent: 10,
        source: 'Alpha Vantage (NEWS_SENTIMENT)',
        modelDerived: true,
      },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.sentiment.available).toBe(true);
    if (result.sentiment.available) {
      expect(result.sentiment.data).toEqual({
        positivePercent: 60,
        neutralPercent: 30,
        negativePercent: 10,
        source: 'Alpha Vantage (NEWS_SENTIMENT)',
        modelDerived: true,
      });
    }
  });

  it('sentiment correctly unavailable when Alpha Vantage returns null', async () => {
    prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
    marketData.getEquityPriceUsd.mockResolvedValue(214.32);
    priceBarService.ensureHistory.mockRejectedValue(new Error('technical not needed for this test'));
    newsSentimentService.getNewsAndSentiment.mockResolvedValue({
      available: true,
      articles: [{ headline: 'Test' }],
      articleCount: 1,
      sentiment: {
        available: false,
        reason: 'Alpha Vantage returned no sentiment data (may be rate-limited)',
        positivePercent: null,
        neutralPercent: null,
        negativePercent: null,
        source: null,
        modelDerived: true,
      },
    });

    const result = await service.buildEvidencePackage('AAPL', 'equity');

    expect(result.sentiment.available).toBe(false);
    expect(result.news.available).toBe(true); // news should still be available
  });
});