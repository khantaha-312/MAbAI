import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { MarketDataCacheService } from '../market-data/market-data-cache.service';

export interface MacroSection<T> {
  available: boolean;
  data: T | null;
  reason?: string;
  source: string | null;
}

export interface MacroSnapshot {
  timestamp: string;
  oil: MacroSection<{ wti: number | null; brent: number | null }>;
  gold: MacroSection<{ priceUsd: number }>;
  usdStrength: MacroSection<{ pairs: Record<string, number> }>;
  interestRates: MacroSection<never>;
  inflation: MacroSection<never>;
  majorIndices: MacroSection<never>;
}

@Injectable()
export class MacroAnalysisService {
  private readonly logger = new Logger(MacroAnalysisService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly cacheService: MarketDataCacheService,
  ) {}

  async getMacroSnapshot(): Promise<MacroSnapshot> {
    const timestamp = new Date().toISOString();

    const [wti, brent] = await Promise.all([
      this.cacheService.get(
        'oil:price:WTI',
        () => this.marketData.getOilPriceUsd('WTI'),
        300000, // 5 minutes TTL for macro snapshot
      ),
      this.cacheService.get(
        'oil:price:BRENT',
        () => this.marketData.getOilPriceUsd('BRENT'),
        300000, // 5 minutes TTL for macro snapshot
      ),
    ]);
    const oil: MacroSnapshot['oil'] =
      wti === null && brent === null
        ? { available: false, data: null, reason: 'EIA returned no oil price data', source: null }
        : { available: true, data: { wti, brent }, source: 'EIA' };

    // "XAU" is gold-api.com's standard gold symbol convention — not yet
    // independently confirmed against this specific adapter's real response.
    // If this comes back null in the e2e test, that's the first thing to check.
    const goldPrice = await this.cacheService.get(
      'metal:price:XAU',
      () => this.marketData.getMetalPriceUsd('XAU'),
      300000, // 5 minutes TTL for macro snapshot
    );
    const gold: MacroSnapshot['gold'] =
      goldPrice === null
        ? { available: false, data: null, reason: 'gold-api returned no price data for symbol XAU', source: null }
        : { available: true, data: { priceUsd: goldPrice }, source: 'gold-api' };

    const majorPairs = ['EUR', 'GBP', 'JPY'];
    const rates: Record<string, number> = {};
    for (const code of majorPairs) {
      const rate = await this.cacheService.get(
        `forex:rate:${code}`,
        () => this.marketData.getForexRate(code),
        300000, // 5 minutes TTL for macro snapshot
      );
      if (rate !== null) rates[code] = rate;
    }
    const usdStrength: MacroSnapshot['usdStrength'] =
      Object.keys(rates).length === 0
        ? { available: false, data: null, reason: 'Frankfurter returned no exchange rate data', source: null }
        : { available: true, data: { pairs: rates }, source: 'Frankfurter' };

    return {
      timestamp,
      oil,
      gold,
      usdStrength,
      interestRates: { available: false, data: null, reason: 'No provider currently supplies interest rate data', source: null },
      inflation: { available: false, data: null, reason: 'No provider currently supplies inflation data', source: null },
      majorIndices: { available: false, data: null, reason: 'No provider currently supplies index-level data', source: null },
    };
  }
}