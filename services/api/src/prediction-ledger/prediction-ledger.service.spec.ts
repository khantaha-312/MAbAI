import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PredictionLedgerService } from './prediction-ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';

describe('PredictionLedgerService', () => {
  let service: PredictionLedgerService;

  const mockPrismaService = {
    ledgerEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionLedgerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(PredictionLedgerService);
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    const id = 'entry-1';
    const userId = 'user-1';
    const dto = {
      outcome: 'correct' as const,
      actualData: { resolvedBy: 'test' },
    };

    it('updates only when status is pending', async () => {
      const pendingEntry = {
        id,
        userId,
        status: 'pending',
        outcome: null,
        inputSnapshot: {},
        generatedOutput: {},
        modelProvider: 'test',
        modelName: 'test',
        actualData: null,
        resolvedAt: null,
        createdAt: new Date(),
      };
      const resolvedEntry = {
        ...pendingEntry,
        status: 'resolved',
        outcome: dto.outcome,
        actualData: dto.actualData,
        resolvedAt: new Date(),
      };

      mockPrismaService.ledgerEntry.findUnique.mockResolvedValueOnce(pendingEntry);
      mockPrismaService.ledgerEntry.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.ledgerEntry.findUniqueOrThrow.mockResolvedValue(resolvedEntry);

      const result = await service.resolve(id, userId, dto);

      expect(mockPrismaService.ledgerEntry.updateMany).toHaveBeenCalledWith({
        where: { id, status: 'pending' },
        data: expect.objectContaining({
          status: 'resolved',
          outcome: dto.outcome,
          actualData: dto.actualData,
        }),
      });
      expect(result).toEqual(resolvedEntry);
    });

    it('does not overwrite an already-resolved entry', async () => {
      const existingOutcome = 'incorrect';
      const resolvedEntry = {
        id,
        userId,
        status: 'resolved',
        outcome: existingOutcome,
        inputSnapshot: {},
        generatedOutput: {},
        modelProvider: 'test',
        modelName: 'test',
        actualData: { resolvedBy: 'first-resolver' },
        resolvedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.ledgerEntry.findUnique.mockResolvedValueOnce(resolvedEntry);
      mockPrismaService.ledgerEntry.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.ledgerEntry.findUniqueOrThrow.mockResolvedValue(resolvedEntry);

      const result = await service.resolve(id, userId, {
        outcome: 'correct',
        actualData: { resolvedBy: 'second-resolver' },
      });

      expect(mockPrismaService.ledgerEntry.updateMany).toHaveBeenCalledWith({
        where: { id, status: 'pending' },
        data: expect.any(Object),
      });
      expect(result.outcome).toBe(existingOutcome);
      expect(result.outcome).not.toBe('correct');
    });

    it('returns current state when concurrent resolution wins the race', async () => {
      const pendingEntry = {
        id,
        userId,
        status: 'pending',
        outcome: null,
        inputSnapshot: {},
        generatedOutput: {},
        modelProvider: 'test',
        modelName: 'test',
        actualData: null,
        resolvedAt: null,
        createdAt: new Date(),
      };
      const concurrentlyResolved = {
        ...pendingEntry,
        status: 'resolved',
        outcome: 'partial',
        actualData: { resolvedBy: 'other-worker' },
        resolvedAt: new Date(),
      };

      mockPrismaService.ledgerEntry.findUnique.mockResolvedValueOnce(pendingEntry);
      mockPrismaService.ledgerEntry.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.ledgerEntry.findUniqueOrThrow.mockResolvedValue(concurrentlyResolved);

      const result = await service.resolve(id, userId, dto);

      expect(result).toEqual(concurrentlyResolved);
      expect(result.outcome).toBe('partial');
    });

    it('throws when entry is not found or not owned', async () => {
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(null);

      await expect(service.resolve(id, userId, dto)).rejects.toThrow(AppException);
      await expect(service.resolve(id, userId, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.LEDGER_ENTRY_NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
      expect(mockPrismaService.ledgerEntry.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('create (internal caller support)', () => {
    it('still creates pending entries for AiOrchestrationService', async () => {
      const dto = {
        inputSnapshot: { positions: [] },
        generatedOutput: { narrative: 'test' },
        modelProvider: 'anthropic',
        modelName: 'claude',
      };
      const created = { id: 'entry-new', userId: 'user-1', status: 'pending', ...dto };

      mockPrismaService.ledgerEntry.create.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(mockPrismaService.ledgerEntry.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          inputSnapshot: dto.inputSnapshot,
          generatedOutput: dto.generatedOutput,
          modelProvider: dto.modelProvider,
          modelName: dto.modelName,
          status: 'pending',
        },
      });
      expect(result).toEqual(created);
    });
  });
});
