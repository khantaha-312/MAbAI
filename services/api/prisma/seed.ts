import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real, stable majors — not thousands of entries, just the well-known
// symbols across asset types Finnhub's equity-only endpoints don't cover.
const MAJOR_CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'AVAX', name: 'Avalanche' },
];

const MAJOR_FOREX = [
  { symbol: 'EUR', name: 'Euro' },
  { symbol: 'GBP', name: 'British Pound' },
  { symbol: 'JPY', name: 'Japanese Yen' },
  { symbol: 'AUD', name: 'Australian Dollar' },
  { symbol: 'CAD', name: 'Canadian Dollar' },
  { symbol: 'CHF', name: 'Swiss Franc' },
];

const MAJOR_METALS = [
  { symbol: 'XAU', name: 'Gold' },
  { symbol: 'XAG', name: 'Silver' },
];

const MAJOR_OIL = [
  { symbol: 'WTI', name: 'WTI Crude Oil' },
  { symbol: 'BRENT', name: 'Brent Crude Oil' },
];

async function seedMajors() {
  const rows = [
    ...MAJOR_CRYPTO.map((i) => ({ ...i, assetType: 'crypto' })),
    ...MAJOR_FOREX.map((i) => ({ ...i, assetType: 'forex' })),
    ...MAJOR_METALS.map((i) => ({ ...i, assetType: 'metal' })),
    ...MAJOR_OIL.map((i) => ({ ...i, assetType: 'oil' })),
  ];

  const result = await prisma.instrument.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} major crypto/forex/metal/oil instruments`);
}

interface FinnhubSymbolListItem {
  currency: string;
  description: string;
  symbol: string;
  type: string;
  mic: string;
}

async function seedEquities() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('FINNHUB_API_KEY not set — skipping equity seed. Run again once configured.');
    return;
  }

  const url = `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Finnhub symbol list returned ${response.status} — skipping equity seed.`);
    return;
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    console.warn('Finnhub symbol list returned unexpected shape — skipping equity seed.');
    return;
  }

  // Real filter, not arbitrary: common stock only, USD-denominated only,
  // excludes OTC pink sheets/ADRs/foreign duals/warrants etc. This is a
  // deliberate scope decision — expand later if OTC/international coverage
  // is wanted, but common-stock US equities is the correct default for a
  // typeahead search bar aimed at retail traders researching US markets.
  const filtered = (data as FinnhubSymbolListItem[]).filter(
    (item) =>
      item.type === 'Common Stock' &&
      item.currency === 'USD' &&
      item.mic !== 'OOTC' &&
      !item.symbol.includes('.'),
  );

  const rows = filtered.map((item) => ({
    symbol: item.symbol,
    name: item.description,
    assetType: 'equity',
  }));

  const result = await prisma.instrument.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} US equity instruments (filtered from ${data.length} total)`);
}

async function main() {
  await seedMajors();
  await seedEquities();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });