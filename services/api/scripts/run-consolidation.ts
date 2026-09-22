    /**
 * services/api/scripts/run-consolidation.ts
 *
 * Manually triggers KnowledgeConsolidationJob.run() outside the hourly
 * @Cron schedule, for local testing only. This replaces the removed (and
 * deliberately NOT reintroduced) unguarded debug HTTP endpoint — this
 * script has no network exposure at all, it only runs from a terminal.
 *
 * Run with: npx tsx scripts/run-consolidation.ts
 *
 * Optionally pass a userId as the first argument to also print that
 * user's resulting UserKnowledgeState/GrowthEvent rows after the run —
 * this is a PRINT-ONLY filter for convenience. The job itself always
 * processes ALL users with unconsolidated messages, exactly like the
 * real cron tick; this script never changes what gets processed.
 *
 *   npx tsx scripts/run-consolidation.ts cmti8tgx60001v9zwew51n25s
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Must run before ANY import that touches Prisma or Nest config, since
// those read process.env.DATABASE_URL at module-load time. Same
// convention as scripts/test-ledger.ts.
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { KnowledgeConsolidationJob } from '../src/chat/knowledge-consolidation.job';

async function main() {
  const filterUserId = process.argv[2]; // optional, print-only

  console.log('Bootstrapping Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const job = app.get(KnowledgeConsolidationJob);

  const pendingCount = await prisma.chatMessage.count({
    where: { consolidatedAt: null },
  });
  console.log(`Found ${pendingCount} unconsolidated ChatMessage row(s) across all users.`);

  if (pendingCount === 0) {
    console.log('Nothing to do.');
    await app.close();
    return;
  }

  console.log('\nRunning KnowledgeConsolidationJob.run() for real...');
  await job.run();
  console.log('Run complete.');

  if (filterUserId) {
    console.log(`\n=== UserKnowledgeState for ${filterUserId} ===`);
    const states = await prisma.userKnowledgeState.findMany({
      where: { userId: filterUserId },
      orderBy: { createdAt: 'asc' },
    });
    for (const s of states) {
      console.log(
        `[${s.stateType}] ${s.topic}: "${s.belief}" | source=${s.sourceType} | evidenceCount=${s.evidenceCount} | validTo=${s.validTo ? s.validTo.toISOString() : 'ACTIVE'}`,
      );
    }

    console.log(`\n=== GrowthEvent for ${filterUserId} ===`);
    const events = await prisma.growthEvent.findMany({
      where: { userId: filterUserId },
      orderBy: { createdAt: 'asc' },
    });
    if (events.length === 0) {
      console.log('(none)');
    }
    for (const e of events) {
      console.log(
        `[${e.eventType}] ${e.topic}: ${e.description} (occurredAt=${e.occurredAt.toISOString()})`,
      );
    }
  } else {
    console.log(
      "\nTip: pass a userId as an argument to print that user's resulting state, e.g.:",
    );
    console.log('  npx tsx scripts/run-consolidation.ts <userId>');
  }

  const remainingPending = await prisma.chatMessage.count({
    where: { consolidatedAt: null },
  });
  console.log(`\nRemaining unconsolidated messages after this run: ${remainingPending}`);

  await app.close();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});