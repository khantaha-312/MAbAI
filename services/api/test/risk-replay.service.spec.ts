import { Test, TestingModule } from '@nestjs/testing';
import { RiskReplayService } from './risk-replay.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RiskReplayService', () => {
  let service: RiskReplayService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { ledgerEntry: { findUnique: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskReplayService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<RiskReplayService>(RiskReplayService);
  });

  it('throws not found when entry does not exist', async () => {
    prisma.ledgerEntry.findUnique.mockResolvedValue(null);
    await expect(service.getReplay('missing-id', 'user-1')).rejects.toThrow();
  });

  it('throws not found (not a permissions error) when entry belongs to a different user', async () => {
    prisma.ledgerEntry.findUnique.mockResolvedValue({ id: 'x', userId: 'someone-else' });
    await expect(service.getReplay('x', 'user-1')).rejects.toThrow();
  });

  it('returns resolved:false when resolvedAt is null', async () => {
    prisma.ledgerEntry.findUnique.mockResolvedValue({
      id: 'x',
      userId: 'user-1',
      createdAt: new Date('2026-01-01'),
      inputSnapshot: { a: 1 },
      generatedOutput: { b: 2 },
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet-4-6',
      status: 'pending',
      outcome: null,
      actualData: null,
      resolvedAt: null,
    });

    const result = await service.getReplay('x', 'user-1');
    expect(result.resolution.resolved).toBe(false);
    expect(result.resolution.outcome).toBeNull();
  });

  it('returns real resolution data when a resolved entry exists', async () => {
    const resolvedDate = new Date('2026-02-01');
    prisma.ledgerEntry.findUnique.mockResolvedValue({
      id: 'x',
      userId: 'user-1',
      createdAt: new Date('2026-01-01'),
      inputSnapshot: { a: 1 },
      generatedOutput: { b: 2 },
      modelProvider: 'google',
      modelName: 'gemini-3.5-flash',
      status: 'resolved',
      outcome: { correct: true },
      actualData: { price: 220 },
      resolvedAt: resolvedDate,
    });

    const result = await service.getReplay('x', 'user-1');
    expect(result.resolution.resolved).toBe(true);
    expect(result.resolution.resolvedAt).toBe(resolvedDate.toISOString());
    expect(result.resolution.outcome).toEqual({ correct: true });
  });
});