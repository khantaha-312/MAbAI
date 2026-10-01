import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportHistoryService {
  private readonly logger = new Logger(ReportHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evidencePackageService: EvidencePackageService,
  ) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async generate(clerkId: string, dto: GenerateReportDto) {
    const userId = await this.resolveUserId(clerkId);
    const snapshot = await this.evidencePackageService.buildEvidencePackage(dto.symbol, dto.assetType);

    const reportEntry = await this.prisma.reportHistoryEntry.create({
      data: {
        userId,
        symbol: dto.symbol,
        assetType: dto.assetType,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        tradingType: dto.tradingType,
        tradingStyle: dto.tradingStyle,
        riskAppetite: dto.riskAppetite,
        investmentPlan: dto.investmentPlan ?? [],
      },
    });

    // Create Prediction Ledger entry for single-symbol reports
    // Extract trend direction and reference price from the snapshot
    const technical = snapshot.technical?.available ? snapshot.technical.data : null;
    const market = snapshot.market?.available ? snapshot.market.data : null;

    if (technical && market) {
      // Safely extract trend direction with type guard
      const trendData = technical as any;
      const trendDirection = trendData?.trend?.trend?.direction as 'bullish' | 'bearish' | undefined;
      const referencePrice = market.price;

      // Only create ledger entry if we have a clear directional prediction
      if (trendDirection === 'bullish' || trendDirection === 'bearish') {
        try {
          // Prevent duplicate ledger entries for the same report
          const existingEntry = await this.prisma.ledgerEntry.findFirst({
            where: {
              userId,
              inputSnapshot: {
                path: ['reportHistoryId'],
                equals: reportEntry.id,
              },
            },
          });

          if (existingEntry) {
            this.logger.log(`Ledger entry already exists for report ${reportEntry.id}, skipping creation`);
          } else {
            // Create ledger entry directly via Prisma to avoid circular dependency
            await this.prisma.ledgerEntry.create({
              data: {
                userId,
                inputSnapshot: {
                  reportHistoryId: reportEntry.id,
                  symbol: dto.symbol,
                  assetType: dto.assetType,
                  trendDirection,
                  referencePrice,
                  createdAt: reportEntry.createdAt,
                  barsUsed: technical.barsUsed,
                } as Prisma.InputJsonValue,
                generatedOutput: {
                  trendDirection,
                  referencePrice,
                  technicalIndicators: {
                    rsi: technical.rsi?.rsi,
                    macd: technical.macd?.macd,
                    sma: technical.sma?.sma,
                  },
                } as Prisma.InputJsonValue,
                modelProvider: 'technical-analysis',
                modelName: `trend-indicator-${technical.barsUsed}bars`,
                status: 'pending',
              },
            });
            this.logger.log(`Created prediction ledger entry for ${dto.symbol} (${trendDirection})`);
          }
        } catch (error) {
          this.logger.error(`Failed to create prediction ledger entry for ${dto.symbol}: ${error}`);
          // Don't fail the report creation if ledger creation fails
        }
      }
    }

    return reportEntry;
  }

  async listForUser(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.reportHistoryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, symbol: true, assetType: true, snapshot: true, narrative: true, createdAt: true },
    });
  }

  async getOne(clerkId: string, id: string) {
    const userId = await this.resolveUserId(clerkId);
    const entry = await this.prisma.reportHistoryEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) throw new NotFoundException('Report not found');
    // Return the full entry including snapshot and narrative
    return entry;
  }

  async attachNarrative(clerkId: string, id: string, narrative: string) {
    const userId = await this.resolveUserId(clerkId);
    const entry = await this.prisma.reportHistoryEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) throw new NotFoundException('Report not found');
    
    // Guard: prevent overwriting an existing narrative with atomic check
    const result = await this.prisma.reportHistoryEntry.updateMany({
      where: { 
        id,
        narrative: null, // Only update if narrative is currently null
      },
      data: { narrative },
    });
    
    // If no rows were updated, narrative already exists - re-fetch current entry
    if (result.count === 0) {
      return this.prisma.reportHistoryEntry.findUnique({ where: { id } });
    }
    
    // Return the updated entry
    return this.prisma.reportHistoryEntry.findUnique({ where: { id } });
  }
}