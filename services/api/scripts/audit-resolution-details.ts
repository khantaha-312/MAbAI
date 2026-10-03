import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not found.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function auditResolutionDetails() {
  console.log('=== MAbAI Resolution Details Audit - Read-Only ===\n');

  // Focus on the user with 100% win rate
  const userId = 'cmti9m0pg0002v9osdeeukt5s';

  console.log(`Auditing resolution details for user ${userId}\n`);

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      modelName: true,
      status: true,
      outcome: true,
      createdAt: true,
      resolvedAt: true,
      inputSnapshot: true,
      actualData: true,
    },
  });

  console.log(`Total entries: ${entries.length}\n`);

  for (const entry of entries) {
    console.log(`--- Entry ${entry.id} ---`);
    console.log(`Model: ${entry.modelName}`);
    console.log(`Status: ${entry.status}`);
    console.log(`Outcome: ${entry.outcome || 'N/A'}`);
    console.log(`Created: ${entry.createdAt.toISOString()}`);
    console.log(`Resolved: ${entry.resolvedAt?.toISOString() || 'N/A'}`);

    const snapshot = entry.inputSnapshot as any;
    console.log(`\nInput Snapshot:`);
    console.log(`  Has portfolioName: ${!!snapshot?.portfolioName}`);
    console.log(`  Has positions: ${!!snapshot?.positions && snapshot.positions.length > 0}`);
    if (snapshot?.positions) {
      console.log(`  Position count: ${snapshot.positions.length}`);
      snapshot.positions.slice(0, 2).forEach((pos: any, idx: number) => {
        console.log(`    Position ${idx + 1}: ${pos.symbol} (${pos.assetType})`);
        console.log(`      Has technical: ${!!pos.technical?.available}`);
        console.log(`      Has currentPriceUsd: ${typeof pos.currentPriceUsd === 'number'}`);
        if (pos.technical?.available && pos.technical.data?.trend?.trend) {
          console.log(`      Trend: ${pos.technical.data.trend.trend.direction}`);
        }
      });
    }

    if (entry.actualData) {
      const actual = entry.actualData as any;
      console.log(`\nResolution Data:`);
      console.log(`  Resolved by: ${actual?.resolvedBy || 'N/A'}`);
      console.log(`  Directional positions evaluated: ${actual?.directionalPositionsEvaluated || 0}`);
      console.log(`  Total positions in entry: ${actual?.totalPositionsInEntry || 0}`);
      console.log(`  Correct count: ${actual?.correctCount || 0}`);
      console.log(`  Incorrect count: ${actual?.incorrectCount || 0}`);

      if (actual?.positions && actual.positions.length > 0) {
        console.log(`\n  Position Results:`);
        actual.positions.slice(0, 2).forEach((pos: any, idx: number) => {
          console.log(`    Position ${idx + 1}: ${pos.symbol}`);
          console.log(`      Direction: ${pos.direction}`);
          console.log(`      Price at creation: ${pos.priceAtCreation}`);
          console.log(`      Price at resolution: ${pos.priceAtResolution}`);
          console.log(`      Pct change: ${pos.pctChange}%`);
          console.log(`      Call correct: ${pos.callCorrect}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }

  await prisma.$disconnect();
}

auditResolutionDetails().catch(console.error);
