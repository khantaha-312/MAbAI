import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prisma: {
    portfolio: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      portfolio: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('creates a portfolio scoped to the given user and org', async () => {
    prisma.portfolio.create.mockResolvedValue({ id: 'p1', name: 'Test' });
    await service.create('user1', 'org1', { name: 'Test' });
    expect(prisma.portfolio.create).toHaveBeenCalledWith({
      data: { name: 'Test', userId: 'user1', orgId: 'org1', createdBy: 'user1' },
    });
  });

  it('only queries non-deleted portfolios for the given user', async () => {
    prisma.portfolio.findMany.mockResolvedValue([]);
    await service.findAllForUser('user1');
    expect(prisma.portfolio.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  describe('update', () => {
    it('throws PORTFOLIO_NOT_FOUND if portfolio does not belong to user', async () => {
      prisma.portfolio.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'someone-else',
        deletedAt: null,
      });

      await expect(
        service.update('p1', 'user1', { name: 'New Name' }),
      ).rejects.toThrow('Portfolio not found');
    });

    it('updates name when portfolio belongs to user', async () => {
      prisma.portfolio.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        deletedAt: null,
      });
      prisma.portfolio.update.mockResolvedValue({ id: 'p1', name: 'New Name' });

      const result = await service.update('p1', 'user1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('softDelete', () => {
    it('throws PORTFOLIO_NOT_FOUND if already deleted', async () => {
      prisma.portfolio.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        deletedAt: new Date(),
      });

      await expect(service.softDelete('p1', 'user1')).rejects.toThrow(
        'Portfolio not found',
      );
    });

    it('sets deletedAt when portfolio belongs to user', async () => {
      prisma.portfolio.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        deletedAt: null,
      });
      prisma.portfolio.update.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date(),
      });

      const result = await service.softDelete('p1', 'user1');
      expect(result.deletedAt).not.toBeNull();
    });
  });
});