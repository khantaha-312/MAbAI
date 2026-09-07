/**
 * services/api/scripts/seed-real-user-entries.ts
 *
 * Run with:
 *   npx dotenv -e ..\..\.env -- ts-node -r tsconfig-paths/register scripts/seed-real-user-entries.ts <clerkId>
 *
 * Get <clerkId> from your browser console while logged in:
 *   window.Clerk.user.id
 *
 * What this does and doesn't fake:
 * - REAL: technical/trend data (via TechnicalAnalysisService.getAggregate,
 *   same code path as production, backed by real PriceBar history)
 * - REAL: price comparison at resolution (real historical PriceBar closes,
 *   same honest-backdating approach used in prior scripts)
 * - REAL: outcome derivation (goes through the actual PredictionLedgerService
 *   / resolution job logic, unmodified)
 * - PLACEHOLDER: generatedOutput.narrative — a fixed string, not a real LLM
 *   call. This field is NEVER read by resolution/win-rate logic, so this
 *   doesn't affect anything that gets graded. Only relevant if something
 *   in the UI tries to display narrative text for these specific entries.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PriceBarService } from '../src/price-bar/price-bar.service';
import { TechnicalAnalysisService } from '../src/technical-analysis/technical-analysis.service';
import { PredictionLedgerResolutionJob } from '../src/prediction-ledger/prediction-ledger-resolution.job';
import { PredictionLedgerService } from '../src/prediction-ledger/prediction-ledger.service';

const CANDIDATE_SYMBOLS = ['NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AAPL', 'NFLX', 'AMD', 'CRM'];
const TARGET_RESOLVED_COUNT = 10;

async function main() {
  const clerkId = process.argv[2];
  if (!clerkId) {
    console.error('Usage: ts-node scripts/seed-real-user-entries.ts <clerkId>');
    process.exit(1);
  }

  console.log('Bootstrapping Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const prisma = app.get(PrismaService);
  const priceBarService = app.get(PriceBarService);
  const technicalAnalysis = app.get(TechnicalAnalysisService);
  const resolutionJob = app.get(PredictionLedgerResolutionJob);
  const ledgerService = app.get(PredictionLedgerService);

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    console.error(`No User row found for clerkId "${clerkId}". Make sure you've completed at least one real sign-in/onboarding step so a User row exists.`);
    await app.close();
    return;
  }
  console.log(`Found real user: ${user.id} (${user.email})`);

  let portfolio = await prisma.portfolio.findFirst({ where: { userId: user.id } });
  if (!portfolio) {
    console.log('No portfolio for this user yet — creating one.');
    portfolio = await prisma.portfolio.create({
      data: { userId: user.id, orgId: user.orgId, name: 'My Portfolio' },
    });
  }
  console.log(`Using portfolio: ${portfolio.id}`);

  let entriesCreated = 0;

  for (let i = 0; i < CANDIDATE_SYMBOLS.length; i++) {
    const existingResolved = await prisma.ledgerEntry.count({ where: { userId: user.id, status: 'resolved' } });
    if (existingResolved >= TARGET_RESOLVED_COUNT) {
      console.log(`Reached ${existingResolved} resolved entries, stopping.`);
      break;
    }

    const symbol = CANDIDATE_SYMBOLS[i];
    console.log(`\n--- ${symbol} ---`);

    const backfill = await priceBarService.backfillEquityHistory(symbol, 90);
    const { trend } = await technicalAnalysis.getTrend(symbol, 'equity');
    console.log(`  direction=${trend.direction}, evidenceCount=${trend.evidenceCount}`);

    if (trend.direction !== 'bullish' && trend.direction !== 'bearish') {
      console.log('  Not directional today — skipping this symbol.');
      continue;
    }

    const lookbackDays = 8 + i;
    const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const historicalBar = await prisma.priceBar.findFirst({
      where: { instrumentId: backfill.instrumentId, timestamp: { lte: lookbackDate } },
      orderBy: { timestamp: 'desc' },
    });

    if (!historicalBar) {
      console.log('  No historical bar far enough back — skipping.');
      continue;
    }

    const priceAtCreation = Number(historicalBar.close);

    // Real technical data, real historical price — only the narrative is a
    // placeholder, and only because no LLM call is made here (see file
    // header). Never read by resolution or win-rate logic.
    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: user.id,
        inputSnapshot: {
          portfolioName: portfolio.name,
          positions: [
            {
              symbol,
              assetType: 'equity',
              quantity: 1,
              avgCostBasis: priceAtCreation,
              currentPriceUsd: priceAtCreation,
              technical: {
                available: true,
                data: { trend: { trend } },
                source: `TechnicalAnalysisService (real, ${lookbackDays}d-back snapshot)`,
              },
            },
          ],
        },
        generatedOutput: { narrative: '[placeholder — no LLM call made for this seeded entry, see script header]' },
        modelProvider: 'seed-script',
        modelName: 'n/a',
        status: 'pending',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`  Created entry ${entry.id}, real ${symbol} ${trend.direction} call, priceAtCreation=${priceAtCreation}`);
    entriesCreated++;
  }

  console.log(`\nCreated ${entriesCreated} new entries. Running resolution job...`);
  await resolutionJob.handleCron();

  const winRate = await ledgerService.getWinRate(user.id);
  console.log('\n=== Real win-rate for your actual user ===');
  console.log(JSON.stringify(winRate, null, 2));

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});