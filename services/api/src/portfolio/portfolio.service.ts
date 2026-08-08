import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import { MarketDataService } from '../market-data/market-data.service';
import type { Portfolio } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async create(
    userId: string,
    orgId: string,
    dto: CreatePortfolioDto,
  ): Promise<Portfolio> {
    return this.prisma.portfolio.create({
      data: {
        name: dto.name,
        userId,
        orgId,
        createdBy: userId,
      },
    });
  }

  async findAllForUser(userId: string): Promise<Portfolio[]> {
    return this.prisma.portfolio.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<Portfolio> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
    });

    if (!portfolio || portfolio.deletedAt !== null || portfolio.userId !== userId) {
      throw new AppException(
        ErrorCode.PORTFOLIO_NOT_FOUND,
        'Portfolio not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return portfolio;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePortfolioDto,
  ): Promise<Portfolio> {
    await this.findOwnedOrThrow(id, userId);

    return this.prisma.portfolio.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        updatedBy: userId,
      },
    });
  }

  /**
   * Returns a single portfolio with its non-deleted positions, each
   * position's instrument details, and a best-effort live currentPriceUsd
   * per position. A failed price lookup does NOT fail the whole summary —
   * currentPriceUsd is simply null in that case.
   */
  async getSummary(id: string, userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
      include: {
        positions: {
          where: { deletedAt: null },
          include: { instrument: true },
          orderBy: { createdAt: 'desc' },
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

    const positionsWithPrices = await Promise.all(
      portfolio.positions.map(async (position) => {
        let currentPriceUsd: number | null = null;

        if (position.instrument.assetType === 'equity') {
          currentPriceUsd = await this.marketDataService.getEquityPriceUsd(
            position.instrument.symbol,
          );
        } else if (position.instrument.assetType === 'crypto') {
          // TEMPORARY hardcoded symbol->CoinGecko-id map, covers only our
          // seeded instruments. Real fix: use SymbolMapping table (Phase 6
          // follow-up), not this shortcut.
          const coinGeckoIdMap: Record<string, string> = { BTC: 'bitcoin' };
          const coinId = coinGeckoIdMap[position.instrument.symbol];
          if (coinId) {
            currentPriceUsd = await this.marketDataService.getCryptoPriceUsd(coinId);
          }
        }

        return { ...position, currentPriceUsd };
      }),
    );

    return { ...portfolio, positions: positionsWithPrices };
  }

  async softDelete(id: string, userId: string): Promise<Portfolio> {
    await this.findOwnedOrThrow(id, userId);

    return this.prisma.portfolio.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }
}