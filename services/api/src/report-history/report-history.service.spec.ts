import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportHistoryService } from './report-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';

describe('ReportHistoryService', () => {
  let service: ReportHistoryService;
  let prismaService: PrismaService;
  let evidencePackageService: EvidencePackageService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    reportHistoryEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEvidencePackageService = {
    buildEvidencePackage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportHistoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EvidencePackageService,
          useValue: mockEvidencePackageService,
        },
      ],
    }).compile();

    service = module.get<ReportHistoryService>(ReportHistoryService);
    prismaService = module.get<PrismaService>(PrismaService);
    evidencePackageService = module.get<EvidencePackageService>(EvidencePackageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('attachNarrative', () => {
    it('should attach narrative to entry without existing narrative', async () => {
      const clerkId = 'clerk123';
      const id = 'entry123';
      const narrative = 'Test narrative';
      const mockEntry = {
        id,
        userId: 'user123',
        symbol: 'AAPL',
        assetType: 'equity',
        narrative: null,
        snapshot: {},
        createdAt: new Date(),
      };
      const updatedEntry = {
        ...mockEntry,
        narrative,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findUnique
        .mockResolvedValueOnce(mockEntry)
        .mockResolvedValueOnce(updatedEntry);
      mockPrismaService.reportHistoryEntry.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.attachNarrative(clerkId, id, narrative);

      expect(mockPrismaService.reportHistoryEntry.updateMany).toHaveBeenCalledWith({
        where: { 
          id,
          narrative: null,
        },
        data: { narrative: narrative },
      });
      expect(result.narrative).toBe(narrative);
    });

    it('should NOT overwrite existing narrative and return entry unchanged', async () => {
      const clerkId = 'clerk123';
      const id = 'entry123';
      const existingNarrative = 'Existing narrative';
      const newNarrative = 'New narrative';
      const mockEntry = {
        id,
        userId: 'user123',
        symbol: 'AAPL',
        assetType: 'equity',
        narrative: existingNarrative,
        snapshot: {},
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrismaService.reportHistoryEntry.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.attachNarrative(clerkId, id, newNarrative);

      // Should call updateMany but count should be 0 (no rows updated)
      expect(mockPrismaService.reportHistoryEntry.updateMany).toHaveBeenCalledWith({
        where: { 
          id,
          narrative: null,
        },
        data: { narrative: newNarrative },
      });
      // Should return the existing entry with original narrative
      expect(result.narrative).toBe(existingNarrative);
      expect(result.narrative).not.toBe(newNarrative);
    });

    it('should throw NotFoundException if entry not found', async () => {
      const clerkId = 'clerk123';
      const id = 'nonexistent';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findUnique.mockResolvedValue(null);

      await expect(service.attachNarrative(clerkId, id, 'narrative')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if entry belongs to different user', async () => {
      const clerkId = 'clerk123';
      const id = 'entry123';
      const mockEntry = {
        id,
        userId: 'differentUser',
        symbol: 'AAPL',
        assetType: 'equity',
        narrative: null,
        snapshot: {},
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findUnique.mockResolvedValue(mockEntry);

      await expect(service.attachNarrative(clerkId, id, 'narrative')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listForUser', () => {
    it('should return entries with snapshot and narrative', async () => {
      const clerkId = 'clerk123';
      const mockEntries = [
        {
          id: 'entry1',
          symbol: 'AAPL',
          assetType: 'equity',
          snapshot: { market: { price: 150 } },
          narrative: 'Test narrative',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.listForUser(clerkId);

      expect(mockPrismaService.reportHistoryEntry.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          symbol: true,
          assetType: true,
          snapshot: true,
          narrative: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockEntries);
    });
  });

  describe('getOne', () => {
    it('should return full entry including snapshot and narrative', async () => {
      const clerkId = 'clerk123';
      const id = 'entry123';
      const mockEntry = {
        id,
        userId: 'user123',
        symbol: 'AAPL',
        assetType: 'equity',
        snapshot: { market: { price: 150 } },
        narrative: 'Test narrative',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });
      mockPrismaService.reportHistoryEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await service.getOne(clerkId, id);

      expect(result).toEqual(mockEntry);
      expect(result.snapshot).toBeDefined();
      expect(result.narrative).toBeDefined();
    });
  });
});
