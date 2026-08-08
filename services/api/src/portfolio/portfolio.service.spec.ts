import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prisma: { portfolio: { create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      portfolio: {
        create: jest.fn(),
        findMany: jest.fn(),
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
});