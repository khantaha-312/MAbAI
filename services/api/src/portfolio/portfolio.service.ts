import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
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

  /**
   * Returns only non-soft-deleted portfolios owned by this user.
   * Ownership is enforced at the query level, not just checked after
   * fetching — a user can never even see another user's portfolio ID exists.
   */
  async findAllForUser(userId: string): Promise<Portfolio[]> {
    return this.prisma.portfolio.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}