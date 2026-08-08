import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { Portfolio } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Fetches a single portfolio and verifies ownership. Throws NOT_FOUND
   * (not FORBIDDEN) if the portfolio belongs to someone else — this
   * deliberately avoids confirming to a caller that a given ID exists
   * at all if they don't own it.
   */
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
   * Returns a single portfolio with its non-deleted positions and each
   * position's instrument details nested in. This is a read-only
   * aggregation — no live pricing, no calculated P&L (that's Phase 6/7).
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

    return portfolio;
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