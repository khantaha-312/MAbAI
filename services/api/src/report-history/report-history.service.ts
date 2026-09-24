import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportHistoryService {
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

    return this.prisma.reportHistoryEntry.create({
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