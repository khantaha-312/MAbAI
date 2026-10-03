import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env (same pattern as other scripts)
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

// Preflight check: verify DATABASE_URL is present without exposing its value
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not found.');
  console.error('Expected location: .env file at project root');
  console.error('Please ensure the root .env file contains DATABASE_URL.');
  console.error('See .env.example for the required format.');
  process.exit(1);
}

console.log('✓ DATABASE_URL is present (connection string not shown for security)\n');

const prisma = new PrismaClient();

async function auditDataCounts() {
  console.log('=== MAbAI Data Audit - Read-Only ===\n');

  // User counts
  const userCount = await prisma.user.count();
  console.log(`Total Users: ${userCount}`);

  // ReportHistoryEntry counts
  const reportCount = await prisma.reportHistoryEntry.count();
  console.log(`Total ReportHistoryEntry records: ${reportCount}`);

  // Reports per user
  const reportsByUser = await prisma.reportHistoryEntry.groupBy({
    by: ['userId'],
    _count: true,
  });
  console.log('\nReports per user:');
  for (const group of reportsByUser) {
    console.log(`  User ${group.userId}: ${group._count} reports`);
  }

  // LedgerEntry counts
  const ledgerCount = await prisma.ledgerEntry.count();
  console.log(`\nTotal LedgerEntry records: ${ledgerCount}`);

  // LedgerEntry by status
  const ledgerByStatus = await prisma.ledgerEntry.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('\nLedgerEntry by status:');
  for (const group of ledgerByStatus) {
    console.log(`  ${group.status}: ${group._count}`);
  }

  // LedgerEntry by outcome (resolved only)
  const ledgerByOutcome = await prisma.ledgerEntry.groupBy({
    by: ['outcome'],
    _count: true,
    where: { status: 'resolved' },
  });
  console.log('\nLedgerEntry by outcome (resolved only):');
  for (const group of ledgerByOutcome) {
    console.log(`  ${group.outcome}: ${group._count}`);
  }

  // LedgerEntry by user
  const ledgerByUser = await prisma.ledgerEntry.groupBy({
    by: ['userId'],
    _count: true,
  });
  console.log('\nLedgerEntry by user:');
  for (const group of ledgerByUser) {
    console.log(`  User ${group.userId}: ${group._count} entries`);
  }

  // LedgerEntry by modelName
  const ledgerByModel = await prisma.ledgerEntry.groupBy({
    by: ['modelName'],
    _count: true,
  });
  console.log('\nLedgerEntry by modelName:');
  for (const group of ledgerByModel) {
    console.log(`  ${group.modelName}: ${group._count} entries`);
  }

  // Check for LedgerEntry with reportHistoryId in inputSnapshot
  const allLedgerEntries = await prisma.ledgerEntry.findMany({
    select: {
      id: true,
      userId: true,
      modelName: true,
      status: true,
      outcome: true,
      inputSnapshot: true,
      createdAt: true,
    },
  });

  console.log('\nLedgerEntry with reportHistoryId in inputSnapshot:');
  let reportLinkedCount = 0;
  for (const entry of allLedgerEntries) {
    const snapshot = entry.inputSnapshot as any;
    if (snapshot?.reportHistoryId) {
      reportLinkedCount++;
    }
  }
  console.log(`  Total with reportHistoryId: ${reportLinkedCount}`);

  // Sample recent entries to understand data structure
  console.log('\nSample of recent LedgerEntry records:');
  const recentEntries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      userId: true,
      modelName: true,
      status: true,
      outcome: true,
      createdAt: true,
    },
  });
  for (const entry of recentEntries) {
    console.log(`  ${entry.id}: userId=${entry.userId}, model=${entry.modelName}, status=${entry.status}, outcome=${entry.outcome}`);
  }

  // Sample recent ReportHistoryEntry records
  console.log('\nSample of recent ReportHistoryEntry records:');
  const recentReports = await prisma.reportHistoryEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      userId: true,
      symbol: true,
      assetType: true,
      narrative: true,
      createdAt: true,
    },
  });
  for (const report of recentReports) {
    console.log(`  ${report.id}: userId=${report.userId}, symbol=${report.symbol}, assetType=${report.assetType}, hasNarrative=${!!report.narrative}`);
  }

  await prisma.$disconnect();
}

auditDataCounts().catch(console.error);
