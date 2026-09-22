import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { PriceBarService } from '../price-bar/price-bar.service';
import { NewsSentimentService } from '../news-sentiment/news-sentiment.service';
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
    private readonly priceBarService: PriceBarService,
    private readonly newsSentimentService: NewsSentimentService,
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
    // `timestamp` represents PACKAGE-GENERATION time only — when this
    // function started. It must never be reused as a stand-in for a
    // section's own retrieval time; each section that has real data
    // captures its own *Retrieved At value immediately after its actual
    // fetch/computation resolves. (This comment added as part of the
    // Phase 2 audit fix below — market/technical already followed this
    // correctly; fundamental/news/sentiment did not, until now.)
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
    const marketRetrievedAt = new Date().toISOString();
    if (price === null) {
      market = unavailable(`No current price available for ${symbol} (${assetType})`);
    } else {
      market = { available: true, data: { price, assetType }, source: 'MarketDataService' };
      dataFreshness.push({ section: 'market', asOf: marketRetrievedAt });
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
        const technicalRetrievedAt = new Date().toISOString();
        technical = {
          available: true,
          data: aggregate,
          source: `TechnicalAnalysisService (${aggregate.barsUsed} bars used${
            backfillResult.freshlyBackfilled ? ', live-backfilled this request' : ''
          })`,
        };
        dataFreshness.push({ section: 'technical', asOf: technicalRetrievedAt });
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
      const technicalRetrievedAt = new Date().toISOString();
      technical = {
        available: true,
        data: aggregate,
        source: `TechnicalAnalysisService (${aggregate.barsUsed} bars used)`,
      };
      dataFreshness.push({ section: 'technical', asOf: technicalRetrievedAt });
      sources.push('TechnicalAnalysisService');
    }

     // --- Fundamental section ---
    let fundamental: EvidencePackage['fundamental'];
    if (assetType === 'crypto') {
      const tokenomics = await this.marketData.getCryptoTokenomics(symbol);
      // FIX (Phase 2 audit): capture retrieval time right after the real
      // CoinGecko call resolves, not the function-entry `timestamp`. Same
      // defect class already fixed for market/technical.
      const fundamentalRetrievedAt = new Date().toISOString();
      if (tokenomics) {
        fundamental = {
          available: true,
          data: {
            calculationVersion: 'crypto-fa-v1',
            tokenomics: { available: true, data: { ...tokenomics } },
            onChain: {
              available: false,
              reason: 'Phase 1b — provider not yet selected (Glassnode paid tier likely required; free-tier on-chain data not currently reliable)',
            },
          },
          source: 'CoinGecko (crypto-fa-v1)',
        };
        dataFreshness.push({ section: 'fundamental', asOf: fundamentalRetrievedAt });
        sources.push('CoinGecko');
      } else {
        fundamental = unavailable(`CoinGecko returned no tokenomics data for ${symbol}`);
      }
    } else if (assetType !== 'equity') {
      fundamental = unavailable(`Fundamental data only available for equities and crypto, not ${assetType}`);
    } else {
      const fundamentals = await this.marketData.getEquityFundamentals(symbol);
      // FIX (Phase 2 audit): same correction, equity branch — capture
      // right after the real Finnhub call resolves.
      const fundamentalRetrievedAt = new Date().toISOString();
      if (fundamentals === null) {
        fundamental = unavailable(`No fundamental data available for ${symbol} from Finnhub`);
      } else {
        fundamental = {
          available: true,
          data: fundamentals,
          source: `Finnhub (${fundamentals.calculationVersion} — field mappings verified in FinnhubAdapter)`,
        };
        dataFreshness.push({ section: 'fundamental', asOf: fundamentalRetrievedAt });
        sources.push('Finnhub');
      }
    }

    const macro = unavailable('Macro Analysis engine not yet implemented in EvidencePackageService — real MacroAnalysisService exists elsewhere but is not wired here');

    // --- News + Sentiment section ---
    let news: EvidencePackage['news'];
    let sentiment: EvidencePackage['sentiment'];

    if (assetType !== 'equity') {
      news = unavailable(`News data only available for equities, not ${assetType}`);
      sentiment = unavailable(`Sentiment data only available for equities, not ${assetType}`);
    } else {
      try {
        const newsSentimentResult = await this.newsSentimentService.getNewsAndSentiment(symbol, true);
        // FIX (Phase 2 audit): captured once, right after the single real
        // call that produces BOTH news and sentiment data. Deliberately
        // ONE shared variable, not two separate ones — news and sentiment
        // come from the same retrieval event, and an existing test
        // (`news and sentiment share the same retrieval timestamp when
        // both are available`) already encodes that as intentional. This
        // fix makes that test pass for the right reason (a real shared
        // retrieval timestamp) instead of the previous coincidental
        // reason (both wrongly reusing the outer package `timestamp`).
        const newsRetrievedAt = new Date().toISOString();

        if (!newsSentimentResult.available) {
          news = unavailable(newsSentimentResult.reason ?? 'No news data available');
          sentiment = unavailable('No sentiment data available');
        } else {
          news = {
            available: true,
            data: {
              articles: newsSentimentResult.articles,
              articleCount: newsSentimentResult.articleCount,
            },
            source: 'Finnhub News',
          };

          if (newsSentimentResult.sentiment.available) {
            sentiment = {
              available: true,
              data: {
                positivePercent: newsSentimentResult.sentiment.positivePercent,
                neutralPercent: newsSentimentResult.sentiment.neutralPercent,
                negativePercent: newsSentimentResult.sentiment.negativePercent,
                source: newsSentimentResult.sentiment.source,
                modelDerived: newsSentimentResult.sentiment.modelDerived,
              },
              source: newsSentimentResult.sentiment.source ?? 'Alpha Vantage',
            };
            dataFreshness.push({ section: 'sentiment', asOf: newsRetrievedAt });
            sources.push(newsSentimentResult.sentiment.source ?? 'Alpha Vantage');
          } else {
            sentiment = unavailable(newsSentimentResult.sentiment.reason ?? 'Sentiment not available (rate-limited or no data)');
          }

          dataFreshness.push({ section: 'news', asOf: newsRetrievedAt });
          sources.push('Finnhub News');
        }
      } catch (err) {
        this.logger.error(`News/sentiment fetch failed for ${symbol} (${assetType})`, err);
        news = unavailable(`Could not fetch news for ${symbol}: ${(err as Error).message}`);
        sentiment = unavailable(`Could not fetch sentiment for ${symbol}: ${(err as Error).message}`);
      }
    }
    const portfolio = unavailable('Portfolio Risk engine not yet implemented — real RiskEngineService exists elsewhere but is not wired here (audited, working standalone, ready to wire in future pass)');
    const behavioral = unavailable('Behavioral Analysis engine not yet implemented — real BehavioralAnalysisService exists elsewhere but is not wired here (audited, working standalone, ready to wire in future pass)');

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