import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { Position } from '@prisma/client';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPortfolioOwnership(
    portfolioId: string,
    userId: string,
  ): Promise<void> {
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
  }

  async create(
    portfolioId: string,
    userId: string,
    dto: CreatePositionDto,
  ): Promise<Position> {
    await this.assertPortfolioOwnership(portfolioId, userId);

    const instrument = await this.prisma.instrument.findUnique({
      where: { id: dto.instrumentId },
    });
    if (!instrument) {
      throw new AppException(
        ErrorCode.INSTRUMENT_NOT_FOUND,
        'Instrument not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.position.create({
      data: {
        portfolioId,
        instrumentId: dto.instrumentId,
        quantity: dto.quantity,
        avgCostBasis: dto.avgCostBasis,
        createdBy: userId,
      },
    });
  }

  async findAllForPortfolio(
    portfolioId: string,
    userId: string,
  ): Promise<Position[]> {
    await this.assertPortfolioOwnership(portfolioId, userId);

    return this.prisma.position.findMany({
      where: { portfolioId, deletedAt: null },
      include: { instrument: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwnedPositionOrThrow(
    positionId: string,
    portfolioId: string,
    userId: string,
  ): Promise<Position> {
    await this.assertPortfolioOwnership(portfolioId, userId);

    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
    });

    if (
      !position ||
      position.deletedAt !== null ||
      position.portfolioId !== portfolioId
    ) {
      throw new AppException(
        ErrorCode.POSITION_NOT_FOUND,
        'Position not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return position;
  }

  async update(
    positionId: string,
    portfolioId: string,
    userId: string,
    dto: UpdatePositionDto,
  ): Promise<Position> {
    await this.findOwnedPositionOrThrow(positionId, portfolioId, userId);

    return this.prisma.position.update({
      where: { id: positionId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.avgCostBasis !== undefined && { avgCostBasis: dto.avgCostBasis }),
        updatedBy: userId,
      },
    });
  }

  async softDelete(
    positionId: string,
    portfolioId: string,
    userId: string,
  ): Promise<Position> {
    await this.findOwnedPositionOrThrow(positionId, portfolioId, userId);

    return this.prisma.position.update({
      where: { id: positionId },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  }
}