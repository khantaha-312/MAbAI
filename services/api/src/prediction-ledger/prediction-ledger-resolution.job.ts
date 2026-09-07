import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionLedgerService } from './prediction-ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import type { LedgerEntry } from '@prisma/client';

/**
 * Resolution window — see prior reasoning, unchanged: 7 days gives the
 * trend engine's daily-bar indicators (SMA20/50, MACD, RSI) room to play
 * out before grading.
 */
const RESOLUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type SupportedAssetType = 'crypto' | 'equity' | 'forex' | 'metal' | 'oil';
type TrendDirection = 'bullish' | 'bearish' | 'mixed' | 'insufficient_evidence';

/**
 * Confirmed real shape, traced end to end from AiOrchestrationService.
 * generateNarrativeForPortfolio -> EvidencePackageService.buildEvidencePackage
 * -> TechnicalAnalysisService.getAggregate -> getTrend -> determineTrend.
 * Only the fields this job actually reads are typed here.
 */
interface PositionTechnicalSection {
  available: boolean;
  data?: {
    trend: {
      trend: {
        direction: TrendDirection;
        strength: number | null;
        evidenceCount: number;
      };
    };
  };
}

interface PositionSnapshot {
  symbol: string;
  assetType: SupportedAssetType;
  currentPriceUsd: number | null;
  technical: PositionTechnicalSection;
}

interface PortfolioInputSnapshot {
  portfolioName?: string;
  positions?: PositionSnapshot[];
}

interface PositionResolution {
  symbol: string;
  direction: TrendDirection;
  priceAtCreation: number;
  priceAtResolution: number;
  pctChange: number;
  callCorrect: boolean;
}

@Injectable()
export class PredictionLedgerResolutionJob {
  private readonly logger = new Logger(PredictionLedgerResolutionJob.name);

  constructor(
    private readonly ledgerService: PredictionLedgerService,
    private readonly marketData: MarketDataService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    const cutoff = new Date(Date.now() - RESOLUTION_WINDOW_MS);
    const candidates = await this.ledgerService.findPendingOlderThan(cutoff);

    let resolved = 0;
    let skippedNoDirectionalPositions = 0;

    for (const entry of candidates) {
      const result = await this.resolveOne(entry);
      if (result.resolved) resolved++;
      else skippedNoDirectionalPositions++;
    }

    this.logger.log(
      `Resolution run: ${candidates.length} candidate(s), ${resolved} resolved, ` +
        `${skippedNoDirectionalPositions} skipped (no directional positions or no price data)`,
    );
  }

  /**
   * Aggregation rule (product judgment call, not confirmed anywhere in the
   * codebase — flagged for sign-off):
   * - every directional position's call correct  -> entry outcome 'correct'
   * - every directional position's call incorrect -> entry outcome 'incorrect'
   * - a mix of correct/incorrect, OR only some positions had a directional
   *   call at all (others mixed/insufficient_evidence/unavailable)
   *      -> entry outcome 'partial'
   * - zero positions had any directional call -> not resolved, stays pending
   */
  async resolveOne(entry: LedgerEntry): Promise<{ resolved: boolean; outcome?: string; positionResults?: PositionResolution[] }> {
    const snapshot = entry.inputSnapshot as unknown as PortfolioInputSnapshot;
    const positions = snapshot?.positions ?? [];

    const positionResults: PositionResolution[] = [];
    let totalDirectionalPositions = 0;

    for (const position of positions) {
      const direction = position.technical?.available ? position.technical.data?.trend.trend.direction : undefined;

      if (direction !== 'bullish' && direction !== 'bearish') {
        // Covers: technical unavailable, mixed, insufficient_evidence,
        // or a malformed/missing technical section — none of these are
        // a directional call to grade.
        continue;
      }

      if (typeof position.currentPriceUsd !== 'number') {
        this.logger.warn(
          `Entry ${entry.id}: position ${position.symbol} has a '${direction}' call but no currentPriceUsd recorded, skipping this position`,
        );
        continue;
      }

      const currentPrice = await this.fetchCurrentPrice(position.assetType, position.symbol);
      if (currentPrice === null) {
        this.logger.warn(`Entry ${entry.id}: price fetch failed for ${position.symbol}, skipping this position`);
        continue;
      }

      totalDirectionalPositions++;
      const priceAtCreation = position.currentPriceUsd;
      const pctChange = ((currentPrice - priceAtCreation) / priceAtCreation) * 100;

      const callCorrect =
        pctChange === 0 ? false : direction === 'bullish' ? pctChange > 0 : pctChange < 0;

      positionResults.push({
        symbol: position.symbol,
        direction,
        priceAtCreation,
        priceAtResolution: currentPrice,
        pctChange: Math.round(pctChange * 100) / 100,
        callCorrect,
      });
    }

    if (totalDirectionalPositions === 0) {
      // Nothing checkable in this entry — leave it pending rather than
      // inventing an outcome for a portfolio with no directional calls.
      return { resolved: false };
    }

    const correctCount = positionResults.filter((p) => p.callCorrect).length;
    const incorrectCount = positionResults.length - correctCount;

    let outcome: 'correct' | 'incorrect' | 'partial';
    if (incorrectCount === 0) outcome = 'correct';
    else if (correctCount === 0) outcome = 'incorrect';
    else outcome = 'partial';

    await this.ledgerService.resolve(entry.id, entry.userId, {
      outcome,
      actualData: {
        resolvedBy: 'prediction-ledger-resolution.job',
        directionalPositionsEvaluated: positionResults.length,
        totalPositionsInEntry: positions.length,
        correctCount,
        incorrectCount,
        positions: positionResults,
      },
    });

    return { resolved: true, outcome, positionResults };
  }

  private async fetchCurrentPrice(assetType: SupportedAssetType, symbol: string): Promise<number | null> {
    switch (assetType) {
      case 'equity':
        return this.marketData.getEquityPriceUsd(symbol);
      case 'crypto':
        return this.marketData.getCryptoPriceUsd(symbol);
      case 'forex':
        return this.marketData.getForexRate(symbol);
      case 'metal':
        return this.marketData.getMetalPriceUsd(symbol);
      case 'oil':
        return this.marketData.getOilPriceUsd(symbol as 'WTI' | 'BRENT');
      default:
        return null;
    }
  }
}