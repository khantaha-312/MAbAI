import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { PriceBarService } from '../price-bar/price-bar.service';
import { EvidencePackage, unavailable } from './evidence-package.types';

type SupportedAssetType = 'crypto' | 'equity' | 'forex' | 'metal' | 'oil';
const LIVE_BACKFILL_ASSET_TYPES: ReadonlySet<SupportedAssetType> = new Set(['equity', 'crypto']);

@Injectable()
export class EvidencePackageService {
  private readonly logger = new Logger(EvidencePackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketData: MarketDataService,
    private readonly technicalAnalysis: TechnicalAnalysisService,
    private readonly priceBarService: PriceBarService, // new
  ) {}

  private async getPriceFor(assetType: SupportedAssetType, symbol: string): Promise<number | null> {
    switch (assetType) {
      case 'crypto': return this.marketData.getCryptoPriceUsd(symbol);
      case 'equity': return this.marketData.getEquityPriceUsd(symbol);
      case 'forex': return this.marketData.getForexRate(symbol);
      case 'metal': return this.marketData.getMetalPriceUsd(symbol);
      case 'oil': return this.marketData.getOilPriceUsd(symbol as 'WTI' | 'BRENT');
      default: return null;
    }
  }

  async buildEvidencePackage(symbol: string, assetType: string): Promise<EvidencePackage> {
    const timestamp = new Date().toISOString();
    const typedAssetType = assetType as SupportedAssetType;

    let instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });

    const dataFreshness: { section: string; asOf: string | null }[] = [];
    const sources: string[] = [];

    // --- Market section ---
    let market: EvidencePackage['market'];
    const price = await this.getPriceFor(typedAssetType, symbol);
    if (price === null) {
      market = unavailable(`No current price available for ${symbol} (${assetType})`);
    } else {
      market = { available: true, data: { price, assetType }, source: 'MarketDataService' };
      dataFreshness.push({ section: 'market', asOf: timestamp });
      sources.push('MarketDataService');
    }

    // --- Technical section ---
    let technical: EvidencePackage['technical'];

    if (LIVE_BACKFILL_ASSET_TYPES.has(typedAssetType)) {
      // Equity/crypto: live-fetch and backfill if history is missing or too
      // thin, then run technical analysis. First request for a never-seen
      // symbol costs ~1-2s extra for the fetch + DB writes; every request
      // after that is instant since the data now persists.
      try {
        const backfillResult = await this.priceBarService.ensureHistory(
          symbol,
          typedAssetType as 'equity' | 'crypto',
          90,
        );
        instrument = { id: backfillResult.instrumentId } as typeof instrument; // keep instrumentId in sync for the response below

        const aggregate = await this.technicalAnalysis.getAggregate(symbol, assetType);
        technical = {
          available: true,
          data: aggregate,
          source: `TechnicalAnalysisService (${aggregate.barsUsed} bars used${
            backfillResult.freshlyBackfilled ? ', live-backfilled this request' : ''
          })`,
        };
        dataFreshness.push({ section: 'technical', asOf: timestamp });
        sources.push('TechnicalAnalysisService');
      } catch (err) {
        this.logger.error(`Live backfill/technical analysis failed for ${symbol} (${assetType})`, err);
        technical = unavailable(
          `Could not fetch or compute technical data for ${symbol}: ${(err as Error).message}`,
        );
      }
    } else if (!instrument) {
      // forex/metal/oil: no historical-fetch method exists yet on
      // MarketDataService, so this stays a hard "not available" for now.
      technical = unavailable('Instrument not found — no PriceBar history to analyze. Backfill required.');
    } else {
      const aggregate = await this.technicalAnalysis.getAggregate(symbol, assetType);
      technical = {
        available: true,
        data: aggregate,
        source: `TechnicalAnalysisService (${aggregate.barsUsed} bars used)`,
      };
      dataFreshness.push({ section: 'technical', asOf: timestamp });
      sources.push('TechnicalAnalysisService');
    }

    // --- Fundamental section ---
    let fundamental: EvidencePackage['fundamental'];
    if (assetType !== 'equity') {
      fundamental = unavailable(`Fundamental data only available for equities, not ${assetType}`);
    } else {
      const fundamentals = await this.marketData.getEquityFundamentals(symbol);
      if (fundamentals === null) {
        fundamental = unavailable(`No fundamental data available for ${symbol} from Finnhub`);
      } else {
        fundamental = {
          available: true,
          data: fundamentals,
          source: 'Finnhub (field mappings unverified — see FinnhubAdapter debug log)',
        };
        dataFreshness.push({ section: 'fundamental', asOf: timestamp });
        sources.push('Finnhub');
      }
    }

    const macro = unavailable('Macro Analysis engine not yet implemented in EvidencePackageService — real MacroAnalysisService exists elsewhere but is not wired here');
    const news = unavailable('News Intelligence engine not yet implemented in EvidencePackageService — MarketDataService.getCompanyNews/getNewsSentiment exist but are not wired here');
    const sentiment = unavailable('Sentiment Analysis engine not yet implemented');
    const portfolio = unavailable('Portfolio Risk engine not yet implemented');
    const behavioral = unavailable('Behavioral Analysis engine not yet implemented');

    return {
      symbol,
      assetType,
      instrumentId: instrument?.id ?? null,
      timestamp,
      market,
      technical,
      fundamental,
      macro,
      news,
      sentiment,
      portfolio,
      behavioral,
      dataFreshness,
      sources,
    };
  }
}