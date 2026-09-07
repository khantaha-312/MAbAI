/**
 * services/api/scripts/test-ledger.ts
 *
 * Run with: npx tsx scripts/test-ledger.ts
 *
 * GUESSED SCHEMA FIELDS — never confirmed against a real schema.prisma.
 * If any prisma.create() call below throws a validation error naming a
 * field, that error is ground truth; fix just that field, not the whole
 * script blind. Marked with GUESS comments at each call site.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Must run before ANY import that touches Prisma or Nest config, since
// those read process.env.DATABASE_URL at module-load time.
// Root .env lives at the monorepo root, two levels up from this script
// (services/api/scripts -> services/api -> repo root).
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiOrchestrationService } from '../src/ai-orchestration/ai-orchestration.service';
import { PredictionLedgerResolutionJob } from '../src/prediction-ledger/prediction-ledger-resolution.job';
import { PriceBarService } from '../src/price-bar/price-bar.service';
import { TechnicalAnalysisService } from '../src/technical-analysis/technical-analysis.service';

async function main() {
  console.log('Bootstrapping Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const aiOrchestration = app.get(AiOrchestrationService);
  const resolutionJob = app.get(PredictionLedgerResolutionJob);
  const priceBarService = app.get(PriceBarService);
  const technicalAnalysis = app.get(TechnicalAnalysisService);

  // --- Step 2: find or seed a portfolio ---
  let portfolio = await prisma.portfolio.findFirst({
    include: { positions: true }, // GUESS: relation name on Portfolio
  });

  if (!portfolio) {
    console.log('No portfolio found — seeding a dummy User + Portfolio + Position.');

    // GUESS: Org required fields — confirmed to exist and be required by
    // the previous run's Prisma error, but its own shape beyond a name
    // is still unconfirmed.
    const org = await prisma.org.create({
      data: {
        name: `Test Org ${Date.now()}`,
      },
    });
    console.log('Seeded org:', org.id);

    // GUESS: User required fields. Clerk-backed apps often require a
    // clerkId / externalId of some kind — adjust if this throws.
    const user = await prisma.user.create({
      data: {
        clerkId: `test_clerk_id_${Date.now()}`, // GUESS field name
        email: `test-ledger-${Date.now()}@example.com`, // GUESS field name
        org: { connect: { id: org.id } }, // confirmed required by prior error
      },
    });
    console.log('Seeded user:', user.id);

    // GUESS: Instrument required fields, and the compound unique
    // (symbol_assetType) confirmed earlier from EvidencePackageService's
    // `where: { symbol_assetType: { symbol, assetType } }` usage — that
    // part IS confirmed, the rest of Instrument's fields are not.
    const instrument = await prisma.instrument.upsert({
      where: { symbol_assetType: { symbol: 'AAPL', assetType: 'equity' } },
      update: {},
      create: {
        symbol: 'AAPL',
        assetType: 'equity',
        name: 'Apple Inc.', // GUESS field name
      },
    });
    console.log('Seeded/found instrument:', instrument.id);

    portfolio = await prisma.portfolio.create({
      data: {
        userId: user.id, // GUESS field name — matches PredictionLedgerService's `userId` convention
        orgId: org.id, // GUESS — PortfolioController.create passes user.orgId as a distinct arg, implying Portfolio likely has its own orgId
        name: 'Test Ledger Portfolio', // GUESS field name
        positions: {
          create: [
            {
              instrumentId: instrument.id, // GUESS field name
              quantity: 10, // GUESS field name/type
              avgCostBasis: 200.0, // GUESS field name — matches AiOrchestrationService's p.avgCostBasis usage
            },
          ],
        },
      },
      include: { positions: true },
    });
    console.log('Seeded portfolio:', portfolio.id);
  } else {
    console.log('Using existing portfolio:', portfolio.id);
  }

  // --- Step 2b: real PriceBar backfill so the trend engine has enough
  // history to make a directional call (SMA50 alone needs >=50 bars) ---
  console.log('\nBackfilling real AAPL price history via PriceBarService (90 days)...');
  const backfillResult = await priceBarService.backfillEquityHistory('AAPL', 90);
  console.log('Backfill result:', backfillResult);

  // --- Step 3: trigger the real narrative generation ---
  console.log('\nCalling AiOrchestrationService.generateNarrativeForPortfolio (REAL call, real MarketDataService, real LLM)...');
  const narrativeResult = await aiOrchestration.generateNarrativeForPortfolio(
    portfolio.id,
    portfolio.userId, // GUESS field name, matches Step 2's seeded value
  );
  console.log('Narrative generated. ledgerEntryId:', narrativeResult.ledgerEntryId);

  // --- Step 4: backdate the entry so it's a resolution candidate ---
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await prisma.ledgerEntry.update({
    where: { id: narrativeResult.ledgerEntryId },
    data: { createdAt: eightDaysAgo },
  });
  console.log('Backdated LedgerEntry to:', eightDaysAgo.toISOString());

  // --- Step 5: run the real resolution job ---
  console.log('\nRunning PredictionLedgerResolutionJob.handleCron() for real...');
  await resolutionJob.handleCron();

  // --- Step 6: query and print the real resolved row ---
  const resolved = await prisma.ledgerEntry.findUnique({
    where: { id: narrativeResult.ledgerEntryId },
  });

  console.log('\n=== FINAL LEDGER ENTRY STATE ===');
  console.log('status:', resolved?.status);
  console.log('outcome:', resolved?.outcome);
  console.log('actualData:', JSON.stringify(resolved?.actualData, null, 2));

  const inputSnapshot = resolved?.inputSnapshot as any;
  console.log(
    '\ninputSnapshot.positions[0].technical.data.trend.trend.direction:',
    inputSnapshot?.positions?.[0]?.technical?.data?.trend?.trend?.direction ?? '(not present — check the real shape here)',
  );

  await app.close();
}

/**
 * Second, separate test: proves a real correct/incorrect resolution
 * (not just the mixed/pending case already demonstrated above).
 *
 * Two real constraints this works around honestly, not by fabricating data:
 * 1. determineTrend() only calls a direction when real indicators agree
 *    strongly enough (bullishRatio >= 0.7 or <= 0.3) — AAPL's real recent
 *    data didn't qualify. This searches a few real candidate symbols and
 *    uses whichever one's REAL data genuinely produces a directional read,
 *    rather than picking one arbitrarily or forcing a result.
 * 2. "Price at creation" vs "current price" fetched seconds apart in a
 *    test script won't show real market movement. Rather than fabricate
 *    a fake priceAtCreation, this uses the instrument's own REAL PriceBar
 *    row from ~8 real trading days ago — i.e. what a genuinely 8-day-old
 *    entry would actually have stored — so pctChange reflects real
 *    historical price movement, not an invented number.
 */
async function testDirectionalResolution() {
  console.log('\n\n========== DIRECTIONAL RESOLUTION TEST ==========');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const prisma = app.get(PrismaService);
  const aiOrchestration = app.get(AiOrchestrationService);
  const resolutionJob = app.get(PredictionLedgerResolutionJob);
  const priceBarService = app.get(PriceBarService);
  const technicalAnalysis = app.get(TechnicalAnalysisService);

  const portfolio = await prisma.portfolio.findFirst();
  if (!portfolio) {
    console.error('No portfolio found — run the main script first to seed one.');
    await app.close();
    return;
  }

  const candidates = ['NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AAPL'];
  let directionalSymbol: string | null = null;
  let directionalInstrumentId: string | null = null;

  for (const symbol of candidates) {
    console.log(`Backfilling ${symbol} and checking real trend read...`);
    const backfill = await priceBarService.backfillEquityHistory(symbol, 90);
    const { trend } = await technicalAnalysis.getTrend(symbol, 'equity');
    console.log(`  ${symbol}: direction=${trend.direction}, evidenceCount=${trend.evidenceCount}, strength=${trend.strength}`);
    if (trend.direction === 'bullish' || trend.direction === 'bearish') {
      directionalSymbol = symbol;
      directionalInstrumentId = backfill.instrumentId;
      console.log(`  -> Using ${symbol} (real directional read: ${trend.direction})`);
      break;
    }
  }

  if (!directionalSymbol || !directionalInstrumentId) {
    console.log('\nNo candidate symbol produced a real directional read today. This is a legitimate real result, not a failure — re-run later or add more candidates.');
    await app.close();
    return;
  }

  // Add a position for the directional symbol to the existing portfolio.
  await prisma.position.create({
    data: {
      portfolioId: portfolio.id,
      instrumentId: directionalInstrumentId,
      quantity: 10,
      avgCostBasis: 100,
    },
  });

  console.log(`\nGenerating a fresh narrative for portfolio ${portfolio.id} (now includes ${directionalSymbol})...`);
  const narrativeResult = await aiOrchestration.generateNarrativeForPortfolio(portfolio.id, portfolio.userId);
  console.log('Narrative generated. ledgerEntryId:', narrativeResult.ledgerEntryId);

  // Find the real PriceBar closest to ~8 real trading days ago for this
  // instrument, to use as the entry's "price at creation" — real recorded
  // data, just correctly time-shifted to match the backdated createdAt.
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const historicalBar = await prisma.priceBar.findFirst({
    where: { instrumentId: directionalInstrumentId, timestamp: { lte: eightDaysAgo } },
    orderBy: { timestamp: 'desc' },
  });

  if (!historicalBar) {
    console.log(`No real PriceBar found for ${directionalSymbol} at/before ${eightDaysAgo.toISOString()} — cannot backdate the price snapshot honestly. Aborting this test.`);
    await app.close();
    return;
  }

  const historicalClose = Number(historicalBar.close);
  console.log(`Real historical close for ${directionalSymbol} on ${historicalBar.timestamp.toISOString()}: ${historicalClose}`);

  const entry = await prisma.ledgerEntry.findUnique({ where: { id: narrativeResult.ledgerEntryId } });
  const snapshot = entry!.inputSnapshot as any;
  const positionIndex = snapshot.positions.findIndex((p: any) => p.symbol === directionalSymbol);
  if (positionIndex === -1) {
    console.log(`${directionalSymbol} position not found in generated inputSnapshot — cannot proceed.`);
    await app.close();
    return;
  }

  // Overwrite ONLY currentPriceUsd for this position with the real
  // historical close, so it honestly reflects what an entry created
  // 8 real days ago would have actually stored. Nothing else is touched.
  snapshot.positions[positionIndex].currentPriceUsd = historicalClose;

  await prisma.ledgerEntry.update({
    where: { id: narrativeResult.ledgerEntryId },
    data: {
      inputSnapshot: snapshot,
      createdAt: eightDaysAgo,
    },
  });
  console.log(`Backdated entry and set ${directionalSymbol}'s creation price to the real historical close (${historicalClose}).`);

  console.log('\nRunning PredictionLedgerResolutionJob.handleCron() for real...');
  await resolutionJob.handleCron();

  const resolved = await prisma.ledgerEntry.findUnique({ where: { id: narrativeResult.ledgerEntryId } });
  console.log('\n=== DIRECTIONAL TEST — FINAL LEDGER ENTRY STATE ===');
  console.log('status:', resolved?.status);
  console.log('outcome:', resolved?.outcome);
  console.log('actualData:', JSON.stringify(resolved?.actualData, null, 2));

  await app.close();
}

// Run both: the original flow, then the directional-specific test.
async function runAll() {
  await main();
  await testDirectionalResolution();
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});