import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.instrument.upsert({
    where: { symbol_assetType: { symbol: 'AAPL', assetType: 'equity' } },
    update: {},
    create: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'equity',
    },
  });

  await prisma.instrument.upsert({
    where: { symbol_assetType: { symbol: 'BTC', assetType: 'crypto' } },
    update: {},
    create: {
      symbol: 'BTC',
      name: 'Bitcoin',
      assetType: 'crypto',
    },
  });

  console.log('Seeded 2 test instruments: AAPL, BTC');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });