import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportHistoryService } from './report-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';
import { GenerateReportDto } from './dto/generate-report.dto';

describe('ReportHistoryService - Prediction Ledger Integration', () => {
  let service: ReportHistoryService;
  let prisma: PrismaService;
  let evidencePackageService: EvidencePackageService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    reportHistoryEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
      findFirst: jest.fn(),
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
          useValue: mockPrisma,
        },
        {
          provide: EvidencePackageService,
          useValue: mockEvidencePackageService,
        },
      ],
    }).compile();

    service = module.get<ReportHistoryService>(ReportHistoryService);
    prisma = module.get<PrismaService>(PrismaService);
    evidencePackageService = module.get<EvidencePackageService>(EvidencePackageService);

    jest.clearAllMocks();
  });

  describe('Prediction Ledger Entry Creation', () => {
    const mockUserId = 'user-1';
    const mockReportEntry = {
      id: 'report-1',
      userId: mockUserId,
      symbol: 'AAPL',
      assetType: 'equity',
      createdAt: new Date('2024-01-01'),
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrisma.reportHistoryEntry.create.mockResolvedValue(mockReportEntry);
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
    });

    it('creates ledger entry for bullish trend', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: 'bullish',
                strength: 0.8,
                signals: ['price_above_sma_50'],
                evidenceCount: 3,
              },
            },
            barsUsed: 100,
            rsi: { rsi: 65 },
            macd: { macd: { line: 2.5, signal: 2.0, histogram: 0.5 } },
            sma: { sma: { 50: 150, 200: 140 } },
          },
        },
        market: {
          available: true,
          data: {
            price: 155.5,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);
      mockPrisma.ledgerEntry.create.mockResolvedValue({ id: 'ledger-1' });

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          inputSnapshot: {
            reportHistoryId: mockReportEntry.id,
            symbol: 'AAPL',
            assetType: 'equity',
            trendDirection: 'bullish',
            referencePrice: 155.5,
            createdAt: mockReportEntry.createdAt,
            barsUsed: 100,
          },
          generatedOutput: {
            trendDirection: 'bullish',
            referencePrice: 155.5,
            technicalIndicators: {
              rsi: 65,
              macd: { line: 2.5, signal: 2.0, histogram: 0.5 },
              sma: { 50: 150, 200: 140 },
            },
          },
          modelProvider: 'technical-analysis',
          modelName: 'trend-indicator-100bars',
          status: 'pending',
        },
      });
    });

    it('creates ledger entry for bearish trend', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: 'bearish',
                strength: 0.7,
                signals: ['price_below_sma_50'],
                evidenceCount: 3,
              },
            },
            barsUsed: 100,
            rsi: { rsi: 35 },
            macd: { macd: { line: -2.5, signal: -2.0, histogram: -0.5 } },
            sma: { sma: { 50: 150, 200: 140 } },
          },
        },
        market: {
          available: true,
          data: {
            price: 145.5,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);
      mockPrisma.ledgerEntry.create.mockResolvedValue({ id: 'ledger-1' });

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputSnapshot: expect.objectContaining({
            trendDirection: 'bearish',
            referencePrice: 145.5,
          }),
          generatedOutput: expect.objectContaining({
            trendDirection: 'bearish',
          }),
          status: 'pending',
        }),
      });
    });

    it('does not create ledger entry for neutral/insufficient_evidence trend', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: 'insufficient_evidence',
                strength: null,
                signals: [],
                evidenceCount: 0,
                reason: 'Not enough data',
              },
            },
            barsUsed: 10,
          },
        },
        market: {
          available: true,
          data: {
            price: 150.0,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('does not create ledger entry when trend direction is undefined', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: undefined,
                strength: null,
                signals: [],
                evidenceCount: 0,
              },
            },
            barsUsed: 100,
          },
        },
        market: {
          available: true,
          data: {
            price: 150.0,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('prevents duplicate ledger entry creation for same report', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: 'bullish',
                strength: 0.8,
                signals: ['price_above_sma_50'],
                evidenceCount: 3,
              },
            },
            barsUsed: 100,
          },
        },
        market: {
          available: true,
          data: {
            price: 155.5,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue({ id: 'existing-ledger-1' });

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          inputSnapshot: {
            path: ['reportHistoryId'],
            equals: mockReportEntry.id,
          },
        },
      });
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('does not create ledger entry when technical data is unavailable', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: false,
          data: null,
        },
        market: {
          available: true,
          data: {
            price: 150.0,
            assetType: 'equity',
          },
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('does not create ledger entry when market data is unavailable', async () => {
      const dto: GenerateReportDto = {
        symbol: 'AAPL',
        assetType: 'equity',
        tradingType: ['day'],
        tradingStyle: ['momentum'],
      };

      const mockSnapshot = {
        technical: {
          available: true,
          data: {
            trend: {
              trend: {
                direction: 'bullish',
                strength: 0.8,
                signals: ['price_above_sma_50'],
                evidenceCount: 3,
              },
            },
            barsUsed: 100,
          },
        },
        market: {
          available: false,
          data: null,
        },
      };

      mockEvidencePackageService.buildEvidencePackage.mockResolvedValue(mockSnapshot);

      await service.generate('clerk-1', dto);

      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });
  });
});
