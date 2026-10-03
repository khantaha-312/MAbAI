import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not found.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function diagnoseWinRate() {
  console.log('=== MAbAI Win Rate Diagnosis - Read-Only ===\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`Total Users: ${users.length}\n`);

  for (const user of users) {
    console.log(`--- User ${user.id} (${user.email}) ---`);

    // Total ledger entries for this user
    const totalEntries = await prisma.ledgerEntry.count({
      where: { userId: user.id },
    });
    console.log(`Total Ledger Entries: ${totalEntries}`);

    // Entries by status
    const byStatus = await prisma.ledgerEntry.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    });
    console.log('By Status:');
    for (const group of byStatus) {
      console.log(`  ${group.status}: ${group._count}`);
    }

    // Resolved entries by outcome
    const byOutcome = await prisma.ledgerEntry.groupBy({
      by: ['outcome'],
      where: { userId: user.id, status: 'resolved' },
      _count: true,
    });
    console.log('By Outcome (resolved only):');
    for (const group of byOutcome) {
      console.log(`  ${group.outcome}: ${group._count}`);
    }

    // Calculate win rate per documented logic
    const resolvedEntries = await prisma.ledgerEntry.findMany({
      where: { userId: user.id, status: 'resolved' },
      select: { outcome: true },
    });

    const resolvedCount = resolvedEntries.length;
    const counts = { correct: 0, incorrect: 0, partial: 0 };
    for (const entry of resolvedEntries) {
      if (entry.outcome === 'correct' || entry.outcome === 'incorrect' || entry.outcome === 'partial') {
        counts[entry.outcome]++;
      }
    }

    const decisive = counts.correct + counts.incorrect;
    const winRatePct = decisive > 0 ? (counts.correct / decisive) * 100 : 0;

    console.log('\nWin Rate Calculation:');
    console.log(`  Resolved Count: ${resolvedCount}`);
    console.log(`  Correct: ${counts.correct}`);
    console.log(`  Incorrect: ${counts.incorrect}`);
    console.log(`  Partial: ${counts.partial}`);
    console.log(`  Decisive (correct + incorrect): ${decisive}`);
    console.log(`  Win Rate: ${winRatePct.toFixed(2)}%`);

    // Check modelName distribution
    const byModel = await prisma.ledgerEntry.groupBy({
      by: ['modelName'],
      where: { userId: user.id },
      _count: true,
    });
    console.log('\nBy ModelName:');
    for (const group of byModel) {
      console.log(`  ${group.modelName}: ${group._count}`);
    }

    // Check reportHistoryId presence
    const allEntries = await prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      select: { id: true, inputSnapshot: true },
    });
    let withReportHistoryId = 0;
    for (const entry of allEntries) {
      const snapshot = entry.inputSnapshot as any;
      if (snapshot?.reportHistoryId) {
        withReportHistoryId++;
      }
    }
    console.log(`\nEntries with reportHistoryId in inputSnapshot: ${withReportHistoryId} / ${totalEntries}`);

    // Sample recent entries with full details
    console.log('\nSample Recent Entries (last 5):');
    const recentEntries = await prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
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

    for (const entry of recentEntries) {
      console.log(`\n  Entry ID: ${entry.id}`);
      console.log(`    Model: ${entry.modelName}`);
      console.log(`    Status: ${entry.status}`);
      console.log(`    Outcome: ${entry.outcome || 'N/A'}`);
      console.log(`    Created: ${entry.createdAt.toISOString()}`);
      console.log(`    Resolved: ${entry.resolvedAt?.toISOString() || 'N/A'}`);

      const snapshot = entry.inputSnapshot as any;
      console.log(`    Has reportHistoryId: ${!!snapshot?.reportHistoryId}`);
      console.log(`    Has symbol: ${!!snapshot?.symbol}`);
      console.log(`    Has positions: ${!!snapshot?.positions && snapshot.positions.length > 0}`);

      if (entry.actualData) {
        const actual = entry.actualData as any;
        console.log(`    Resolved by: ${actual?.resolvedBy || 'N/A'}`);
        if (actual?.positions) {
          console.log(`    Positions evaluated: ${actual.positions.length}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  await prisma.$disconnect();
}

diagnoseWinRate().catch(console.error);
