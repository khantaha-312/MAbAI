import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { RiskFlag } from '@prisma/client';

const CONCENTRATION_THRESHOLD = 0.4; // single position > 40% of portfolio value
const LARGE_LOSS_THRESHOLD = -0.2; // position down 20%+ from cost basis

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
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