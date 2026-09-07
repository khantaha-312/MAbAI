/**
 * services/api/scripts/finish-resolution.ts
 *
 * Run with: npx dotenv -e ..\..\.env -- ts-node -r tsconfig-paths/register scripts/finish-resolution.ts
 *
 * The prior batch run created and backdated 11 real entries before hitting
 * a rate limit on iteration 12 (which threw before any entry was created,
 * per AiOrchestrationService's real code — confirmed no partial/broken
 * entry exists for that iteration). This just runs the resolution job
 * against what's already pending, and checks win-rate. No new LLM calls.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PredictionLedgerResolutionJob } from '../src/prediction-ledger/prediction-ledger-resolution.job';
import { PredictionLedgerService } from '../src/prediction-ledger/prediction-ledger.service';

async function main() {
  console.log('Bootstrapping Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const prisma = app.get(PrismaService);
  const resolutionJob = app.get(PredictionLedgerResolutionJob);
  const ledgerService = app.get(PredictionLedgerService);

  const portfolio = await prisma.portfolio.findFirst();
  if (!portfolio) {
    console.error('No portfolio found.');
    await app.close();
    return;
  }

  const pendingBefore = await prisma.ledgerEntry.count({ where: { userId: portfolio.userId, status: 'pending' } });
  console.log(`Pending entries for user ${portfolio.userId}: ${pendingBefore}`);

  console.log('\nRunning PredictionLedgerResolutionJob.handleCron()...');
  await resolutionJob.handleCron();

  const resolved = await prisma.ledgerEntry.findMany({
    where: { userId: portfolio.userId, status: 'resolved' },
    select: { id: true, outcome: true },
  });
  const stillPending = await prisma.ledgerEntry.count({ where: { userId: portfolio.userId, status: 'pending' } });

  console.log(`\nResolved: ${resolved.length}, still pending: ${stillPending}`);
  console.log('Outcomes:', resolved.map((e) => e.outcome));

  console.log('\n=== ledgerService.getWinRate(userId) ===');
  const winRate = await ledgerService.getWinRate(portfolio.userId);
  console.log(JSON.stringify(winRate, null, 2));

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});