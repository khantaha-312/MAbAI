/**
 * ONE-TIME MANUAL SCRIPT — Priority 3 punch list.
 *
 * Backfills ~90 days of PriceBar history for a small fixed set of major
 * crypto symbols, so RSI/MACD/SMA/EMA have real data instead of N/A.
 *
 * NOT wired into any request path. Run once manually, then done — the
 * data persists in Postgres and every future report for these symbols
 * benefits, no per-user or per-request backfill needed.
 *
 * IMPORTANT: Instrument.symbol is stored as the real ticker (e.g. "BTC"),
 * matching what EvidencePackageService/report-analysis.tsx look up
 * (symbol_assetType: { symbol: 'BTC', assetType: 'crypto' }).
 * CoinGecko's historical-price endpoint needs its own coin ID format
 * (e.g. "bitcoin"), which is ONLY used for the fetch call below — it is
 * never written to the Instrument row. This deliberately does not reuse
 * PriceBarService.backfillCryptoHistory(), because that method writes
 * the coinId itself as Instrument.symbol (a real gap — SymbolMapping
 * table exists for this but isn't wired in yet). Reusing it here would
 * create Instrument{ symbol: "bitcoin" } and reports would still show
 * N/A. Fetch logic is reused (MarketDataService.getCryptoHistoricalPricesUsd);
 * the instrument-naming step is not.
 *
 * Run with (adjust to match your project's actual ts-node invocation,
 * e.g. if seed-portfolio.ts uses a different command):
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-crypto-majors.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; // adjust path if your app module lives elsewhere
import { PrismaService } from '../src/prisma/prisma.service';
import { MarketDataService } from '../src/market-data/market-data.service';

// Ticker (real Instrument.symbol, matches what the frontend/report path
// looks up) -> CoinGecko coin ID (only used for the API fetch below).
const SYMBOLS: { ticker: string; coinId: string }[] = [
  { ticker: 'BTC', coinId: 'bitcoin' },
  { ticker: 'ETH', coinId: 'ethereum' },
  { ticker: 'SOL', coinId: 'solana' },
];

const DAYS = 90;
const ASSET_TYPE = 'crypto';

async function backfillOne(
  prisma: PrismaService,
  marketData: MarketDataService,
  ticker: string,
  coinId: string,
  days: number,
): Promise<{ ticker: string; barsWritten: number }> {
  console.log(`\n--- ${ticker} (coinId: ${coinId}) ---`);

  const bars = await marketData.getCryptoHistoricalPricesUsd(ticker, days);

  if (!bars || bars.length === 0) {
    console.warn(`No historical bars returned for ${ticker} (coinId: ${coinId}) — skipping`);
    return { ticker, barsWritten: 0 };
  }

  console.log(`Fetched ${bars.length} bars for ${ticker}`);

  // Instrument row uses the real ticker, NOT the coinId.
  const instrument = await prisma.instrument.upsert({
    where: { symbol_assetType: { symbol: ticker, assetType: ASSET_TYPE } },
    update: {},
    create: { symbol: ticker, assetType: ASSET_TYPE, name: ticker },
  });

  let written = 0;
  for (const bar of bars) {
    await prisma.priceBar.upsert({
      where: {
        instrumentId_timestamp: {
          instrumentId: instrument.id,
          timestamp: new Date(bar.date),
        },
      },
      update: {
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? 0,
      },
      create: {
        instrumentId: instrument.id,
        timestamp: new Date(bar.date),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? 0,
      },
    });
    written++;
  }

  console.log(`Wrote ${written} PriceBar rows for ${ticker} (instrumentId: ${instrument.id})`);
  return { ticker, barsWritten: written };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const marketData = app.get(MarketDataService);

    const results: { ticker: string; barsWritten: number }[] = [];
    for (const { ticker, coinId } of SYMBOLS) {
      const result = await backfillOne(prisma, marketData, ticker, coinId, DAYS);
      results.push(result);
    }

    console.log('\n=== Backfill summary ===');
    for (const r of results) {
      console.log(`${r.ticker}: ${r.barsWritten} bars`);
    }
  } finally {
    await app.close();
  }
}

main()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Backfill script failed:', err);
    process.exit(1);
  });