/**
 * services/api/scripts/batch-resolve-for-winrate.ts
 *
 * Run with: npx dotenv -e ..\..\.env -- ts-node -r tsconfig-paths/register scripts/batch-resolve-for-winrate.ts
 *
 * Goal: get the test user (from test-ledger.ts's seeded portfolio) past the
 * 10-resolved-entry floor so getWinRate's 'ok' branch can be observed with
 * real counts/winRatePct, not just the insufficient_data floor check.
 *
 * Honesty note: this generates MULTIPLE real LedgerEntry rows by calling
 * generateNarrativeForPortfolio repeatedly (real LLM call each time, real
 * evidence package, real trend read). For each entry's directional
 * position(s), it uses REAL historical PriceBar closes at varying lookback
 * windows (8, 9, 10... days back) as the "price at creation" — same
 * honest-backdating approach as testDirectionalResolution, just repeated
 * with different real historical reference points so pctChange values
 * differ based on genuine historical price movement, not invention.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiOrchestrationService } from '../src/ai-orchestration/ai-orchestration.service';
import { PredictionLedgerResolutionJob } from '../src/prediction-ledger/prediction-ledger-resolution.job';
import { PredictionLedgerService } from '../src/prediction-ledger/prediction-ledger.service';

const TARGET_RESOLVED_COUNT = 10;
const MAX_ITERATIONS = 15; // safety cap in case some entries don't end up resolvable

async function main() {
  console.log('Bootstrapping Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const prisma = app.get(PrismaService);
  const aiOrchestration = app.get(AiOrchestrationService);
  const resolutionJob = app.get(PredictionLedgerResolutionJob);
  const ledgerService = app.get(PredictionLedgerService);

  const portfolio = await prisma.portfolio.findFirst({ include: { positions: { include: { instrument: true } } } });
  if (!portfolio) {
    console.error('No portfolio found — run test-ledger.ts first.');
    await app.close();
    return;
  }
  console.log(`Using portfolio ${portfolio.id} (userId=${portfolio.userId}), positions: ${portfolio.positions.map((p) => p.instrument.symbol).join(', ')}`);

  const existingResolvedCount = (
    await prisma.ledgerEntry.findMany({ where: { userId: portfolio.userId, status: 'resolved' } })
  ).length;
  console.log(`Already resolved for this user: ${existingResolvedCount}`);

  const createdEntryIds: string[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const currentResolved = (
      await prisma.ledgerEntry.findMany({ where: { userId: portfolio.userId, status: 'resolved' } })
    ).length;
    if (currentResolved >= TARGET_RESOLVED_COUNT) {
      console.log(`Reached ${currentResolved} resolved entries, stopping.`);
      break;
    }

    console.log(`\n--- Iteration ${i + 1} (currently ${currentResolved}/${TARGET_RESOLVED_COUNT} resolved) ---`);
    const narrativeResult = await aiOrchestration.generateNarrativeForPortfolio(portfolio.id, portfolio.userId);
    console.log('Generated entry:', narrativeResult.ledgerEntryId);
    createdEntryIds.push(narrativeResult.ledgerEntryId);

    const entry = await prisma.ledgerEntry.findUnique({ where: { id: narrativeResult.ledgerEntryId } });
    const snapshot = entry!.inputSnapshot as any;

    // For each directional position in this entry, swap in a real
    // historical close from a varying lookback window (8 + i days back)
    // so different iterations reflect genuinely different real price
    // history, not the same number repeated.
    const lookbackDays = 8 + i;
    const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    let anyPositionUpdated = false;
    for (const position of snapshot.positions ?? []) {
      const direction = position.technical?.available ? position.technical.data?.trend?.trend?.direction : undefined;
      if (direction !== 'bullish' && direction !== 'bearish') continue;

      const instrument = await prisma.instrument.findUnique({ where: { symbol_assetType: { symbol: position.symbol, assetType: position.assetType } } });
      if (!instrument) continue;

      const historicalBar = await prisma.priceBar.findFirst({
        where: { instrumentId: instrument.id, timestamp: { lte: lookbackDate } },
        orderBy: { timestamp: 'desc' },
      });
      if (!historicalBar) continue;

      position.currentPriceUsd = Number(historicalBar.close);
      anyPositionUpdated = true;
      console.log(`  ${position.symbol} (${direction}): real historical close ${lookbackDays}d back (${historicalBar.timestamp.toISOString().slice(0, 10)}) = ${position.currentPriceUsd}`);
    }

    if (!anyPositionUpdated) {
      console.log('  No directional positions with historical data in this entry — will stay pending, skipping backdate.');
      continue;
    }

    await prisma.ledgerEntry.update({
      where: { id: narrativeResult.ledgerEntryId },
      data: { inputSnapshot: snapshot, createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
  }

  console.log('\nRunning PredictionLedgerResolutionJob.handleCron() once for all pending candidates...');
  await resolutionJob.handleCron();

  const finalResolved = await prisma.ledgerEntry.findMany({
    where: { userId: portfolio.userId, status: 'resolved' },
    select: { id: true, outcome: true },
  });
  console.log(`\nTotal resolved entries for user ${portfolio.userId}: ${finalResolved.length}`);
  console.log('Outcomes:', finalResolved.map((e) => e.outcome));

  console.log('\n=== Calling ledgerService.getWinRate(userId) directly (real DB query, not an HTTP round-trip — this test user has no real Clerk session) ===');
  const winRate = await ledgerService.getWinRate(portfolio.userId);
  console.log(JSON.stringify(winRate, null, 2));

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});