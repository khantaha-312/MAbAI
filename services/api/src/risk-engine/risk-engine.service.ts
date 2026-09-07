import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { RiskFlag } from '@prisma/client';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';


const CONCENTRATION_THRESHOLD = 0.4; // single position > 40% of portfolio value
const LARGE_LOSS_THRESHOLD = -0.2; // position down 20%+ from cost basis

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    private readonly technicalAnalysisService: TechnicalAnalysisService,
  ) {}

  /**
   * Evaluates all non-deleted positions in a portfolio against current
   * market prices, generates RiskFlag rows for any triggered conditions,
   * and returns the newly created flags. This does NOT clear old flags —
   * that's a deliberate simplification for MVP; a real implementation
   * would need a strategy for flag lifecycle (expire, re-evaluate, etc.)
   * which is out of scope here.
   */
  async evaluatePortfolio(
    portfolioId: string,
    userId: string,
  ): Promise<RiskFlag[]> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        positions: {
          where: { deletedAt: null },
          include: { instrument: true },
        },
      },
    });

    if (!portfolio || portfolio.deletedAt !== null || portfolio.userId !== userId) {
      throw new AppException(
        ErrorCode.PORTFOLIO_NOT_FOUND,
        'Portfolio not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Fetch live prices for every position first, so we can compute
    // total portfolio value before evaluating concentration risk.
    const positionsWithPrices = await Promise.all(
      portfolio.positions.map(async (position) => {
        let currentPriceUsd: number | null = null;

        if (position.instrument.assetType === 'equity') {
          currentPriceUsd = await this.marketDataService.getEquityPriceUsd(
            position.instrument.symbol,
          );
        } else if (position.instrument.assetType === 'crypto') {
          const coinGeckoIdMap: Record<string, string> = { BTC: 'bitcoin' };
          const coinId = coinGeckoIdMap[position.instrument.symbol];
          if (coinId) {
            currentPriceUsd = await this.marketDataService.getCryptoPriceUsd(coinId);
          }
        }

        return { ...position, currentPriceUsd };
      }),
    );

    const positionValues = positionsWithPrices.map((p) => ({
      ...p,
      value:
        p.currentPriceUsd !== null
          ? Number(p.quantity) * p.currentPriceUsd
          : null,
    }));

    const totalValue = positionValues.reduce(
      (sum, p) => sum + (p.value ?? 0),
      0,
    );

    const newFlags: RiskFlag[] = [];

    for (const position of positionValues) {
      if (position.value === null || position.currentPriceUsd === null) {
        this.logger.warn(
          `Skipping risk evaluation for position ${position.id} — no live price available`,
        );
        continue;
      }

      // Rule 1: concentration risk
      if (totalValue > 0 && position.value / totalValue > CONCENTRATION_THRESHOLD) {
        const flag = await this.prisma.riskFlag.create({
          data: {
            positionId: position.id,
            instrumentId: position.instrumentId,
            flagType: 'CONCENTRATION_RISK',
            severity: 'MEDIUM',
          },
        });
        newFlags.push(flag);
      }

      // Rule 2: large unrealized loss
      const costBasis = Number(position.avgCostBasis);
      if (costBasis > 0) {
        const changeRatio = (position.currentPriceUsd - costBasis) / costBasis;
        if (changeRatio <= LARGE_LOSS_THRESHOLD) {
          const flag = await this.prisma.riskFlag.create({
            data: {
              positionId: position.id,
              instrumentId: position.instrumentId,
              flagType: 'LARGE_UNREALIZED_LOSS',
              severity: 'HIGH',
            },
          });
          newFlags.push(flag);
        }
      }
    }

    return newFlags;
  }
  /**
   * Read-only risk analysis, complementary to evaluatePortfolio (which
   * writes RiskFlag rows). This does NOT write anything — it's a computed
   * snapshot for display, not a persisted flag. Deliberately duplicates
   * the price-fetch loop above rather than refactoring the verified
   * evaluatePortfolio method to share it.
   */
  async getRiskAnalysis(portfolioId: string, userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        positions: {
          where: { deletedAt: null },
          include: { instrument: true },
        },  
      },
    });

    if (!portfolio || portfolio.deletedAt !== null || portfolio.userId !== userId) {
      throw new AppException(ErrorCode.PORTFOLIO_NOT_FOUND, 'Portfolio not found', HttpStatus.NOT_FOUND);
    }

    const positionsWithPrices = await Promise.all(
      portfolio.positions.map(async (position) => {
        let currentPriceUsd: number | null = null;
        if (position.instrument.assetType === 'equity') {
          currentPriceUsd = await this.marketDataService.getEquityPriceUsd(position.instrument.symbol);
        } else if (position.instrument.assetType === 'crypto') {
          const coinGeckoIdMap: Record<string, string> = { BTC: 'bitcoin' };
          const coinId = coinGeckoIdMap[position.instrument.symbol];
          if (coinId) {
            currentPriceUsd = await this.marketDataService.getCryptoPriceUsd(coinId);
          }
        }
        return { ...position, currentPriceUsd };
      }),
    );

    const positionValues = positionsWithPrices
      .filter((p) => p.currentPriceUsd !== null)
      .map((p) => ({
        ...p,
        value: Number(p.quantity) * (p.currentPriceUsd as number),
      }));

    const totalValue = positionValues.reduce((sum, p) => sum + p.value, 0);

    if (totalValue === 0 || positionValues.length === 0) {
      return {
        available: false,
        reason: 'No positions with live price data available for risk analysis',
        exposureByAssetClass: [],
        volatility: { available: false, reason: 'No priced positions', contributions: [] },
        drawdown: { available: false, reason: 'Historical portfolio value tracking not yet implemented', source: null },
        correlation: { available: false, reason: 'Insufficient multi-symbol historical data for correlation analysis', source: null },
        severity: { level: 'insufficient_data', evidenceCount: 0 },
      };
    }

    // --- Exposure by asset class ---
    const exposureMap = new Map<string, number>();
    for (const p of positionValues) {
      exposureMap.set(
        p.instrument.assetType,
        (exposureMap.get(p.instrument.assetType) ?? 0) + p.value,
      );
    }
    const exposureByAssetClass = Array.from(exposureMap.entries()).map(([assetType, value]) => ({
      assetType,
      value,
      percentOfPortfolio: Math.round((value / totalValue) * 1000) / 10,
    }));

    // --- Volatility contribution, using real ATR per position ---
    const volatilityContributions = await Promise.all(
      positionValues.map(async (p) => {
        const atrResult = await this.technicalAnalysisService.getAtr(p.instrument.symbol, p.instrument.assetType);
        const weight = p.value / totalValue;
        return {
          symbol: p.instrument.symbol,
          atr: atrResult.atr,
          weight: Math.round(weight * 1000) / 10,
          // Volatility contribution = position weight × ATR (as % of price) — a
          // simple, honest proxy: a large, volatile position contributes more
          // to portfolio-level volatility than a small or stable one.
          contribution:
            atrResult.atr !== null && p.currentPriceUsd
              ? Math.round(weight * (atrResult.atr / p.currentPriceUsd) * 10000) / 100
              : null,
        };
      }),
    );
    const hasVolatilityData = volatilityContributions.some((v) => v.contribution !== null);

    // --- Severity synthesis, same evidence-floor pattern as Trend/Fundamental ---
    const concentrationFlags = exposureByAssetClass.filter((e) => e.percentOfPortfolio > 40).length;
    const highVolatilityPositions = volatilityContributions.filter(
      (v) => v.contribution !== null && v.contribution > 5,
    ).length;

    let evidenceCount = 0;
    let riskPoints = 0;
    if (exposureByAssetClass.length > 0) {
      evidenceCount++;
      if (concentrationFlags > 0) riskPoints++;
    }
    if (hasVolatilityData) {
      evidenceCount++;
      if (highVolatilityPositions > 0) riskPoints++;
    }

    let severityLevel: string;
    if (evidenceCount < 1) {
      severityLevel = 'insufficient_data';
    } else {
      const ratio = riskPoints / evidenceCount;
      if (ratio >= 0.7) severityLevel = 'elevated';
      else if (ratio >= 0.3) severityLevel = 'moderate';
      else severityLevel = 'low';
    }

    return {
      available: true,
      exposureByAssetClass,
      volatility: {
        available: hasVolatilityData,
        reason: hasVolatilityData ? undefined : 'No ATR data available for held positions',
        contributions: volatilityContributions,
      },
      drawdown: {
        available: false,
        reason: 'Historical portfolio value tracking not yet implemented',
        source: null,
      },
      correlation: {
        available: false,
        reason: 'Insufficient multi-symbol historical data for correlation analysis',
        source: null,
      },
      severity: { level: severityLevel, evidenceCount },
    };
  }

  async findFlagsForPortfolio(
    portfolioId: string,
    userId: string,
  ): Promise<RiskFlag[]> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.deletedAt !== null || portfolio.userId !== userId) {
      throw new AppException(
        ErrorCode.PORTFOLIO_NOT_FOUND,
        'Portfolio not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.riskFlag.findMany({
      where: { position: { portfolioId } },
      include: { instrument: true, position: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}