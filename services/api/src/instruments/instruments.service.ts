import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';

export interface SearchResult {
  symbol: string;      // Display ticker, always
  providerId?: string; // Crypto only: CoinGecko id, required for price lookups
  name: string;
  assetType: string;
}

const RESULT_LIMIT = 10;

// Real, stable majors — forex/metal/oil providers (Frankfurter, gold-api, EIA)
// expose no symbol-search endpoint, so these known values are matched
// in-process rather than faked as a "live" call that doesn't exist.
const MAJOR_FOREX: SearchResult[] = [
  { symbol: 'EUR', name: 'Euro', assetType: 'forex' },
  { symbol: 'GBP', name: 'British Pound', assetType: 'forex' },
  { symbol: 'JPY', name: 'Japanese Yen', assetType: 'forex' },
  { symbol: 'AUD', name: 'Australian Dollar', assetType: 'forex' },
  { symbol: 'CAD', name: 'Canadian Dollar', assetType: 'forex' },
  { symbol: 'CHF', name: 'Swiss Franc', assetType: 'forex' },
];

const MAJOR_METALS: SearchResult[] = [
  { symbol: 'XAU', name: 'Gold', assetType: 'metal' },
  { symbol: 'XAG', name: 'Silver', assetType: 'metal' },
];

const MAJOR_OIL: SearchResult[] = [
  { symbol: 'WTI', name: 'WTI Crude Oil', assetType: 'oil' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', assetType: 'oil' },
];

const ALL_MAJORS = [...MAJOR_FOREX, ...MAJOR_METALS, ...MAJOR_OIL];

// Lower score = higher relevance. Ordering, in priority:
// 1. Exact ticker match on a plain equity/major (AAPL === AAPL)
// 2. Exact ticker match on anything else (e.g. a crypto wrapper token)
// 3. Ticker starts with the query, plain equity
// 4. Ticker starts with the query, anything else
// 5. Foreign-dual equity symbols (contain a '.', e.g. AAPL.MX)
// 6. Everything else (name-only matches, tokenized-stock wrappers, etc.)
function scoreResult(r: SearchResult, query: string): number {
  const symbol = r.symbol.toUpperCase();
  const q = query.toUpperCase();
  const isForeignDual = symbol.includes('.');
  const isExact = symbol === q;
  const startsWith = symbol.startsWith(q);
  const isPlainEquity = r.assetType === 'equity' && !isForeignDual;

  if (isExact && isPlainEquity) return 0;
  if (isExact) return 1;
  if (startsWith && isPlainEquity) return 2;
  if (startsWith) return 3;
  if (isForeignDual) return 4;
  return 5;
}

@Injectable()
export class InstrumentsService {
  private readonly logger = new Logger(InstrumentsService.name);

  constructor(private readonly marketData: MarketDataService) {}

  async search(q: string, assetType?: string): Promise<SearchResult[]> {
    const query = q.toLowerCase();

    const searchEquities = !assetType || assetType === 'equity';
    const searchCrypto = !assetType || assetType === 'crypto';
    const searchMajors = !assetType || ['forex', 'metal', 'oil'].includes(assetType);

    const [equityResults, cryptoResults] = await Promise.all([
      searchEquities ? this.searchEquities(query) : Promise.resolve([]),
      searchCrypto ? this.searchCrypto(query) : Promise.resolve([]),
    ]);

    const majorResults = searchMajors
      ? ALL_MAJORS.filter(
          (m) =>
            (!assetType || m.assetType === assetType) &&
            (m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)),
        )
      : [];

    const combined = [...equityResults, ...cryptoResults, ...majorResults];

    // Dedupe identical symbol+assetType pairs (e.g. Finnhub and a majors
    // entry both matching "EUR" would never happen across providers, but
    // this guards against any future overlap cheaply).
    const seen = new Set<string>();
    const deduped = combined.filter((r) => {
      const key = `${r.symbol}:${r.assetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => scoreResult(a, q) - scoreResult(b, q));

    return deduped.slice(0, RESULT_LIMIT);
  }

  private async searchEquities(query: string): Promise<SearchResult[]> {
    const results = await this.marketData.searchEquitySymbols(query);
    if (!results) {
      return [];
    }
    return results
      .filter((r) => r.type === 'Common Stock')
      .map((r) => ({ symbol: r.symbol, name: r.description, assetType: 'equity' }));
  }

  private async searchCrypto(query: string): Promise<SearchResult[]> {
    const results = await this.marketData.searchCryptoSymbols(query);
    if (!results) {
      return [];
    }
    return results.map((r) => ({
      symbol: r.symbol.toUpperCase(),
      providerId: r.id,
      name: r.name,
      assetType: 'crypto',
    }));
  }
}