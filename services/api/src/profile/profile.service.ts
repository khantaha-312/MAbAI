import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PersonaEmbeddingService } from './persona-embedding.service';
import { deriveExpertiseTier } from './expertise-tier.calculator';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly personaEmbeddingService: PersonaEmbeddingService,
  ) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  async create(clerkId: string, dto: CreateProfileDto) {
    const userId = await this.resolveUserId(clerkId);
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Profile already exists — use PUT /profile to update it');
    }

    const tierResult = deriveExpertiseTier({
      tradingType: dto.tradingType,
      tradingStyle: dto.tradingStyle,
      assetClasses: dto.assetClasses,
      investmentPlan: dto.investmentPlan ?? [],
      maxLeverageTolerance: dto.maxLeverageTolerance ?? null,
      typicalPositionSizePct: dto.typicalPositionSizePct ?? null,
    });

    const profile = await this.prisma.userProfile.create({
      data: {
        userId,
        tradingType: dto.tradingType,
        tradingStyle: dto.tradingStyle,
        assetClasses: dto.assetClasses,
        investmentPlan: dto.investmentPlan ?? [],
        selectedSymbols: dto.selectedSymbols ?? [],
        onboardingDetails: dto.onboardingDetails,
        riskAppetite: dto.riskAppetite,
        maxLeverageTolerance: dto.maxLeverageTolerance,
        typicalPositionSizePct: dto.typicalPositionSizePct,
        expertiseTier: tierResult.tier === 'insufficient_evidence' ? null : tierResult.tier,
        onboardingCompleted: true,
      },
    });

    this.personaEmbeddingService.refreshPersonaEmbedding(userId, profile).catch((err) => {
      this.logger.error(`Background persona embedding refresh failed for user ${userId}: ${err}`);
    });

    return profile;
  }

  async getByClerkId(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found — complete onboarding first');
    }
    return profile;
  }

  async update(clerkId: string, dto: UpdateProfileDto) {
    const userId = await this.resolveUserId(clerkId);
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException('Profile not found — complete onboarding first');
    }

    const merged = { ...existing, ...dto };
    const tierResult = deriveExpertiseTier({
      tradingType: merged.tradingType,
      tradingStyle: merged.tradingStyle,
      assetClasses: merged.assetClasses,
      investmentPlan: merged.investmentPlan,
      maxLeverageTolerance: merged.maxLeverageTolerance ?? null,
      typicalPositionSizePct: merged.typicalPositionSizePct ?? null,
    });

    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...dto,
        expertiseTier: tierResult.tier === 'insufficient_evidence' ? null : tierResult.tier,
      },
    });

    this.personaEmbeddingService.refreshPersonaEmbedding(userId, profile).catch((err) => {
      this.logger.error(`Background persona embedding refresh failed for user ${userId}: ${err}`);
    });

    return profile;
  }
}